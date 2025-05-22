import { PlaidAccount } from './PlaidAccount';
import { Tenant } from './Tenant';
import { UserProfile } from './UserProfile';
import { ExpiredPlaidAccount } from './ExpiredPlaidAccount';
import { GLAccount } from './GLAccount';
import { InstitutionAccountTransaction } from './InstitutionAccountTransaction';
import { Holding } from './Holding';
import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    VersionColumn,
    OneToOne,
    ManyToOne,
    OneToMany,
    ManyToMany,
    JoinTable,
    JoinColumn
} from 'typeorm';
import { BaseEntity } from '../entities/BaseEntity';
import { ObjectType, Field } from 'type-graphql';

@Entity()
@ObjectType()
export class TenantAccount extends BaseEntity {
    @Column({
        type: 'character varying',
        nullable: false,
        enum: null,
        unique: false,
        default: () => undefined
    })
    @Field(type => String, { nullable: false })
    accessToken: string;

    @Column({
        type: 'character varying',
        nullable: true,
        enum: null,
        unique: false,
        default: () => undefined
    })
    @Field(type => String, { nullable: true })
    accountId: string;

    @Column({
        type: 'character varying',
        nullable: false,
        enum: null,
        unique: false,
        default: () => undefined
    })
    @Field(type => String, { nullable: false })
    institutionId: string;

    @Column({
        type: 'character varying',
        nullable: false,
        enum: null,
        unique: false,
        default: () => undefined
    })
    @Field(type => String, { nullable: false })
    itemId: string;

    @Column({
        type: 'character varying',
        nullable: true
    })
    @Field(type => String, { nullable: false })
    name: string;

    @Column({
        type: 'character varying',
        nullable: true
    })
    @Field(type => String, { nullable: false })
    mask: string;

    @Column({
        type: 'character varying',
        nullable: true
    })
    @Field(type => String, { nullable: false })
    institutionName: string;

    @Field(type => PlaidAccount, { nullable: true })
    account: PlaidAccount;

    @Field(type => [PlaidAccount], { nullable: true })
    accounts: PlaidAccount[];

    @Field(type => ExpiredPlaidAccount, { nullable: true })
    expiredAccount: ExpiredPlaidAccount;

    @ManyToOne(
        type => Tenant,
        inverse => inverse.tenantAccounts
    )
    tenant: Tenant;
    @Column({ nullable: false })
    tenantId: string;

    @OneToOne(
        type => GLAccount,
        inverse => inverse.tenantAccount
    )
    @JoinColumn({ name: 'gl_account_id' })
    @Field(type => GLAccount, { nullable: true })
    glAccount: GLAccount;
    @Column({ nullable: true })
    glAccountId: string;

    @OneToMany(
        type => InstitutionAccountTransaction,
        inverse => inverse.institutionAccount
    )
    @Field(type => [InstitutionAccountTransaction], { nullable: true })
    transactions: InstitutionAccountTransaction[];

    @OneToMany(
        type => Holding,
        inverse => inverse.institutionAccount
    )
    @Field(type => [Holding], { nullable: true })
    holdings: Holding[];
}
