import { Entity, Column, ManyToOne, JoinColumn, AfterLoad } from 'typeorm';
import { ObjectType, Field, Int, Float } from 'type-graphql';
import { FundInvestment } from './FundInvestment';
import { BaseEntity } from '../entities/BaseEntity';
import { HoldingInterface, HoldingAssetClass } from './interfaces/Holding';
import { Security } from '.';
import { currency } from '../utilities/currency';

@Entity()
@ObjectType({ implements: HoldingInterface })
export class PoolInvestmentHolding extends BaseEntity implements HoldingInterface {
    @Column({
        nullable: false
    })
    date: Date;

    @Column({
        nullable: false
    })
    priceAsOf: Date;

    @Column({
        type: 'float',
        nullable: false
    })
    marketValue: number;

    @Field((type) => Number)
    netValue: number;

    @Column({
        type: 'float',
        nullable: false
    })
    units: number;

    @Column({
        type: 'float',
        nullable: false
    })
    unitPrice: number;

    @ManyToOne(
        type => Security,
        inverse => inverse.poolInvestmentHoldings
    )
    @JoinColumn({ name: 'security_id' })
    @Field(type => Security, { nullable: true })
    security: Security;
    @Column({ nullable: true })
    @Field(type => String, { nullable: true })
    securityId: string;

    @ManyToOne(
        type => FundInvestment,
        inverse => inverse.poolHoldings
    )
    @JoinColumn({ name: 'fund_investment_id' })
    @Field(type => FundInvestment, { nullable: true })
    fundInvestment: FundInvestment;
    @Column({ nullable: true })
    @Field(type => String, { nullable: true })
    fundInvestmentId: string;

    assetClass: HoldingAssetClass;

    @Column({
        type: 'float',
        nullable: true
    })
    costBasis: number;

    @Column({
        type: 'float',
        nullable: true
    })
    cumulativeAverageCost: number;

    @Column({
        type: 'float',
        nullable: true
    })
    cumulativeUnrealized: number;

    @Column({
        type: 'float',
        nullable: true
    })
    cumulativeRealized: number;

    @Column({
        type: 'float',
        nullable: true
    })
    payable: number;

    @Column({
        type: 'float',
        nullable: true
    })
    receivable: number;

    getId(): string {
        return this.fundInvestmentId;
    }

    getAssetClass(): HoldingAssetClass {
        return HoldingAssetClass.POOL;
    }

    @AfterLoad()
    setNetValue() {
        this.netValue = currency.add(
            this.marketValue,
            currency.subtract(this.receivable ?? 0, this.payable ?? 0)
        );
    }
}
