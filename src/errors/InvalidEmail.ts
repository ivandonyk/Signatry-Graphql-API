export default class InvalidEmailError extends Error {
    constructor(email) {
        super(email);
        this.name = 'InvalidEmailError';
        this.stack = new Error().stack;
    }
}
