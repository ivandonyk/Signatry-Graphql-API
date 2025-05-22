class AccountAlreadyExistsError extends Error {
    constructor(message) {
        super(message);
        this.name = 'AccountAlreadyExistsError';
        this.stack = new Error().stack;
    }
}

export default AccountAlreadyExistsError;
