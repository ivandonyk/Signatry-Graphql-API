import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    VersionColumn,
    OneToOne,
    OneToMany,
    ManyToMany,
    JoinColumn,
    JoinTable,
    AfterLoad,
    ManyToOne
} from 'typeorm';
import { ObjectType, Field, Float } from 'type-graphql';

import { Investment } from './Investment';
import { Holding } from './Holding';
import { GLAccount } from './GLAccount';
import { InstitutionAccountTransaction } from './InstitutionAccountTransaction';
import { FinancialAdvisor } from './FinancialAdvisor';

@Entity()
@ObjectType()
export class InstitutionAccount {
    // Id
    @PrimaryGeneratedColumn('uuid')
    @Field()
    id: string;

    @Column({
        type: 'character varying',
        nullable: false
    })
    @Field(type => String, { nullable: false })
    accountId: string;

    @Column({
        type: 'character varying',
        nullable: false
    })
    @Field(type => String, { nullable: false })
    routingNumber: string;

    @Column({
        type: 'character varying',
        nullable: false
    })
    @Field(type => String, { nullable: false })
    name: string;

    @Column({
        type: 'character varying',
        nullable: false
    })
    @Field(type => String, { nullable: false })
    accountNumber: string;

    @Column({
        type: 'float',
        nullable: false
    })
    @Field(type => Float, {
        nullable: true
    })
    marketValue: number;

    @Column({
        type: 'character varying',
        nullable: false
    })
    @Field(type => String, { nullable: false })
    financialProfileId: string;

    @Column({
        type: 'character varying',
        nullable: false
    })
    @Field(type => String, { nullable: false })
    accountType: string;

    @Column({
        nullable: false
    })
    @Field(type => Date, { nullable: true })
    lastUpdated: Date;

    @Column({
        type: 'character varying',
        nullable: false
    })
    @Field(type => String, { nullable: false })
    custodianName: string;

    @Column({
        type: 'character varying',
        nullable: false
    })
    @Field(type => String, { nullable: false })
    displayName: string;

    @Column({
        type: 'character varying',
        nullable: false
    })
    @Field(type => String, { nullable: false })
    addressLine1: string;

    @Column({
        type: 'character varying',
        nullable: false
    })
    @Field(type => String, { nullable: false })
    addressLine2: string;

    @Column({
        type: 'character varying',
        nullable: false
    })
    @Field(type => String, { nullable: false })
    addressCity: string;

    @Column({
        type: 'character varying',
        nullable: false
    })
    @Field(type => String, { nullable: false })
    addressZip: string;

    @Column({
        type: 'character varying',
        nullable: false
    })
    @Field(type => String, { nullable: false })
    addressState: string;

    @OneToOne(
        type => Investment,
        inverse => inverse.institutionAccount
    )
    @Field(type => Investment, { nullable: true })
    investment: Investment;

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
        default: () => false
    })
    @Field(type => Boolean, { nullable: false })
    isSweepAccount: boolean;

    @Column({
        type: 'boolean',
        nullable: false,
        enum: null,
        unique: false,
        default: () => false
    })
    @Field(type => Boolean, { nullable: false })
    isManual: boolean;

    @Column({
        type: 'boolean',
        nullable: false,
        enum: null,
        unique: false,
        default: () => true
    })
    @Field(type => Boolean, { nullable: false })
    enabled: boolean;

    @Field(type => Boolean, { nullable: false })
    hasFundInvestment: boolean;

    @OneToMany(
        type => Holding,
        inverse => inverse.institutionAccount
    )
    @Field(type => [Holding], { nullable: true })
    holdings: Holding[];

    @Column({
        type: 'boolean',
        nullable: false,
        enum: null,
        unique: false,
        default: () => false
    })
    @Field(type => Boolean, { nullable: false })
    updateError: boolean; // whether the last update from BAA was successful

    @Column({
        type: 'character varying',
        nullable: false
    })
    @Field(type => String, { nullable: false })
    email: string;

    @Column({ type: 'character varying', nullable: true })
    @Field(type => String, { nullable: true })
    displayAccountNumber: string;

    @Column({ type: 'character varying', nullable: true })
    @Field(type => String, { nullable: true })
    url: string;

    // Joins
    @OneToOne(
        type => GLAccount,
        inverse => inverse.institutionAccount
    )
    @JoinColumn({ name: 'gl_account_id' })
    @Field(type => GLAccount, { nullable: true })
    glAccount: GLAccount;
    @Column({ nullable: true })
    glAccountId: string;

    @ManyToOne(
        type => InstitutionAccount,
        inverse => inverse.sweepAccounts
    )
    @Field(type => InstitutionAccount, { nullable: true })
    institutionAccount: InstitutionAccount;
    @Column({ nullable: true })
    institutionAccountId: string;

    @OneToMany(
        type => InstitutionAccount,
        inverse => inverse.institutionAccount
    )
    @Field(type => [InstitutionAccount], { nullable: true })
    sweepAccounts: InstitutionAccount[];

    @OneToMany(
        type => InstitutionAccountTransaction,
        inverse => inverse.institutionAccount
    )
    @Field(type => [InstitutionAccountTransaction], { nullable: true })
    transactions: InstitutionAccountTransaction[];

    @ManyToMany(
        type => FinancialAdvisor,
        inverse => inverse.institutionAccounts
    )
    @JoinTable({ name: 'institution_account_financial_advisor' })
    @Field(type => [FinancialAdvisor], { nullable: true })
    financialAdvisors: FinancialAdvisor[];

    // events
    @AfterLoad()
    decodeDisplayName() {
        if (this.custodianName) {
            this.custodianName = this.custodianName.replace(/&amp;amp;/g, '&');
        }
    }

    @AfterLoad()
    nullCheck() {
        if (!this.financialAdvisors) {
            this.financialAdvisors = [];
        }
    }
}
