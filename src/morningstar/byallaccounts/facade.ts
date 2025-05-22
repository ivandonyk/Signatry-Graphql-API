import { BAAClient } from './client';
import { BAAAccount } from './account';
import { BAASecurity } from './security';
import { BAAHolding } from './holding';
import { BAAUser, BAAUserRole } from './user';
import { BAATransaction } from './transaction';
import {
    BAADataGetRequestBuilder,
    BAAAggregateType,
    BAAQueryType,
    BAAAccountQueryArgs,
    BAAHoldingAggregateArgs,
    BAATransactionAggregateArgs,
    BAAUserAddRequest
} from './request';
import { formatDate } from '../../utilities/datetime';

export class BAAFacade {
    private client: BAAClient;

    constructor() {
        this.client = new BAAClient();
    }

    public async getAllAccounts(loginName: string, loginPass: string): Promise<BAAAccount[]> {
        const request = new BAADataGetRequestBuilder(loginName, loginPass)
            .addInclude(BAAAggregateType.FINANCIAL_INSTITUTION)
            .addInclude(BAAAggregateType.ACCOUNT_CREDENTIAL)
            .addInclude(BAAAggregateType.ACCOUNT)
            .build();
        return this.client
            .makeRequest(request)
            .then(response => response.getAccounts())
            .catch(error => {
                throw new Error(error);
            });
    }

    public async getAccountsForFinancialProfile(
        loginName: string,
        loginPass: string,
        financialProfileId: string,
        accountIds?: string[]
    ): Promise<BAAAccount[]> {
        const args = [{ key: BAAAccountQueryArgs.FINANCIAL_PROFILE, value: financialProfileId }];
        if (accountIds) {
            accountIds.forEach(accountId => {
                args.push({ key: BAAAccountQueryArgs.ID, value: accountId });
            });
        }
        const request = new BAADataGetRequestBuilder(loginName, loginPass)
            .addInclude(BAAAggregateType.FINANCIAL_INSTITUTION)
            .addInclude(BAAAggregateType.ACCOUNT_CREDENTIAL)
            .addInclude(BAAAggregateType.ACCOUNT)
            .setQuery(BAAQueryType.ACCOUNT, args)
            .build();
        const response = await this.client.makeRequest(request);
        return response.getAccounts();
    }

    public async createAdvisorUser(
        username: string,
        password: string,
        firstName: string,
        lastName: string,
        email: string
    ): Promise<BAAUser> {
        const { BYALLACCOUNTS_USER, BYALLACCOUNTS_PASS } = process.env;
        const user = new BAAUser(
            email,
            firstName,
            lastName,
            BAAUserRole.ADVISOR,
            username,
            password
        );

        const request = new BAAUserAddRequest(user, BYALLACCOUNTS_USER, BYALLACCOUNTS_PASS);
        const response = await this.client.makeRequest(request);
        return response.getUser();
    }

    public async getHoldingsAndSecuritiesForAccounts(
        loginName: string,
        loginPass: string,
        financialProfileId: string,
        accountIds: string[]
    ): Promise<{ holdings: BAAHolding[]; securities: BAASecurity[] }> {
        const args = [{ key: BAAAccountQueryArgs.FINANCIAL_PROFILE, value: financialProfileId }];
        if (accountIds) {
            accountIds.forEach(accountId => {
                args.push({ key: BAAAccountQueryArgs.ID, value: accountId });
            });
        }
        const request = new BAADataGetRequestBuilder(loginName, loginPass)
            .addInclude(BAAAggregateType.SECURITY)
            .addInclude(BAAAggregateType.HOLDING, [{ name: BAAHoldingAggregateArgs.ASSET_CLASS }])
            .setQuery(BAAQueryType.ACCOUNT, args)
            .build();
        const response = await this.client.makeRequest(request);
        return { holdings: response.getHoldings(), securities: response.getSecurities() };
    }

    public async getTransactionsForAccounts(
        loginName: string,
        loginPass: string,
        financialProfileId: string,
        accountIds: string[],
        startDate: Date,
        endDate: Date
    ): Promise<BAATransaction[]> {
        const args = [{ key: BAAAccountQueryArgs.FINANCIAL_PROFILE, value: financialProfileId }];
        accountIds.forEach(accountId => {
            if (/^\d+$/.test(accountId)) {//Checks if the accountId contains only digits
                args.push({ key: BAAAccountQueryArgs.ID, value: accountId });
            }
        });

        const dateFormat = 'YYYYMMDD';
        const startDateFormatted = formatDate(startDate, dateFormat);
        const endDateFormatted = formatDate(endDate, dateFormat);

        const request = new BAADataGetRequestBuilder(loginName, loginPass)
            .addInclude(BAAAggregateType.TRANSACTION, [
                {
                    name: BAATransactionAggregateArgs.START_DATE,
                    value: startDateFormatted
                },
                {
                    name: BAATransactionAggregateArgs.END_DATE,
                    value: endDateFormatted
                }
            ])
            .setQuery(BAAQueryType.ACCOUNT, args)
            .build();
        const response = await this.client.makeRequest(request);
        return response.getTransactions();
    }
}
