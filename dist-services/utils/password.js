const getCrypto = () => {
    if (typeof globalThis.crypto !== 'undefined') {
        return globalThis.crypto;
    }
    throw new Error('Secure crypto APIs are not available in this environment.');
};
const cryptoApi = getCrypto();
const encoder = new TextEncoder();
const toHex = (buffer) => Array.from(new Uint8Array(buffer))
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
const generateSalt = (length = 16) => {
    const bytes = new Uint8Array(length);
    cryptoApi.getRandomValues(bytes);
    return toHex(bytes.buffer);
};
const deriveHash = async (password, salt) => {
    const data = encoder.encode(`${salt}:${password}`);
    const digest = await cryptoApi.subtle.digest('SHA-256', data);
    return toHex(digest);
};
const timingSafeEqual = (a, b) => {
    if (a.length !== b.length) {
        return false;
    }
    let result = 0;
    for (let i = 0; i < a.length; i++) {
        result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
};
export const createPasswordRecord = async (password) => {
    const salt = generateSalt();
    const hash = await deriveHash(password, salt);
    return { hash, salt };
};
export const verifyPassword = async (password, hash, salt) => {
    const derivedHash = await deriveHash(password, salt);
    return timingSafeEqual(derivedHash, hash);
};
export const upgradeLegacyPassword = async (user) => {
    if (!user.passwordHash && !user.passwordSalt && user.password) {
        const { hash, salt } = await createPasswordRecord(user.password);
        user.passwordHash = hash;
        user.passwordSalt = salt;
        delete user.password;
    }
    return user;
};
export const sanitizeUser = (user) => {
    const { password, passwordHash, passwordSalt, ...rest } = user;
    return rest;
};
//# sourceMappingURL=password.js.map