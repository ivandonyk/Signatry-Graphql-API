import { Field, Float, ObjectType } from 'type-graphql';
import { currency } from '../utilities/currency';
import { HoldingAssetClass, HoldingInterface } from './interfaces/Holding';
import { InstitutionAccountTransactionType } from './InstitutionAccountTransaction';
import { InstitutionAccountTransactionSummary } from './InstitutionAccountTransactionSummary';

@ObjectType()
class HoldingChange {
    constructor(startHolding?: HoldingInterface, endHolding?: HoldingInterface) {
        this.startHolding = startHolding;
        this.endHolding = endHolding;
        const startValue = startHolding ? startHolding.marketValue : 0;
        const endValue = endHolding ? endHolding.marketValue : 0;
        this.allChange = currency.subtract(endValue, startValue);
        const isCash =
            (endHolding && endHolding.getAssetClass() == HoldingAssetClass.CASH) ||
            (startHolding && startHolding.getAssetClass() == HoldingAssetClass.CASH);
        this.changeInSecurities = isCash ? 0 : this.allChange;
    }

    @Field(type => HoldingInterface, { nullable: true })
    startHolding?: HoldingInterface;

    @Field(type => HoldingInterface, { nullable: true })
    endHolding?: HoldingInterface;

    @Field(type => Float)
    allChange: number;

    @Field(type => Float)
    changeInSecurities: number;
}

@ObjectType()
export class HoldingChangeSummary {
    constructor(
        startHoldings: HoldingInterface[],
        endHoldings: HoldingInterface[],
        transactionSummary?: InstitutionAccountTransactionSummary,
        units?: number
    ) {
        this.startHoldings = startHoldings;
        this.endHoldings = endHoldings;
        this.cumulativeUnrealized = 0;
        this.units = units;

        this.holdingChanges = this.processHoldings(startHoldings, endHoldings);
        this.allChange = this.getAllChange(this.holdingChanges);
        this.openingBalance = this.sumHoldings(this.startHoldings);
        this.closingBalance = this.sumHoldings(this.endHoldings);
        this.changeInSecurities = this.getChangeInSecurities(
            this.holdingChanges,
            transactionSummary
        );
    }

    @Field(type => [HoldingInterface])
    startHoldings: HoldingInterface[];

    @Field(type => [HoldingInterface])
    endHoldings: HoldingInterface[];

    @Field(type => [HoldingChange])
    holdingChanges: HoldingChange[];

    @Field(type => Float, { nullable: true })
    cumulativeUnrealized: number;

    @Field(type => Float)
    allChange: number;

    @Field(type => Float)
    openingBalance: number;

    @Field(type => Float)
    closingBalance: number;

    @Field(type => Float)
    changeInSecurities: number;

    @Field(type => Float)
    changeInSecuritiesAfterTransactions: number;

    @Field(type => Float, { nullable: true })
    units: number;

    /**
     * match the holdings from start date and end date, keyed by holdingId
     */
    private processHoldings(
        startHoldings: HoldingInterface[],
        endHoldings: HoldingInterface[]
    ): HoldingChange[] {
        const holdingsById: {
            [holdingId: string]: { startHolding?: HoldingInterface; endHolding?: HoldingInterface };
        } = {};
        // START HOLDINGS
        for (const startHolding of startHoldings) {
            holdingsById[startHolding.getId()] = { startHolding: startHolding, endHolding: null };
        }

        // MATCH END HOLDINGS TO START BY ID
        for (const endHolding of endHoldings) {
            if (!holdingsById.hasOwnProperty(endHolding.getId())) {
                holdingsById[endHolding.getId()] = { startHolding: null };
            }
            holdingsById[endHolding.getId()]['endHolding'] = endHolding;
            this.cumulativeUnrealized = currency.add(
                this.cumulativeUnrealized || 0,
                endHolding.cumulativeUnrealized || 0
            );
        }

        const changes = Object.keys(holdingsById).map(holdingId => {
            const { startHolding, endHolding } = holdingsById[holdingId];
            return new HoldingChange(startHolding, endHolding);
        });

        return changes;
    }

    private getAllChange(holdingChanges: HoldingChange[]): number {
        return holdingChanges.reduce((sum, change) => currency.add(sum, change.allChange, 4), 0);
    }

    private sumHoldings(holdings: HoldingInterface[]): number {
        return holdings.reduce((sum, holding) => currency.add(sum, holding.marketValue, 4), 0);
    }

    /**
     * @returns {number} sum of `changeInSecurities`
     */
    private getChangeInSecurities(
        holdingChanges: HoldingChange[],
        transactionSummary?: InstitutionAccountTransactionSummary
    ): number {
        let result = holdingChanges.reduce(
            (sum, change) => currency.add(sum, change.changeInSecurities, 4),
            0
        );
        if (transactionSummary) {
            const buys = transactionSummary.transactionSumsByType.find(
                sum => sum.transactionType === InstitutionAccountTransactionType.BUY
            ).valueSum;
            const sells = transactionSummary.transactionSumsByType.find(
                sum => sum.transactionType === InstitutionAccountTransactionType.SELL
            ).valueSum;
            const total = currency.add(buys, sells, 4);
            result = currency.add(result, total, 4);
        }
        return result;
    }
}
