import { Field, Float, Int, ObjectType } from 'type-graphql';
import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    OneToMany,
    OneToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
    VersionColumn
} from 'typeorm';

import { Fund } from './Fund';
import { FundInvestment } from './FundInvestment';
import { GLAccount } from './GLAccount';
import { InstitutionAccount } from './InstitutionAccount';
import { InvestmentUnitPriceHistory } from './InvestmentUnitPriceHistory';

export enum InvestmentType {
    POOL = 'POOL',
    IMA = 'IMA',
    GRANT_CASH = 'GRANT_CASH',
    CONTRIBUTION_CASH = 'CONTRIBUTION_CASH',
    SHARED_STOCK = 'SHARED_STOCK',
    SHARED_STOCK_HOLD = 'SHARED_STOCK_HOLD',
    SHARED_STOCK_VANGUARD = 'SHARED_STOCK_VANGUARD'
}

@Entity()
@ObjectType()
export class Investment {
    @PrimaryGeneratedColumn('uuid')
    @Field()
    id: string;

    @CreateDateColumn({ default: () => 'CURRENT_TIMESTAMP' })
    @Field()
    createdOn: Date;

    @UpdateDateColumn({ default: () => 'CURRENT_TIMESTAMP' })
    @Field()
    updatedOn: Date;

    @VersionColumn({ default: 1 })
    @Field()
    version: number;

    @Column({
        type: 'boolean',
        nullable: false,
        enum: null,
        unique: false,
        default: () => true
    })
    @Field(type => Boolean, { nullable: false })
    enabled: boolean;

    @Column({
        type: 'character varying',
        nullable: false,
        enum: null,
        unique: false,
        default: () => undefined
    })
    @Field(type => String, { nullable: false })
    name: string;

    @Column({
        type: 'character varying',
        nullable: true,
        enum: null,
        unique: false,
        default: () => undefined
    })
    @Field(type => String, { nullable: true })
    description: string;

    @Column({
        type: 'float',
        nullable: false,
        enum: null,
        unique: false,
        default: () => undefined
    })
    @Field(type => Float, { nullable: false })
    defaultAllocationPercentage: number;

    @Column({
        type: 'float',
        nullable: false,
        enum: null,
        unique: false,
        default: () => undefined
    })
    @Field(type => Float, { nullable: false })
    defaultDivestmentPercentage: number;

    @Column({
        type: 'float',
        nullable: true,
        enum: null,
        unique: false,
        default: () => undefined
    })
    @Field(type => Float, { nullable: true })
    closePrice: number;

    @Column({
        type: 'timestamp',
        nullable: true,
        enum: null,
        unique: false,
        default: () => undefined
    })
    @Field(type => Date, { nullable: true })
    closePriceAsOf: Date;

    @Column({
        type: 'character varying',
        nullable: true,
        enum: null,
        unique: false,
        default: () => undefined
    })
    @Field(type => String, { nullable: true })
    tickerSymbol: string;

    @Column({
        type: 'int',
        nullable: false,
        enum: null,
        unique: false,
        default: () => undefined
    })
    @Field(type => Int, { nullable: false })
    orderNum: number;

    @OneToOne(type => GLAccount)
    @JoinColumn({ name: 'gl_account_id' })
    glAccount: GLAccount;
    @Column({ type: 'character varying', nullable: true })
    @Field(type => String, { nullable: true })
    glAccountId: string;

    @OneToOne(
        type => InstitutionAccount,
        inverse => inverse.investment
    )
    @JoinColumn({ name: 'institution_account_id' })
    @Field(type => InstitutionAccount, { nullable: true })
    institutionAccount: InstitutionAccount;
    @Column({ nullable: false })
    institutionAccountId: string;

    // Created By
    @Column({
        type: 'character varying',
        nullable: false,
        enum: null,
        unique: false,
        default: () => undefined
    })
    createdBy: string;

    // Updated By
    @Column({
        type: 'character varying',
        nullable: false,
        enum: null,
        unique: false,
        default: () => undefined
    })
    updatedBy: string;

    @OneToMany(
        type => FundInvestment,
        inverse => inverse.investment
    )
    @Field(type => [FundInvestment], { nullable: false })
    fundAllocations: FundInvestment[];

    @OneToMany(
        type => InvestmentUnitPriceHistory,
        inverse => inverse.investment
    )
    @Field(type => [InvestmentUnitPriceHistory], { nullable: false })
    unitPriceHistory: InvestmentUnitPriceHistory[];

    @Column({ type: 'enum', enum: InvestmentType })
    @Field(type => String)
    investmentType: InvestmentType;

    @Column({ type: 'float' })
    @Field(type => Float, { nullable: true })
    marketValue: number;

    @Column({ type: 'timestamp' })
    @Field(type => Date, { nullable: true })
    marketValueAsOf: Date;

    @Column({ type: 'float' })
    @Field(type => Float, { nullable: true })
    totalUnits: number;

    @Column({ type: 'character varying', nullable: false })
    @Field()
    visualizationColor: string;

    @OneToOne(type => Fund)
    @JoinColumn({ name: 'subledger_fund_id' })
    @Field(type => Fund, { nullable: true })
    subledgerFund: Fund;
    @Column({ nullable: false })
    subledgerFundId: string;
}
