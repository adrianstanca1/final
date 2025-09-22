import express from 'express';
import cors from 'cors';
import { initialiseSchema, getDatabase } from './database.js';
import { z } from 'zod';
import { v4 as uuid } from 'uuid';

export const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const PORT = process.env.PORT || 4000;

const paymentMethods = Object.freeze(['BANK_TRANSFER', 'CREDIT_CARD', 'CASH', 'CHECK']);
const invoiceStatuses = Object.freeze(['DRAFT', 'SENT', 'OVERDUE', 'PAID', 'CANCELLED']);

const createErrorPayload = (message, extra = {}) => ({
  error: message,
  message,
  timestamp: new Date().toISOString(),
  ...extra,
});

const isoDateSchema = z.string().refine((value) => {
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp);
}, 'Invalid date value');

const clientSchema = z.object({
  name: z.string().min(1),
  contactPerson: z.string().optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  billingAddress: z.string().optional(),
  paymentTerms: z.string().optional(),
  isActive: z.boolean().optional(),
  address: z
    .object({
      street: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      zipCode: z.string().optional(),
      country: z.string().optional(),
    })
    .optional(),
});

const invoiceLineItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().positive(),
  unitPrice: z.number().min(0),
});

const invoiceSchema = z.object({
  clientId: z.string().min(1),
  projectId: z.string().min(1),
  issuedAt: isoDateSchema,
  dueAt: isoDateSchema,
  status: z.enum(invoiceStatuses),
  notes: z.string().optional(),
  taxRate: z.number().min(0),
  retentionRate: z.number().min(0),
  lineItems: z.array(invoiceLineItemSchema).min(1),
});

const invoiceUpdateSchema = invoiceSchema.partial().extend({
  status: z.enum(invoiceStatuses).optional(),
  lineItems: z.array(invoiceLineItemSchema).min(1).optional(),
});

