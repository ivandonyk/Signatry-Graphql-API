import { BAAAccount, BAAAccountFactory } from './account';
import { BAAHolding, BAAHoldingFactory } from './holding';
import { BAASecurity, BAASecurityFactory } from './security';
import { BAAUser, BAAUserFactory } from './user';
import { BAATransaction, BAATransactionFactory } from './transaction';

export class BAAResponse {
    private accounts: BAAAccount[];
    private user: BAAUser;
    private holdings: BAAHolding[];
    private securities: BAASecurity[];
    private transactions: BAATransaction[];

    public setAccounts(accounts: BAAAccount[]): this {
        this.accounts = accounts;
        return this;
    }

    public getAccounts(): BAAAccount[] {
        return this.accounts;
    }

    public setUser(user: BAAUser): this {
        this.user = user;
        return this;
    }

    public getUser(): BAAUser {
        return this.user;
    }

    public setHoldings(holdings: BAAHolding[]): this {
        this.holdings = holdings;
        return this;
    }

    public getHoldings(): BAAHolding[] {
        return this.holdings;
    }

    public setSecurities(securities: BAASecurity[]): this {
        this.securities = securities;
        return this;
    }

    public getSecurities(): BAASecurity[] {
        return this.securities;
    }

    public setTransactions(transactions: BAATransaction[]): this {
        this.transactions = transactions;
        return this;
    }

    public getTransactions(): BAATransaction[] {
        return this.transactions;
    }
}

export class BAAResponseFactory {
    public static create(rawData: any): BAAResponse {
        const responseData = rawData['DATACONNECTRS'];
        const response = new BAAResponse();

        if (responseData.hasOwnProperty('DATAGETRS')) {
            // accounts
            if (responseData['DATAGETRS']['FP_DATA'].hasOwnProperty('ACCOUNT')) {
                const accountData: any[] = responseData['DATAGETRS']['FP_DATA']['ACCOUNT'];
                const accountCredentialData: any[] =
                    responseData['DATAGETRS']['FP_DATA']['ACCOUNT_CREDENTIAL'];
                const financialInstitutionData: any[] = responseData['DATAGETRS']['FILIST']['FI'];
                const accounts = accountData.map(data => {
                    return BAAAccountFactory.create(
                        data,
                        accountCredentialData,
                        financialInstitutionData
                    );
                });
                response.setAccounts(accounts);
            }
            // holdings
            if (responseData['DATAGETRS']['FP_DATA'].hasOwnProperty('HOLDING')) {
                const holdingData: any[] = responseData['DATAGETRS']['FP_DATA']['HOLDING'];
                const holdings = holdingData.map(data => {
                    return BAAHoldingFactory.create(data);
                });
                response.setHoldings(holdings);
            }
            // securities
            if (responseData['DATAGETRS'].hasOwnProperty('SECURITYLIST')) {
                const securityData: any[] = responseData['DATAGETRS']['SECURITYLIST']['SECURITY'];
                const securities = securityData.map(data => {
                    return BAASecurityFactory.create(data);
                });
                response.setSecurities(securities);
            }
            // IA transactions
            if (responseData['DATAGETRS']['FP_DATA'].hasOwnProperty('TRANSACTION')) {
                const transactionData: any[] = responseData['DATAGETRS']['FP_DATA']['TRANSACTION'];

                const transactions = transactionData.reduce((transactionArray, data) => {
                    try {
                        const newTransaction = BAATransactionFactory.create(data);
                        transactionArray.push(newTransaction);
                    } catch (error) {
                        console.log(error.message);
                    }
                    return transactionArray;
                }, []);

                response.setTransactions(transactions);
            }
        } else if (responseData.hasOwnProperty('USERADDRS')) {
            const userData = responseData['USERADDRS'];
            const user = BAAUserFactory.create(userData);
            response.setUser(user);
        }
        return response;
    }
}
