import { Client, Transaction, Account, environments } from 'plaid';
import { formatDate } from '../utilities/datetime';
const { PLAID_CLIENT_ID, PLAID_SECRET, PLAID_PUBLIC_KEY, PLAID_ENV } = process.env;

export class PlaidClient {
    private client: Client;

    constructor() {
        this.client = new Client(
            PLAID_CLIENT_ID,
            PLAID_SECRET,
            PLAID_PUBLIC_KEY,
            environments[PLAID_ENV]
        );
    }

    public async getAccount(accountId: string, accessToken: string): Promise<Account> {
        try {
            const response = await this.client.getAccounts(accessToken, {
                account_ids: [accountId]
            });
            return response.accounts.pop();
        } catch (error) {
            console.log('Error retrieving Plaid accounts');
            console.log(error);
        }
    }

    public async getTransactionsForAccount(
        accountId: string,
        accessToken: string,
        startDate: Date,
        endDate: Date
    ): Promise<Transaction[]> {
        const startDateFormatted = formatDate(startDate, 'YYYY-MM-DD');
        const endDateFormatted = formatDate(endDate, 'YYYY-MM-DD');
        try {
            const response = await this.client.getTransactions(
                accessToken,
                startDateFormatted,
                endDateFormatted,
                { account_ids: [accountId] }
            );
            return response.transactions;
        } catch (error) {
            console.log('Error retrieving Plaid transactions');
            console.log(error);
        }
    }
}
