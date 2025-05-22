import { AccountInterface } from '../accounting/account';
import { Functions, Xml } from '@intacct/intacct-sdk';

class IntacctAccount implements AccountInterface {
    accountNumber: string;
    title: string;

    constructor(accountNumber: string, title: string) {
        this.accountNumber = accountNumber;
        this.title = title;
    }

    public getAccountNumber(): string {
        return this.accountNumber;
    }

    public getTitle(): string {
        return this.title;
    }

    public getAccountCreateObject(): Functions.GeneralLedger.AccountCreate {
        const account = new Functions.GeneralLedger.AccountCreate();
        account.accountNo = this.getAccountNumber();
        account.title = this.getTitle();

        return account;
    }
}

class IntacctAccountFactory {
    static create(data: Xml.Response.Result) {
        const account = new IntacctAccount(data['ACCOUNTNO'], data['TITLE']);
        return account;
    }
}

export { IntacctAccount, IntacctAccountFactory };
