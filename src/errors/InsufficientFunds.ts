export class InsufficientFundsError extends Error {
    constructor(message) {
        super(message);
        this.name = 'InsufficientFundsError';
        this.stack = new Error().stack;
    }
}
