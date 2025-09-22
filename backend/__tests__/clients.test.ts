import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs/promises';
import type { Database } from 'sqlite';

process.env.NODE_ENV = 'test';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const testDbFile = path.resolve(__dirname, '../data/test-app.db');
process.env.DATABASE_FILE = testDbFile;

const { app } = await import('../server.js');
const { getDatabase, initialiseSchema } = await import('../database.js');

const COMPANY_ID = 'test-company';
const PROJECT_ID = 'project-1';

let db: Database;

beforeAll(async () => {
  await fs.rm(testDbFile, { force: true });
  await initialiseSchema();
  db = await getDatabase();
});

beforeEach(async () => {
  await db.exec(`
    DELETE FROM invoice_payments;
    DELETE FROM invoice_line_items;
    DELETE FROM invoices;
    DELETE FROM projects;
    DELETE FROM clients;
    DELETE FROM users;
    DELETE FROM companies;
  `);

  const now = new Date().toISOString();
  await db.run(
    `INSERT INTO companies (id, name, type, email, phone, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    COMPANY_ID,
    'Integration Test Co',
    'GENERAL_CONTRACTOR',
    'ops@test.dev',
    '+1-555-0100',
    now,
    now,
  );

  await db.run(
    `INSERT INTO projects (id, company_id, name, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    PROJECT_ID,
    COMPANY_ID,
    'Test Project',
    'ACTIVE',
    now,
    now,
  );
});

afterAll(async () => {
  if (db) {
    await db.close();
  }
  await fs.rm(testDbFile, { force: true });
});

describe('Clients API', () => {
  it('returns an empty list for a company with no clients', async () => {
    const response = await request(app).get(`/companies/${COMPANY_ID}/clients`);
    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it('creates a client with valid payload', async () => {
    const response = await request(app).post(`/companies/${COMPANY_ID}/clients`).send({
      name: 'Alpha Developments',
      contactEmail: 'contact@alpha.dev',
      contactPerson: 'Taylor Finch',
      paymentTerms: 'Net 45',
    });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      name: 'Alpha Developments',
      contactEmail: 'contact@alpha.dev',
      paymentTerms: 'Net 45',
      companyId: COMPANY_ID,
    });
    expect(response.body.id).toBeDefined();
  });

  it('rejects invalid client payloads', async () => {
    const response = await request(app).post(`/companies/${COMPANY_ID}/clients`).send({
      contactEmail: 'missing-name@example.com',
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Invalid client payload');
    expect(response.body.issues).toBeDefined();
  });

  it('updates an existing client and toggles activity', async () => {
    const createResponse = await request(app).post(`/companies/${COMPANY_ID}/clients`).send({
      name: 'Beta Retail',
      contactEmail: 'hello@beta-retail.com',
    });

    const clientId = createResponse.body.id;
    expect(clientId).toBeDefined();

    const updateResponse = await request(app).put(`/clients/${clientId}`).send({
      paymentTerms: 'Net 60',
      isActive: false,
    });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.paymentTerms).toBe('Net 60');
    expect(updateResponse.body.isActive).toBe(false);
    expect(updateResponse.body.updatedAt).not.toBe(createResponse.body.updatedAt);
  });

  it('requires at least one field when updating a client', async () => {
    const createResponse = await request(app).post(`/companies/${COMPANY_ID}/clients`).send({
      name: 'Gamma Partners',
      contactEmail: 'team@gammapartners.com',
    });

    const clientId = createResponse.body.id;
    const response = await request(app).put(`/clients/${clientId}`).send({});

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('No update fields provided');
  });
});

describe('Invoice validations', () => {
  const baseInvoicePayload = {
    projectId: PROJECT_ID,
    issuedAt: '2024-05-01T00:00:00.000Z',
    dueAt: '2024-05-30T00:00:00.000Z',
    status: 'DRAFT',
    taxRate: 0.2,
    retentionRate: 0,
    lineItems: [
      {
        description: 'Mobilisation',
        quantity: 1,
        unitPrice: 1000,
      },
    ],
  };

  it('rejects invoices where due date precedes issue date', async () => {
    const clientResponse = await request(app).post(`/companies/${COMPANY_ID}/clients`).send({
      name: 'Delta Housing',
      contactEmail: 'finance@delta.com',
    });

    const clientId = clientResponse.body.id;

    const response = await request(app).post(`/companies/${COMPANY_ID}/invoices`).send({
      ...baseInvoicePayload,
      clientId,
      dueAt: '2024-04-01T00:00:00.000Z',
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Due date cannot be before issue date');
  });

  it('prevents recording payments that exceed the outstanding balance', async () => {
    const clientResponse = await request(app).post(`/companies/${COMPANY_ID}/clients`).send({
      name: 'Epsilon Fabricators',
      contactEmail: 'accounts@epsilon.io',
    });
    const clientId = clientResponse.body.id;

    const invoiceResponse = await request(app).post(`/companies/${COMPANY_ID}/invoices`).send({
      ...baseInvoicePayload,
      clientId,
    });

    expect(invoiceResponse.status).toBe(201);
    const invoiceId = invoiceResponse.body.id;

    const paymentResponse = await request(app).post(`/invoices/${invoiceId}/payments`).send({
      amount: 5000,
      method: 'BANK_TRANSFER',
    });

    expect(paymentResponse.status).toBe(400);
    expect(paymentResponse.body.error).toBe('Payment amount exceeds outstanding balance');
  });
});

describe('Insights dashboards', () => {
  const lineItems = [
    {
      description: 'Phase billing',
      quantity: 1,
      unitPrice: 1000,
    },
  ];

  const futureDate = () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const pastDate = (daysAgo: number) => new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();

  it('summarises invoice cash flow and outstanding balances', async () => {
    const clientA = await request(app).post(`/companies/${COMPANY_ID}/clients`).send({
      name: 'Insight Manufacturing',
      contactEmail: 'ap@insight-manufacturing.test',
    });
    const clientB = await request(app).post(`/companies/${COMPANY_ID}/clients`).send({
      name: 'Harbor Retail',
      contactEmail: 'finance@harbor-retail.test',
    });

    expect(clientA.status).toBe(201);
    expect(clientB.status).toBe(201);

    const sentInvoice = await request(app).post(`/companies/${COMPANY_ID}/invoices`).send({
      clientId: clientA.body.id,
      projectId: PROJECT_ID,
      issuedAt: pastDate(10),
      dueAt: futureDate(),
      status: 'SENT',
      taxRate: 0,
      retentionRate: 0,
      lineItems,
    });

    const overdueInvoice = await request(app).post(`/companies/${COMPANY_ID}/invoices`).send({
      clientId: clientB.body.id,
      projectId: PROJECT_ID,
      issuedAt: pastDate(40),
      dueAt: pastDate(5),
      status: 'SENT',
      taxRate: 0,
      retentionRate: 0,
      lineItems: [
        {
          description: 'Final claim',
          quantity: 2,
          unitPrice: 1000,
        },
      ],
    });

    const paidInvoice = await request(app).post(`/companies/${COMPANY_ID}/invoices`).send({
      clientId: clientA.body.id,
      projectId: PROJECT_ID,
      issuedAt: pastDate(25),
      dueAt: pastDate(2),
      status: 'PAID',
      taxRate: 0,
      retentionRate: 0,
      lineItems,
    });

    expect(sentInvoice.status).toBe(201);
    expect(overdueInvoice.status).toBe(201);
    expect(paidInvoice.status).toBe(201);

    await request(app).post(`/invoices/${overdueInvoice.body.id}/payments`).send({
      amount: 500,
      method: 'BANK_TRANSFER',
    });

    const response = await request(app).get(`/companies/${COMPANY_ID}/invoice-insights`);

    expect(response.status).toBe(200);
    expect(response.body.totals.outstandingBalance).toBeCloseTo(2500, 0);
    expect(response.body.totals.overdueBalance).toBeCloseTo(1500, 0);
    expect(response.body.cashFlow.upcomingDue.count).toBeGreaterThanOrEqual(1);
    expect(response.body.cashFlow.overdue.total).toBeGreaterThan(0);
    expect(response.body.cashFlow.paidLast30Days.total).toBeGreaterThanOrEqual(500);
    expect(response.body.statusSummary).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ status: 'SENT', invoiceCount: expect.any(Number) }),
        expect.objectContaining({ status: 'PAID', invoiceCount: expect.any(Number) }),
      ]),
    );
    expect(response.body.topOutstandingClients[0]).toMatchObject({ clientId: clientB.body.id });
  });

  it('reports client health metrics', async () => {
    const freshClient = await request(app).post(`/companies/${COMPANY_ID}/clients`).send({
      name: 'Quantum Developments',
      contactEmail: 'billing@quantum.dev',
    });
    const legacyClient = await request(app).post(`/companies/${COMPANY_ID}/clients`).send({
      name: 'Legacy Estates',
      contactEmail: 'accounts@legacy-estates.dev',
    });

    expect(freshClient.status).toBe(201);
    expect(legacyClient.status).toBe(201);

    const oldDate = pastDate(140);
    await db.run(
      `UPDATE clients SET created_at = ?, updated_at = ?, is_active = 0 WHERE id = ?`,
      oldDate,
      oldDate,
      legacyClient.body.id,
    );

    await request(app).post(`/companies/${COMPANY_ID}/invoices`).send({
      clientId: freshClient.body.id,
      projectId: PROJECT_ID,
      issuedAt: pastDate(15),
      dueAt: pastDate(1),
      status: 'SENT',
      taxRate: 0,
      retentionRate: 0,
      lineItems,
    });

    const response = await request(app).get(`/companies/${COMPANY_ID}/client-insights`);

    expect(response.status).toBe(200);
    expect(response.body.totalClients).toBe(2);
    expect(response.body.activeClients).toBe(1);
    expect(response.body.dormantClients).toBe(1);
    expect(response.body.newThisQuarter).toBeGreaterThanOrEqual(1);
    expect(response.body.atRiskClients.length).toBeGreaterThanOrEqual(1);
    expect(response.body.atRiskClients[0]).toMatchObject({ clientId: freshClient.body.id });
  });
});
