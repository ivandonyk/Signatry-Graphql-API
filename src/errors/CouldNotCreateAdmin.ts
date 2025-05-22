export default class CouldNotCreateAdminError extends Error {
    constructor(errors: Error[]) {
        const message = errors.reduce(
            (message, error) => {
                return message + error.name + ':' + error.message + '\n';
            }, 
            ""
        );
        super(message.trim());
        this.name = 'CouldNotCreateAdminError';
        this.stack = new Error().stack;
    }
}

