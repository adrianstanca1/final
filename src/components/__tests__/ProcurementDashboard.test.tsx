import { describe, it, expect } from 'vitest';
import { Role } from '../../types';

// Helper function to check access control logic
const checkProcurementAccess = (userRole: Role): { hasAccess: boolean; databaseContext: string } => {
    const hasAccess = userRole === Role.PRINCIPAL_ADMIN || userRole === Role.OWNER;
    const databaseContext = userRole === Role.PRINCIPAL_ADMIN ? 'platform' : 'company';

    return { hasAccess, databaseContext };
};

describe('Procurement Access Control Logic', () => {
    it('grants access to Principal Admin', () => {
        const result = checkProcurementAccess(Role.PRINCIPAL_ADMIN);
        expect(result.hasAccess).toBe(true);
        expect(result.databaseContext).toBe('platform');
    });

    it('grants access to Company Owner', () => {
        const result = checkProcurementAccess(Role.OWNER);
        expect(result.hasAccess).toBe(true);
        expect(result.databaseContext).toBe('company');
    });

    it('denies access to Project Manager', () => {
        const result = checkProcurementAccess(Role.PROJECT_MANAGER);
        expect(result.hasAccess).toBe(false);
        expect(result.databaseContext).toBe('company');
    });

    it('denies access to Foreman', () => {
        const result = checkProcurementAccess(Role.FOREMAN);
        expect(result.hasAccess).toBe(false);
        expect(result.databaseContext).toBe('company');
    });

    it('denies access to Operative', () => {
        const result = checkProcurementAccess(Role.OPERATIVE);
        expect(result.hasAccess).toBe(false);
        expect(result.databaseContext).toBe('company');
    });

    it('denies access to Admin', () => {
        const result = checkProcurementAccess(Role.ADMIN);
        expect(result.hasAccess).toBe(false);
        expect(result.databaseContext).toBe('company');
    });

    it('denies access to Client', () => {
        const result = checkProcurementAccess(Role.CLIENT);
        expect(result.hasAccess).toBe(false);
        expect(result.databaseContext).toBe('company');
    });
});