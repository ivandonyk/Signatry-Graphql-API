import { ObjectType, Field, Float } from 'type-graphql';

@ObjectType()
export class FundHolding {
    constructor(
        investmentId: string,
        name: string,
        marketValue: number,
        marketValueAsOf: Date,
        percentageOfBalance: number,
        visualizationColor: string,
        netValue: number
    ) {
        this.investmentId = investmentId;
        this.name = name;
        this.marketValue = marketValue;
        this.marketValueAsOf = marketValueAsOf;
        this.percentageOfBalance = parseFloat(Math.round(percentageOfBalance * 100).toFixed(2)); // Convert from fraction of 1 to fraction of 100
        this.visualizationColor = visualizationColor;
        this.netValue = netValue;
    }

    @Field()
    investmentId: string;

    @Field()
    name: string;

    @Field()
    visualizationColor: string;

    @Field()
    marketValue: number;

    @Field()
    marketValueAsOf: Date;

    @Field()
    percentageOfBalance: number;

    @Field()
    netValue: number;
}

@ObjectType()
class PendingActivity {
    @Field(type => Float)
    deposits: number;

    @Field(type => Float)
    withdrawals: number;
}
@ObjectType()
export class FundHoldingsBreakdown {
    constructor(
        fundHoldings: FundHolding[],
        availableBalance: number,
        currentBalance: number,
        pendingBalance: number,
        totalInvestedBalance?: number,
        pendingActivity?: { deposits: number; withdrawals: number }
    ) {
        this.fundHoldings = fundHoldings;
        this.availableBalance = availableBalance;
        this.currentBalance = currentBalance;
        this.pendingBalance = pendingBalance;
        this.totalInvestedBalance = totalInvestedBalance;
        this.pendingActivity = pendingActivity;
    }

    @Field(type => [FundHolding])
    fundHoldings: FundHolding[];

    @Field(type => Float)
    availableBalance: number;

    @Field(type => Float)
    currentBalance: number;

    @Field(type => Float)
    pendingBalance: number;

    @Field(type => Float, { nullable: true })
    totalInvestedBalance: number;

    @Field(type => PendingActivity, { nullable: true })
    pendingActivity: { deposits: number; withdrawals: number };
}

@ObjectType()
export class PendingTransactionBatch {
    @Field(type => String, { nullable: true })
    id: string;

    @Field(type => String, { nullable: true })
    status: string;

    @Field(type => String, { nullable: true })
    batchCode: string;
}

@ObjectType()
export class PendingTransactionDetailType {
    @Field(type => String, { nullable: true })
    name: string;
}
@ObjectType()
export class PendingTransactionDetails {
    @Field(type => PendingTransactionBatch, { nullable: true })
    batch: PendingTransactionBatch;
    @Field(type => PendingTransactionDetailType, { nullable: true })
    transactionDetailType: PendingTransactionDetailType;
}
@ObjectType()
export class PendingDepositAndWithdrawal {
    @Field(type => String, { nullable: true })
    type: string;

    @Field(type => Float, { nullable: true })
    amount: number;

    @Field(type => String, { nullable: true })
    transactionCode: string;

    @Field(type => String, { nullable: true })
    transactionStatus: string;

    @Field(type => [PendingTransactionDetails], { nullable: true })
    transactionDetails: PendingTransactionDetails[];
}
@ObjectType()
export class FundPendingDepositAndWithdrawal {
    constructor(
        pendingDeposits: PendingDepositAndWithdrawal[],
        pendingWithdrawals: PendingDepositAndWithdrawal[],
        pendingDepositsCount: number,
        pendingWithdrawalsCount: number
    ) {
        this.pendingDeposits = pendingDeposits;
        this.pendingWithdrawals = pendingWithdrawals;
        this.pendingDepositsCount = pendingDepositsCount;
        this.pendingWithdrawalsCount = pendingWithdrawalsCount;
    }

    @Field(type => [PendingDepositAndWithdrawal])
    pendingDeposits: PendingDepositAndWithdrawal[];

    @Field(type => [PendingDepositAndWithdrawal])
    pendingWithdrawals: PendingDepositAndWithdrawal[];

    @Field(type => Float, { nullable: true })
    pendingDepositsCount: number;

    @Field(type => Float, { nullable: true })
    pendingWithdrawalsCount: number;
}
