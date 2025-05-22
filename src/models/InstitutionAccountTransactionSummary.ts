import { ObjectType, Field, Int, Float } from 'type-graphql';
import { InstitutionAccountTransaction } from '.';
import { InstitutionAccountTransactionType } from './InstitutionAccountTransaction';
import { currency } from '../utilities/currency';

@ObjectType()
class TransactionTypeSum {
    constructor(
        transactionType: InstitutionAccountTransactionType,
        valueSum: number,
        unitSum: number
    ) {
        this.transactionType = transactionType;
        this.valueSum = valueSum;
        this.unitSum = unitSum;
    }

    @Field(type => String)
    transactionType: InstitutionAccountTransactionType;

    @Field(type => Float)
    valueSum: number;

    @Field(type => Float)
    unitSum: number;
}

@ObjectType()
export class InstitutionAccountTransactionSummary {
    constructor(
        sumsByType: { [typeName: string]: { valueSum: number; unitSum: number } },
        realizedGain: number,
        units: number
    ) {
        this.transactionSumsByType = [];
        for (const typeName in sumsByType) {
            this.transactionSumsByType.push(
                new TransactionTypeSum(
                    typeName as InstitutionAccountTransactionType,
                    sumsByType[typeName].valueSum,
                    sumsByType[typeName].unitSum
                )
            );
        }
        this.units = units;
        const dividends = sumsByType[InstitutionAccountTransactionType.DIVIDEND].valueSum;
        const interest = sumsByType[InstitutionAccountTransactionType.INTEREST].valueSum;
        this.dividendsAndInterest = currency.add(dividends, interest);
        this.cumulativeRealized = realizedGain;
    }

    @Field(type => [TransactionTypeSum])
    transactionSumsByType: TransactionTypeSum[];

    @Field(type => Float, { nullable: true })
    cumulativeRealized: number;

    @Field(type => Float, { nullable: true })
    dividendsAndInterest: number;

    @Field(type => Float, { nullable: true })
    units: number;
}
