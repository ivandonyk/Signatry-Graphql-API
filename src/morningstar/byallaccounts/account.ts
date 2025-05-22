import { parseBAATimestampToUTC } from '../../utilities/datetime';

export class BAAAccount {
    private accountId: string;
    private accountNumber: string;
    private name: string;
    private accountType: string;
    private lastUpdated: Date;
    private marketValue: number;
    private financialProfileId: string;
    private custodianName: string;

    constructor(
        accountId: string,
        accountNumber: string,
        name: string,
        accountType: string,
        lastUpdated: Date,
        marketValue: number,
        financialProfileId: string,
        custodianName: string
    ) {
        this.accountId = accountId;
        this.accountNumber = accountNumber;
        this.name = name;
        this.accountType = accountType;
        this.lastUpdated = lastUpdated;
        this.marketValue = marketValue;
        this.financialProfileId = financialProfileId;
        this.custodianName = custodianName;
    }

    public getAccountId(): string {
        return this.accountId;
    }

    public getAccountNumber(): string {
        return this.accountNumber;
    }

    public getName(): string {
        return this.name;
    }

    public getAccountType(): string {
        return this.accountType;
    }

    public getLastUpdated(): Date {
        return this.lastUpdated;
    }

    public getMarketValue(): number {
        return this.marketValue;
    }

    public getFinancialProfileId(): string {
        return this.financialProfileId;
    }

    public getCustodianName(): string {
        return this.custodianName;
    }
}

export class BAAAccountFactory {
    static create(
        accountData: any,
        accountCredentialData: any[],
        financialInstitutionData: any[]
    ): BAAAccount {
        const accountCredentialId = accountData['AC_ID'];
        const accountCredential = accountCredentialData.find(acctCred => {
            return acctCred['ID'] == accountCredentialId;
        });
        const financialInstitution = financialInstitutionData.find(finInst => {
            return finInst['ID'] == accountCredential['FI_ID'];
        });
        let parsedDate: Date;
        if (accountData.hasOwnProperty('LAST_UPDATED')) {
            parsedDate = parseBAATimestampToUTC(accountData['LAST_UPDATED']);
        } else {
            parsedDate = null;
        }
        return new BAAAccount(
            accountData['ID'],
            accountData['ACCOUNT_NUMBER'],
            accountData['NAME'],
            accountData['ACCOUNT_TYPE'],
            parsedDate,
            accountData['MARKET_VALUE'],
            accountData['FP_ID'],
            financialInstitution['NAME']
        );
    }
}
