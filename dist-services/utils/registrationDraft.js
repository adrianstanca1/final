import { Role } from '../types.js';
import { getStorage } from './storage.js';
const REGISTRATION_DRAFT_KEY = 'asagents_registration_draft_v1';
const COMPANY_TYPES = [
    'GENERAL_CONTRACTOR',
    'SUBCONTRACTOR',
    'SUPPLIER',
    'CONSULTANT',
    'CLIENT',
];
const ROLE_VALUES = new Set(Object.values(Role));
const storage = getStorage();
export const REGISTRATION_DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
export const EMPTY_REGISTRATION_DRAFT = {
    step: 'account',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    companySelection: '',
    companyName: '',
    companyType: '',
    companyEmail: '',
    companyPhone: '',
    companyWebsite: '',
    inviteToken: '',
    role: '',
    updatesOptIn: true,
    termsAccepted: false,
};
const sanitizeStep = (value) => {
    if (value === 'workspace' || value === 'confirm') {
        return value;
    }
    return 'account';
};
const sanitizeString = (value) => (typeof value === 'string' ? value.trim() : '');
const sanitizeCompanySelection = (value) => {
    if (value === 'create' || value === 'join') {
        return value;
    }
    return '';
};
const sanitizeCompanyType = (value) => {
    if (typeof value === 'string' && COMPANY_TYPES.includes(value)) {
        return value;
    }
    return '';
};
const sanitizeRole = (value) => {
    if (typeof value === 'string' && ROLE_VALUES.has(value)) {
        return value;
    }
    return '';
};
const sanitizeBoolean = (value, fallback) => (typeof value === 'boolean' ? value : fallback);
const sanitizeDraft = (draft) => ({
    step: sanitizeStep(draft.step),
    firstName: sanitizeString(draft.firstName),
    lastName: sanitizeString(draft.lastName),
    email: sanitizeString(draft.email),
    phone: sanitizeString(draft.phone),
    companySelection: sanitizeCompanySelection(draft.companySelection),
    companyName: sanitizeString(draft.companyName),
    companyType: sanitizeCompanyType(draft.companyType),
    companyEmail: sanitizeString(draft.companyEmail),
    companyPhone: sanitizeString(draft.companyPhone),
    companyWebsite: sanitizeString(draft.companyWebsite),
    inviteToken: sanitizeString(draft.inviteToken),
    role: sanitizeRole(draft.role),
    updatesOptIn: sanitizeBoolean(draft.updatesOptIn, true),
    termsAccepted: sanitizeBoolean(draft.termsAccepted, false),
});
const draftsDiffer = (a, b) => a.step !== b.step ||
    a.firstName !== b.firstName ||
    a.lastName !== b.lastName ||
    a.email !== b.email ||
    a.phone !== b.phone ||
    a.companySelection !== b.companySelection ||
    a.companyName !== b.companyName ||
    a.companyType !== b.companyType ||
    a.companyEmail !== b.companyEmail ||
    a.companyPhone !== b.companyPhone ||
    a.companyWebsite !== b.companyWebsite ||
    a.inviteToken !== b.inviteToken ||
    a.role !== b.role ||
    a.updatesOptIn !== b.updatesOptIn ||
    a.termsAccepted !== b.termsAccepted;
export const registrationDraftHasContent = (draft) => draftsDiffer(draft, EMPTY_REGISTRATION_DRAFT);
export const saveRegistrationDraft = (input) => {
    const sanitized = sanitizeDraft(input);
    if (!registrationDraftHasContent(sanitized)) {
        clearRegistrationDraft();
        return;
    }
    const payload = {
        version: 1,
        savedAt: Date.now(),
        expiresAt: Date.now() + REGISTRATION_DRAFT_TTL_MS,
        data: sanitized,
    };
    try {
        storage.setItem(REGISTRATION_DRAFT_KEY, JSON.stringify(payload));
    }
    catch (error) {
        console.warn('Unable to persist registration draft', error);
    }
};
export const loadRegistrationDraft = () => {
    try {
        const raw = storage.getItem(REGISTRATION_DRAFT_KEY);
        if (!raw) {
            return null;
        }
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object' || parsed.version !== 1) {
            clearRegistrationDraft();
            return null;
        }
        if (typeof parsed.expiresAt === 'number' && parsed.expiresAt < Date.now()) {
            clearRegistrationDraft();
            return null;
        }
        return sanitizeDraft(parsed.data);
    }
    catch (error) {
        console.warn('Unable to read registration draft', error);
        clearRegistrationDraft();
        return null;
    }
};
export const clearRegistrationDraft = () => {
    try {
        storage.removeItem(REGISTRATION_DRAFT_KEY);
    }
    catch (error) {
        console.warn('Unable to clear registration draft', error);
    }
};
//# sourceMappingURL=registrationDraft.js.map