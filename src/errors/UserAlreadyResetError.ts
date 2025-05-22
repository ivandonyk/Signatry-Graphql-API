class UserAlreadyResetError extends Error {
    constructor(message) {
        super(message);
        this.name = 'UserAlreadyResetError';
        this.stack = new Error().stack;
    }
}

export default UserAlreadyResetError;
