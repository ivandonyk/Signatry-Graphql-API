import { Field, ObjectType } from 'type-graphql';
import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';

import { BaseEntity } from '../entities/BaseEntity';
import { InstitutionAccount } from './InstitutionAccount';
import { InstitutionAccountTransaction } from './InstitutionAccountTransaction';
import { HoldingAssetClass, HoldingInterface } from './interfaces/Holding';
import { AccountProviderName, HasLinkedAccountData } from './ProviderAccountData';
import { Security } from './Security';
import { TenantAccount } from './TenantAccount';

@Entity()
@ObjectType({ implements: HoldingInterface })
export class Holding extends BaseEntity implements HoldingInterface, HasLinkedAccountData {
    @Column({
        type: 'character varying',
        nullable: false
    })
    @Field(type => String, { nullable: false })
    holdingId: string;

    @Column({
        type: 'character varying',
        nullable: false
    })
    @Field(type => String, { nullable: false })
    name: string;

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

    @Column({
        type: 'character varying',
        nullable: false
    })
    @Field(type => String, { nullable: true })
    assetClass: HoldingAssetClass;

    @Column({
        type: 'character varying',
        nullable: false
    })
    @Field(type => String, {
        nullable: true
    })
    assetSubclass: string;

    @ManyToOne(
        type => InstitutionAccount,
        inverse => inverse.holdings
    )
    @JoinColumn({ name: 'institution_account_id' })
    @Field(type => InstitutionAccount, { nullable: true })
    institutionAccount: InstitutionAccount;
    @Column({ nullable: true })
    @Field(type => String, { nullable: true })
    institutionAccountId: string;

    @JoinColumn({ name: 'tenant_account_id' })
    @Field(type => TenantAccount, { nullable: true })
    tenantAccount: TenantAccount;
    @Column({ nullable: true })
    @Field(type => String, { nullable: true })
    tenantAccountId: string;

    @Column({
        enum: AccountProviderName,
        type: 'character varying',
        nullable: false
    })
    @Field(type => String, { nullable: false })
    provider: AccountProviderName;

    @ManyToOne(
        type => Security,
        inverse => inverse.holdings
    )
    @JoinColumn({ name: 'security_id' })
    @Field(type => Security, { nullable: true })
    security: Security;
    @Column({ nullable: true })
    securityId: string;

    @OneToMany(
        type => InstitutionAccountTransaction,
        inverse => inverse.institutionAccount,
        { onDelete: 'CASCADE' }
    )
    @Field(type => [InstitutionAccountTransaction], { nullable: true })
    transactions: InstitutionAccountTransaction[];

    @Column({
        type: 'float',
        nullable: false
    })
    costBasis: number;

    @Column({
        type: 'float',
        nullable: false
    })
    cumulativeAverageCost: number;

    @Column({
        type: 'float',
        nullable: false
    })
    cumulativeUnrealized: number;

    @Column({
        type: 'float',
        nullable: false
    })
    cumulativeRealized: number;

    getId(): string {
        return this.holdingId;
    }

    getAssetClass(): HoldingAssetClass {
        return this.assetClass;
    }
}
