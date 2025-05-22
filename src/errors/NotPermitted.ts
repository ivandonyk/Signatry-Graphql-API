class NotPermittedError extends Error {
    constructor(message) {
        super(message);
        this.name = 'NotPermittedError';
        this.stack = new Error().stack;
    }
}

export default NotPermittedError;
