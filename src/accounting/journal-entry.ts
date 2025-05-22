interface JournalEntryInterface {
    getAccountId(): string;
    getDescription(): string;
    getAmount(): number;
    getTransactionId(): string;
    getProjectId(): string;
    getCustomerId(): string;
    getLocationEntityId(): string;
    getVendorId(): string;
}

interface JournalEntryBatchCreateResponseInterface {
    getBatchId(): string;
}

export { JournalEntryInterface, JournalEntryBatchCreateResponseInterface };
