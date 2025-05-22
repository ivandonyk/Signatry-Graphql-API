export default class RecurringContributionError extends Error {
    constructor(message) {
        super(message);
        this.name = 'RecurringContributionError';
        this.stack = new Error().stack;
    }
}
