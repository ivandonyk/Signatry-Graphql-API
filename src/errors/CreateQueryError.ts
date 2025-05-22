class CreateQueryError extends Error {
    constructor(message) {
        super(message);
        this.name = 'CreateQueryError';
        this.stack = new Error().stack;
    }
}

export default CreateQueryError;