const paymentSchema = z.object({
  amount: z.number().positive(),
  method: z.enum(paymentMethods),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

const ensureInvoiceDatesValid = (issuedAt, dueAt) => {
  if (!issuedAt || !dueAt) {
    return true;
  }
  const issued = new Date(issuedAt).getTime();
  const due = new Date(dueAt).getTime();
  if (!Number.isFinite(issued) || !Number.isFinite(due)) {
    return false;
  }
  return due >= issued;
};

const mapClientRow = (row) => ({
  id: row.id,
  name: row.name,
  email: row.email ?? '',
  phone: row.phone ?? '',
  contactPerson: row.contact_person ?? '',
  contactEmail: row.contact_email ?? row.email ?? '',
  contactPhone: row.contact_phone ?? row.phone ?? '',
  billingAddress: row.billing_address ?? '',
  paymentTerms: row.payment_terms ?? 'Net 30',
  companyId: row.company_id,
  isActive: Boolean(row.is_active),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  address: {
    street: row.street ?? '',
    city: row.city ?? '',
    state: row.state ?? '',
    zipCode: row.zip_code ?? '',
    country: row.country ?? '',
  },
});

const mapProjectRow = (row) => ({
  id: row.id,
  name: row.name,
  description: row.description ?? '',
  status: row.status ?? 'PLANNING',
  budget: Number(row.budget ?? 0),
  spent: Number(row.spent ?? 0),
  actualCost: Number(row.actual_cost ?? 0),
  startDate: row.start_date ?? '',
  endDate: row.end_date ?? '',
  location: {
    address: row.address ?? '',
    lat: Number(row.lat ?? 0),
    lng: Number(row.lng ?? 0),
  },
  clientId: row.client_id ?? '',
  managerId: row.manager_id ?? '',
  image: undefined,
  progress: Number(row.progress ?? 0),
  companyId: row.company_id,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  projectType: row.project_type ?? 'General',
  workClassification: row.work_classification ?? 'General',
});

const mapInvoiceRow = async (db, row) => {
  const lineItems = await db.all(
    'SELECT id, description, quantity, unit_price as unitPrice, amount, created_at, updated_at FROM invoice_line_items WHERE invoice_id = ? ORDER BY created_at ASC',
    row.id,
  );

  const payments = await db.all(
    'SELECT id, amount, method, reference, notes, created_by as createdBy, created_at as createdAt FROM invoice_payments WHERE invoice_id = ? ORDER BY created_at ASC',
    row.id,
  );

  return {
    id: row.id,
    invoiceNumber: row.invoice_number,
    projectId: row.project_id ?? '',
    clientId: row.client_id,
    issueDate: row.issue_date ?? row.created_at,
    issuedAt: row.issue_date ?? row.created_at,
    dueDate: row.due_date ?? row.created_at,
    dueAt: row.due_date ?? row.created_at,
    status: row.status,
    lineItems: lineItems.map((item) => ({
      id: item.id,
      description: item.description,
      quantity: Number(item.quantity),
      rate: Number(item.unitPrice),
      unitPrice: Number(item.unitPrice),
      amount: Number(item.amount),
    })),
    subtotal: Number(row.subtotal ?? 0),
    taxRate: Number(row.tax_rate ?? 0),
    taxAmount: Number(row.tax_amount ?? 0),
    retentionRate: Number(row.retention_rate ?? 0),
    retentionAmount: Number(row.retention_amount ?? 0),
    total: Number(row.total ?? 0),
    amountPaid: Number(row.amount_paid ?? 0),
    balance: Number(row.balance ?? 0),
    notes: row.notes ?? '',
    payments: payments.map((payment) => ({
      id: payment.id,
      invoiceId: row.id,
      amount: Number(payment.amount),
      date: payment.createdAt,
      method: payment.method,
      reference: payment.reference ?? undefined,
      notes: payment.notes ?? undefined,
      createdBy: payment.createdBy,
      createdAt: payment.createdAt,
    })),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

app.get('/health', async (_req, res) => {
  try {
    await initialiseSchema();
    res.json({ status: 'ok', mode: 'database', checkedAt: new Date().toISOString() });
  } catch (error) {
    res.status(500).json(createErrorPayload('Health check failed', { status: 'error', details: error.message }));
  }
});

app.get('/companies/:companyId/clients', async (req, res) => {
  const { companyId } = req.params;
  try {
    const db = await getDatabase();
    const rows = await db.all('SELECT * FROM clients WHERE company_id = ? ORDER BY name COLLATE NOCASE', companyId);
    res.json(rows.map(mapClientRow));
  } catch (error) {
    res.status(500).json(createErrorPayload('Unable to fetch clients', { details: error.message }));
  }
});

app.post('/companies/:companyId/clients', async (req, res) => {
  const { companyId } = req.params;
  const parseResult = clientSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res
      .status(400)
      .json(createErrorPayload('Invalid client payload', { issues: parseResult.error.flatten() }));
  }

  const payload = parseResult.data;
  const id = uuid();
  const now = new Date().toISOString();

  try {
    const db = await getDatabase();
    await db.run(
      `INSERT INTO clients (
        id, company_id, name, email, phone, contact_person, contact_email, contact_phone, billing_address, payment_terms, is_active, street, city, state, zip_code, country, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      companyId,
      payload.name,
      payload.email ?? payload.contactEmail ?? '',
      payload.phone ?? payload.contactPhone ?? '',
      payload.contactPerson ?? '',
      payload.contactEmail ?? payload.email ?? '',
      payload.contactPhone ?? payload.phone ?? '',
      payload.billingAddress ?? '',
      payload.paymentTerms ?? 'Net 30',
      payload.isActive === false ? 0 : 1,
      payload.address?.street ?? '',
      payload.address?.city ?? '',
      payload.address?.state ?? '',
      payload.address?.zipCode ?? '',
      payload.address?.country ?? '',
      now,
      now,
    );

    const created = await db.get('SELECT * FROM clients WHERE id = ?', id);
    res.status(201).json(mapClientRow(created));
  } catch (error) {
    res.status(500).json(createErrorPayload('Unable to create client', { details: error.message }));
  }
});

app.put('/clients/:clientId', async (req, res) => {
  const { clientId } = req.params;
  const parseResult = clientSchema.partial().safeParse(req.body);
  if (!parseResult.success) {
    return res
      .status(400)
      .json(createErrorPayload('Invalid client payload', { issues: parseResult.error.flatten() }));
  }

  const payload = parseResult.data;

  if (Object.keys(payload).length === 0) {
    return res.status(400).json(createErrorPayload('No update fields provided'));
  }

  try {
    const db = await getDatabase();
    const existing = await db.get('SELECT * FROM clients WHERE id = ?', clientId);
    if (!existing) {
      return res.status(404).json(createErrorPayload('Client not found'));
    }

    await db.run(
      `UPDATE clients SET
        name = COALESCE(?, name),
        email = COALESCE(?, email),
        phone = COALESCE(?, phone),
        contact_person = COALESCE(?, contact_person),
        contact_email = COALESCE(?, contact_email),
        contact_phone = COALESCE(?, contact_phone),
        billing_address = COALESCE(?, billing_address),
        payment_terms = COALESCE(?, payment_terms),
        is_active = COALESCE(?, is_active),
        street = COALESCE(?, street),
        city = COALESCE(?, city),
        state = COALESCE(?, state),
        zip_code = COALESCE(?, zip_code),
        country = COALESCE(?, country),
        updated_at = ?
      WHERE id = ?`,
      payload.name,
      payload.email ?? payload.contactEmail,
      payload.phone ?? payload.contactPhone,
      payload.contactPerson,
      payload.contactEmail ?? payload.email,
      payload.contactPhone ?? payload.phone,
      payload.billingAddress,
      payload.paymentTerms,
      typeof payload.isActive === 'boolean' ? (payload.isActive ? 1 : 0) : undefined,
      payload.address?.street,
      payload.address?.city,
      payload.address?.state,
      payload.address?.zipCode,
      payload.address?.country,
      new Date().toISOString(),
      clientId,
    );

    const updated = await db.get('SELECT * FROM clients WHERE id = ?', clientId);
    res.json(mapClientRow(updated));
  } catch (error) {
    res.status(500).json(createErrorPayload('Unable to update client', { details: error.message }));
  }
});

app.get('/companies/:companyId/projects', async (req, res) => {
  const { companyId } = req.params;
  try {
    const db = await getDatabase();
    const rows = await db.all('SELECT * FROM projects WHERE company_id = ? ORDER BY created_at DESC', companyId);
    res.json(rows.map(mapProjectRow));
  } catch (error) {
    res.status(500).json(createErrorPayload('Unable to fetch projects', { details: error.message }));
  }
});

const generateInvoiceNumber = async (db, companyId) => {
  const rows = await db.all('SELECT invoice_number FROM invoices WHERE company_id = ?', companyId);
  const existingNumbers = rows
    .map((row) => row.invoice_number)
    .filter(Boolean)
    .map((value) => {
      const match = /^(?:INV-)?(\d+)$/.exec(value);
      return match ? Number(match[1]) : Number(value?.replace(/\D/g, '') ?? 0);
    });

  const next = (existingNumbers.length ? Math.max(...existingNumbers) : 0) + 1;
  return `INV-${String(next).padStart(3, '0')}`;
};

const persistInvoice = async ({
  db,
  invoiceId,
  companyId,
  clientId,
  projectId,
  status,
  issuedAt,
  dueAt,
  notes,
  taxRate,
  retentionRate,
  lineItems,
  invoiceNumber,
}) => {
  const subtotal = lineItems.reduce((total, item) => total + item.quantity * item.unitPrice, 0);
  const taxAmount = subtotal * taxRate;
  const retentionAmount = subtotal * retentionRate;
  const total = subtotal + taxAmount - retentionAmount;
  const initialAmountPaid = status === 'PAID' ? total : 0;
  const balance = Math.max(0, total - initialAmountPaid);

  const now = new Date().toISOString();

  await db.run(
    `INSERT INTO invoices (
      id, company_id, client_id, project_id, invoice_number, issue_date, due_date, status, subtotal, tax_rate, tax_amount, retention_rate, retention_amount, total, amount_paid, balance, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
    invoiceId,
    companyId,
    clientId,
    projectId,
    invoiceNumber,
    issuedAt,
    dueAt,
    status,
    subtotal,
    taxRate,
    taxAmount,
    retentionRate,
    retentionAmount,
    total,
    initialAmountPaid,
    balance,
    notes ?? '',
    now,
    now,
  );

  for (const item of lineItems) {
    const lineId = uuid();
    await db.run(
      `INSERT INTO invoice_line_items (id, invoice_id, description, quantity, unit_price, amount) VALUES (?, ?, ?, ?, ?, ?)` ,
      lineId,
      invoiceId,
      item.description,
      item.quantity,
      item.unitPrice,
      item.quantity * item.unitPrice,
    );
  }
};

app.get('/companies/:companyId/invoices', async (req, res) => {
  const { companyId } = req.params;
  try {
    const db = await getDatabase();
    const rows = await db.all(
      'SELECT * FROM invoices WHERE company_id = ? ORDER BY datetime(issue_date) DESC, invoice_number DESC',
      companyId,
    );
    const invoices = [];
    for (const row of rows) {
      invoices.push(await mapInvoiceRow(db, row));
    }
    res.json(invoices);
  } catch (error) {
    res.status(500).json(createErrorPayload('Unable to fetch invoices', { details: error.message }));
  }
});

app.post('/companies/:companyId/invoices', async (req, res) => {
  const { companyId } = req.params;
  const parseResult = invoiceSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res
      .status(400)
      .json(createErrorPayload('Invalid invoice payload', { issues: parseResult.error.flatten() }));
  }

  const payload = parseResult.data;

  if (!ensureInvoiceDatesValid(payload.issuedAt, payload.dueAt)) {
    return res.status(400).json(createErrorPayload('Due date cannot be before issue date'));
  }

  try {
    const db = await getDatabase();
    const client = await db.get('SELECT id FROM clients WHERE id = ? AND company_id = ?', payload.clientId, companyId);
    if (!client) {
      return res.status(404).json(createErrorPayload('Client not found for this company'));
    }

    const project = await db.get('SELECT id FROM projects WHERE id = ? AND company_id = ?', payload.projectId, companyId);
    if (!project) {
      return res.status(400).json(createErrorPayload('Project not found for this company', { field: 'projectId' }));
    }

    const invoiceId = uuid();
    const invoiceNumber = await generateInvoiceNumber(db, companyId);

    await persistInvoice({
      db,
      invoiceId,
      companyId,
      clientId: payload.clientId,
      projectId: payload.projectId,
      status: payload.status,
      issuedAt: payload.issuedAt,
      dueAt: payload.dueAt,
      notes: payload.notes,
      taxRate: payload.taxRate,
      retentionRate: payload.retentionRate,
      lineItems: payload.lineItems,
      invoiceNumber,
    });

    const created = await db.get('SELECT * FROM invoices WHERE id = ?', invoiceId);
    const invoice = await mapInvoiceRow(db, created);
    res.status(201).json(invoice);
  } catch (error) {
    res.status(500).json(createErrorPayload('Unable to create invoice', { details: error.message }));
  }
});

app.put('/invoices/:invoiceId', async (req, res) => {
  const { invoiceId } = req.params;
  const parseResult = invoiceUpdateSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res
      .status(400)
      .json(createErrorPayload('Invalid invoice payload', { issues: parseResult.error.flatten() }));
  }

  const payload = parseResult.data;

  if (Object.keys(payload).length === 0) {
    return res.status(400).json(createErrorPayload('No update fields provided'));
  }

  try {
    const db = await getDatabase();
    const existing = await db.get('SELECT * FROM invoices WHERE id = ?', invoiceId);
    if (!existing) {
      return res.status(404).json(createErrorPayload('Invoice not found'));
    }

    if (payload.clientId) {
      const client = await db.get(
        'SELECT id FROM clients WHERE id = ? AND company_id = ?',
        payload.clientId,
        existing.company_id,
      );
      if (!client) {
        return res.status(404).json(createErrorPayload('Client not found for this company'));
      }
    }

    if (payload.projectId) {
      const project = await db.get(
        'SELECT id FROM projects WHERE id = ? AND company_id = ?',
        payload.projectId,
        existing.company_id,
      );
      if (!project) {
        return res.status(400).json(createErrorPayload('Project not found for this company', { field: 'projectId' }));
      }
    }

    const nextStatus = payload.status ?? existing.status;
    const nextIssuedAt = payload.issuedAt ?? existing.issue_date;
    const nextDueAt = payload.dueAt ?? existing.due_date;
    if (!ensureInvoiceDatesValid(nextIssuedAt, nextDueAt)) {
      return res.status(400).json(createErrorPayload('Due date cannot be before issue date'));
    }

    const nextNotes = payload.notes ?? existing.notes;
    const nextTaxRate = payload.taxRate ?? Number(existing.tax_rate ?? 0);
    const nextRetentionRate = payload.retentionRate ?? Number(existing.retention_rate ?? 0);
    const nextLineItems = payload.lineItems?.length
      ? payload.lineItems
      : await db.all(
          'SELECT description, quantity, unit_price as unitPrice FROM invoice_line_items WHERE invoice_id = ?',
          invoiceId,
        );

    const subtotal = nextLineItems.reduce((total, item) => total + item.quantity * item.unitPrice, 0);
    const taxAmount = subtotal * nextTaxRate;
    const retentionAmount = subtotal * nextRetentionRate;
    const total = subtotal + taxAmount - retentionAmount;
    const amountPaid = Number(existing.amount_paid ?? 0);
    const balance = Math.max(0, total - amountPaid);

    await db.run(
      `UPDATE invoices SET
        client_id = COALESCE(?, client_id),
        project_id = COALESCE(?, project_id),
        invoice_number = COALESCE(?, invoice_number),
        issue_date = ?,
        due_date = ?,
        status = ?,
        subtotal = ?,
        tax_rate = ?,
        tax_amount = ?,
        retention_rate = ?,
        retention_amount = ?,
        total = ?,
        balance = ?,
        notes = ?,
        updated_at = ?
      WHERE id = ?`,
      payload.clientId,
      payload.projectId,
      payload.invoiceNumber,
      nextIssuedAt,
      nextDueAt,
      nextStatus,
      subtotal,
      nextTaxRate,
      taxAmount,
      nextRetentionRate,
      retentionAmount,
      total,
      balance,
      nextNotes,
      new Date().toISOString(),
      invoiceId,
    );

    if (payload.lineItems) {
      await db.run('DELETE FROM invoice_line_items WHERE invoice_id = ?', invoiceId);
      for (const item of nextLineItems) {
        await db.run(
          `INSERT INTO invoice_line_items (id, invoice_id, description, quantity, unit_price, amount) VALUES (?, ?, ?, ?, ?, ?)` ,
          uuid(),
          invoiceId,
          item.description,
          item.quantity,
          item.unitPrice,
          item.quantity * item.unitPrice,
        );
      }
    }

    const updated = await db.get('SELECT * FROM invoices WHERE id = ?', invoiceId);
    const invoice = await mapInvoiceRow(db, updated);
    res.json(invoice);
  } catch (error) {
    res.status(500).json(createErrorPayload('Unable to update invoice', { details: error.message }));
  }
});

app.post('/invoices/:invoiceId/payments', async (req, res) => {
  const { invoiceId } = req.params;
  const parseResult = paymentSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res
      .status(400)
      .json(createErrorPayload('Invalid payment payload', { issues: parseResult.error.flatten() }));
  }

  const payload = parseResult.data;

  try {
    const db = await getDatabase();
    const invoice = await db.get('SELECT * FROM invoices WHERE id = ?', invoiceId);
    if (!invoice) {
      return res.status(404).json(createErrorPayload('Invoice not found'));
    }

    const currentAmountPaid = Number(invoice.amount_paid ?? 0);
    const totalAmount = Number(invoice.total ?? 0);
    const outstanding = Math.max(0, totalAmount - currentAmountPaid);
    if (payload.amount - outstanding > 1e-6) {
      return res
        .status(400)
        .json(
          createErrorPayload('Payment amount exceeds outstanding balance', {
            outstanding,
            attempted: payload.amount,
          }),
        );
    }

    const id = uuid();
    const createdAt = new Date().toISOString();
    await db.run(
      `INSERT INTO invoice_payments (id, invoice_id, amount, method, reference, notes, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)` ,
      id,
      invoiceId,
      payload.amount,
      payload.method,
      payload.reference ?? null,
      payload.notes ?? null,
      'system',
      createdAt,
    );

    const newAmountPaid = currentAmountPaid + payload.amount;
    const newBalance = Math.max(0, totalAmount - newAmountPaid);
    const nextStatus = newBalance <= 0 ? 'PAID' : invoice.status;

    await db.run(
      `UPDATE invoices SET amount_paid = ?, balance = ?, status = ?, updated_at = ? WHERE id = ?`,
      newAmountPaid,
      newBalance,
      nextStatus,
      createdAt,
      invoiceId,
    );

    const updated = await db.get('SELECT * FROM invoices WHERE id = ?', invoiceId);
    const result = await mapInvoiceRow(db, updated);
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json(createErrorPayload('Unable to record payment', { details: error.message }));
  }
});

export const start = async () => {
  await initialiseSchema();
  app.listen(PORT, () => {
    console.log(`Backend API listening on http://localhost:${PORT}`);
  });
};

if (process.env.NODE_ENV !== 'test') {
  start().catch((error) => {
    console.error('Unable to start backend server', error);
    process.exit(1);
  });
}
