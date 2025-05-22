import {
    JournalEntryInterface,
    JournalEntryBatchCreateResponseInterface
} from '../accounting/journal-entry';
import { Functions, Xml } from '@intacct/intacct-sdk';

class IntacctJournalEntry implements JournalEntryInterface {
    accountId: string;
    description: string;
    amount: number;
    transactionId: string;
    projectId: string;
    customerId: string;
    locationEntityId: string;
    vendorId: string;
    customFields: [string, any][];

    constructor(
        accountId: string,
        description: string,
        amount: number,
        transactionId: string,
        projectId: string,
        customerId: string,
        locationEntityId: string,
        vendorId: string,
        customFields = []
    ) {
        this.accountId = accountId;
        this.description = description;
        this.amount = amount;
        this.transactionId = transactionId;
        this.projectId = projectId;
        this.customerId = customerId;
        this.locationEntityId = locationEntityId;
        this.vendorId = vendorId;
        this.customFields = customFields;
    }

    public getAccountId(): string {
        return this.accountId;
    }

    public getDescription(): string {
        return this.description;
    }

    public getAmount(): number {
        const amount = parseFloat(this.amount.toFixed(2));
        return amount;
    }

    public getTransactionId(): string {
        return this.transactionId;
    }

    public getProjectId(): string {
        return this.projectId;
    }

    public getCustomerId(): string {
        return this.customerId;
    }

    public getLocationEntityId(): string {
        return this.locationEntityId;
    }

    public getVendorId(): string {
        return this.vendorId;
    }

    public getCustomFields(): [string, any][] {
        return this.customFields;
    }

    public getJournalEntryCreateLineObject(): Functions.GeneralLedger.JournalEntryLineCreate {
        const line = new Functions.GeneralLedger.JournalEntryLineCreate();
        line.glAccountNumber = this.getAccountId();
        line.transactionAmount = this.getAmount();
        line.documentNumber = this.getTransactionId();
        line.projectId = this.getProjectId();
        line.customerId = this.getCustomerId();
        line.locationId = this.getLocationEntityId();
        line.memo = this.getDescription();
        line.classId = 'NOP10';
        line.departmentId = 'DONOR';
        line.vendorId = this.getVendorId();
        line.customFields = this.getCustomFields();

        return line;
    }
}

class IntacctJournalEntryBatchCreateResponse implements JournalEntryBatchCreateResponseInterface {
    batchId: string;

    constructor(data: Xml.OnlineResponse) {
        this.batchId = data['RECORDNO'];
    }

    public getBatchId(): string {
        return this.batchId;
    }
}

class IntacctJournalEntryFactory {
    static create(result: Xml.Response.Result) {
        const entry = new IntacctJournalEntry(
            result['ACCOUNTNO'],
            result['DESCRIPTION'],
            result['AMOUNT'],
            result['DOCUMENT'],
            result['PROJECTID'],
            result['CUSTOMERID'],
            result['VENDORID'],
            result['LOCATIONID']
        );
        return entry;
    }
}

export { IntacctJournalEntry, IntacctJournalEntryFactory, IntacctJournalEntryBatchCreateResponse };
