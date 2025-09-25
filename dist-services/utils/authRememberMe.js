import { getStorage } from './storage.js';
const REMEMBERED_EMAIL_KEY = 'asagents_remembered_email';
const storage = getStorage();
const normalizeEmail = (email) => email.trim().toLowerCase();
export const readRememberedEmail = () => {
    try {
        return storage.getItem(REMEMBERED_EMAIL_KEY) || '';
    }
    catch (error) {
        console.warn('Unable to read remembered email', error);
        return '';
    }
};
export const persistRememberedEmail = (shouldRemember, email) => {
    try {
        if (shouldRemember && email) {
            storage.setItem(REMEMBERED_EMAIL_KEY, normalizeEmail(email));
        }
        else {
            storage.removeItem(REMEMBERED_EMAIL_KEY);
        }
    }
    catch (error) {
        console.warn('Unable to persist remembered email', error);
    }
};
export const clearRememberedEmail = () => {
    try {
        storage.removeItem(REMEMBERED_EMAIL_KEY);
    }
    catch (error) {
        console.warn('Unable to clear remembered email', error);
    }
};
export const REMEMBERED_EMAIL_STORAGE_KEY = REMEMBERED_EMAIL_KEY;
//# sourceMappingURL=authRememberMe.js.map