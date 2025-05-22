import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    OneToOne,
    ManyToMany,
    JoinTable,
    AfterLoad
} from 'typeorm';
import { ObjectType, Field } from 'type-graphql';

import { TenantAccount } from './TenantAccount';
import { GLAccountType } from './GLAccountType';
import { InstitutionAccount } from './InstitutionAccount';
import { Investment } from './Investment';
import { ProviderAccountData } from './ProviderAccountData';

@Entity()
@ObjectType()
export class GLAccount {
    // Id
    @PrimaryGeneratedColumn('uuid')
    @Field()
    id: string;

    @Column({
        type: 'character varying',
        nullable: false
    })
    @Field(type => String, { nullable: false })
    accountNumber: string;

    @Column({
        type: 'character varying',
        nullable: false
    })
    @Field(type => String, { nullable: false })
    title: string;

    @Column({ nullable: false })
    tenantId: string;

    @OneToOne(
        type => TenantAccount,
        inverse => inverse.glAccount
    )
    tenantAccount: TenantAccount;

    @ManyToMany(
        type => GLAccountType,
        inverse => inverse.glAccounts
    )
    @JoinTable({ name: 'gl_account_account_type' })
    accountTypes: GLAccountType[];

    @OneToOne(
        type => InstitutionAccount,
        inverse => inverse.glAccount
    )
    @Field(type => InstitutionAccount, { nullable: true })
    institutionAccount: InstitutionAccount;

    @OneToOne(
        type => Investment,
        inverse => inverse.glAccount
    )
    @Field(type => Investment, { nullable: true })
    investment: Investment;

    @Field(type => ProviderAccountData, { nullable: false })
    providerAccountData: ProviderAccountData;

    @AfterLoad()
    nullCheck() {
        if (!this.accountTypes) {
            this.accountTypes = [];
        }
    }
}
