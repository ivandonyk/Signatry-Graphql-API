import { Fund } from './Fund';
import { Investment } from './Investment';
import { FundTransactionDetail } from './FundTransactionDetail';
import { PoolInvestmentHolding } from './PoolInvestmentHolding';
import { InvestmentHoldingResult } from './InvestmentHoldingResult';
import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    VersionColumn,
    OneToMany,
    ManyToOne
} from 'typeorm';
import { ObjectType, Field, Int, Float } from 'type-graphql';

@Entity()
@ObjectType()
export class FundInvestment {
    @PrimaryGeneratedColumn('uuid')
    @Field()
    id: string;

    @CreateDateColumn({ default: () => 'CURRENT_TIMESTAMP' })
    @Field()
    createdOn: Date;

    @UpdateDateColumn({ default: () => 'CURRENT_TIMESTAMP' })
    @Field()
    updatedOn: Date;

    // Created By
    @Column({ type: 'character varying' })
    createdBy: string;

    // Updated By
    @Column({ type: 'character varying' })
    updatedBy: string;

    @VersionColumn({ default: 1 })
    @Field()
    version: number;

    @Column({
        type: 'float',
        nullable: false,
        enum: null,
        unique: false,
        default: () => undefined
    })
    @Field(type => Float, { nullable: false })
    allocationPercentage: number;

    @Column({
        type: 'float',
        nullable: false,
        enum: null,
        unique: false,
        default: () => undefined
    })
    @Field(type => Float, { nullable: false })
    divestmentPercentage: number;

    // Units
    @Column({
        type: 'float',
        nullable: false,
        default: () => 0
    })
    @Field(type => Float, {
        nullable: true,
        defaultValue: 0
    })
    units: number;

    @OneToMany(
        type => FundTransactionDetail,
        inverse => inverse.fundInvestment
    )
    @Field(type => [FundTransactionDetail], { nullable: false })
    transactionDetails: FundTransactionDetail[];

    @ManyToOne(
        type => Fund,
        inverse => inverse.investments
    )
    @Field(type => Fund, { nullable: false })
    fund: Fund;
    @Column({ nullable: false })
    fundId: string;

    @ManyToOne(
        type => Investment,
        inverse => inverse.fundAllocations
    )
    @Field(type => Investment, { nullable: false })
    investment: Investment;
    @Column({ nullable: false })
    investmentId: string;

    @OneToMany(
        type => PoolInvestmentHolding,
        inverse => inverse.fundInvestment
    )
    @Field(type => [PoolInvestmentHolding], { nullable: true })
    poolHoldings: PoolInvestmentHolding[];

    @Field(type => [InvestmentHoldingResult], { nullable: false })
    currentInvestmentHoldings: InvestmentHoldingResult[];
}
