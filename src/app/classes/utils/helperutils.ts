export namespace HelperUtils {
    /**
     * Create a unique alphanumeric string
     * @param length length of the string
     * @returns unique string
     */
    export const createUUID = (length: number = 20): string => {
        const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        const randomBytes = new Uint8Array(length);
        crypto.getRandomValues(randomBytes);

        let result = '';
        for (let i = 0; i < length; i++) {
            const randomIndex = randomBytes[i] % charset.length;
            result += charset.charAt(randomIndex);
        }

        return result;
    };
}
