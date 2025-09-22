import { beforeEach, describe, expect, it } from 'vitest';
import { webcrypto } from 'node:crypto';
import { api, authApi, resetMockApi } from '../mockApi';
import { resetInMemoryStorage } from '../../utils/storage';

if (!globalThis.crypto) {
    Object.defineProperty(globalThis, 'crypto', {
        value: webcrypto,
        configurable: true,
    });
}

describe('mock api company settings integration', () => {
    beforeEach(() => {
        resetInMemoryStorage();
        resetMockApi();
    });

    it('returns persisted company settings and saves updates', async () => {
        const baseline = await api.getCompanySettings('1');
        expect(baseline).toMatchObject({
            theme: 'light',
            accessibility: { highContrast: false },
        });

        const updated = await api.updateCompanySettings('1', {
            theme: 'dark',
            workingHours: { start: '07:30' },
        });

        expect(updated.theme).toBe('dark');
        expect(updated.workingHours.start).toBe('07:30');
        expect(updated.accessibility.highContrast).toBe(false);

        // Mutating the returned object should not affect the stored settings.
        updated.theme = 'light';

        const roundTrip = await api.getCompanySettings('1');
        expect(roundTrip.theme).toBe('dark');
        expect(roundTrip.workingHours.start).toBe('07:30');
    });

    it('merges nested updates and records audit log entries', async () => {
        const uniqueSuffix = Date.now();
        const registration = await authApi.register({
            firstName: 'Casey',
            lastName: 'Stone',
            email: `casey-${uniqueSuffix}@newco.com`,
            password: 'Password!1',
            companySelection: 'create',
            companyName: `New Co ${uniqueSuffix}`,
            companyType: 'GENERAL_CONTRACTOR',
            termsAccepted: true,
        });

        const companyId = registration.company.id;
        const actorId = registration.user.id;

        const toggled = await api.updateCompanySettings(
            companyId,
            { features: { reporting: false } },
            actorId
        );
        expect(toggled.features.reporting).toBe(false);
        expect(toggled.features.projectManagement).toBe(true);

        const merged = await api.updateCompanySettings(
            companyId,
            {
                accessibility: { highContrast: true },
                workingHours: { workDays: [1, 2, 3, 4] },
            },
            actorId
        );

        expect(merged.accessibility.highContrast).toBe(true);
        expect(merged.workingHours.workDays).toEqual([1, 2, 3, 4]);

        const finalSettings = await api.getCompanySettings(companyId);
        expect(finalSettings.features.projectManagement).toBe(true);
        expect(finalSettings.features.reporting).toBe(false);
        expect(finalSettings.accessibility.highContrast).toBe(true);
        expect(finalSettings.workingHours.workDays).toEqual([1, 2, 3, 4]);

        const auditLogs = await api.getAuditLogsByCompany(companyId);
        expect(auditLogs.some(log => log.action === 'COMPANY_SETTINGS_UPDATED')).toBe(true);
    });
});

describe('mock api multitenant integrity', () => {
    beforeEach(() => {
        resetInMemoryStorage();
        resetMockApi();
    });

    it('returns aggregated tenant directory snapshots', async () => {
        const directory = await api.getTenantDirectory();
        expect(directory.length).toBeGreaterThan(0);

        const constructCo = directory.find(entry => entry.companyName.includes('ConstructCo'));
        expect(constructCo).toBeDefined();
        expect(constructCo?.userCount).toBeGreaterThan(0);
        expect(constructCo?.storageUsageGB).toBeGreaterThanOrEqual(0);
    });

    it('scopes documents and invoices by tenant', async () => {
        await api.uploadDocument({ name: 'Plans.pdf', projectId: '101', category: 'Blueprints' }, '2');

        const constructDocs = await api.getDocumentsByCompany('1');
        expect(constructDocs).toHaveLength(1);
        expect(constructDocs[0].companyId).toBe('1');

        const renovateDocs = await api.getDocumentsByCompany('2');
        expect(renovateDocs).toHaveLength(0);

        const constructInvoices = await api.getInvoicesByCompany('1');
        expect(constructInvoices.every(invoice => invoice.companyId === '1')).toBe(true);

        const renovateInvoices = await api.getInvoicesByCompany('2');
        expect(renovateInvoices.length).toBe(0);
    });
});

describe('mock api adoption intelligence', () => {
    beforeEach(() => {
        resetInMemoryStorage();
        resetMockApi();
    });

    it('builds a tenant operational summary with utilisation and compliance metrics', async () => {
        const summary = await api.getTenantOperationalSummary('1');
        expect(summary.tenant.companyId).toBe('1');
        expect(summary.utilization.activeUsers).toBeGreaterThan(0);
        expect(summary.utilization.toolUsage.length).toBeGreaterThan(0);
        expect(summary.compliance.pendingInvites).toBeGreaterThanOrEqual(0);
        expect(Array.isArray(summary.recommendedActions)).toBe(true);
    });

    it('generates a user access summary highlighting available and locked modules', async () => {
        const accessSummary = await api.getUserAccessSummary('2');
        expect(accessSummary.userId).toBe('2');
        expect(accessSummary.modules.length).toBeGreaterThan(0);
        expect(accessSummary.permissions.length).toBeGreaterThan(0);
        const locked = accessSummary.modules.filter(module => !module.granted);
        expect(Array.isArray(locked)).toBe(true);
    });

    it('produces a platform adoption report with tenant rollups', async () => {
        const directory = await api.getTenantDirectory();
        const report = await api.getPlatformAdoptionReport();
        expect(report.tenants.length).toBe(directory.length);
        expect(report.adoptionScore).toBeGreaterThanOrEqual(0);
        expect(report.adoptionScore).toBeLessThanOrEqual(100);
        expect(Array.isArray(report.topActions)).toBe(true);
    });
});
