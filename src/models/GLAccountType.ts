import { Entity, Column, PrimaryGeneratedColumn, ManyToMany } from 'typeorm';
import { ObjectType, Field } from 'type-graphql';
import { GLAccount } from './GLAccount';

export enum GLAccountTypeName {
    PRIMARY = 'PRIMARY',
    CONTRIBUTION_REVENUE = 'CONTRIBUTION_REVENUE',
    CONTRIBUTION_REVENUE_NONCASH = 'CONTRIBUTION_REVENUE_NONCASH',
    POOL_PASSTHROUGH = 'POOL_PASSTHROUGH',
    INVESTMENT = 'INVESTMENT',
    GRANT_DISBURSEMENT = 'GRANT_DISBURSEMENT',
    GRANT_RECIPIENT = 'GRANT_RECIPIENT',
    CREDIT_CARD_FEES = 'CREDIT_CARD_FEES',
    ADMIN_FEE = 'ADMIN_FEE',
    SHARED_STOCK = 'SHARED_STOCK',
    SHARED_STOCK_HOLD = 'SHARED_STOCK_HOLD',
    SHARED_STOCK_VANGUARD = 'SHARED_STOCK_VANGUARD',
    INTEREST_INCOME = 'INTEREST_INCOME',
    DIVIDEND_INCOME = 'DIVIDEND_INCOME',
    UNREALIZED_GAIN_LOSS = 'UNREALIZED_GAIN_LOSS',
    REALIZED_GAIN_LOSS = 'REALIZED_GAIN_LOSS',
    UNITIZED_GAIN_LOSS = 'UNITIZED_GAIN_LOSS',
    ADVISOR_FEES = 'ADVISOR_FEES',
    BANK_FEES = 'BANK_FEES',
    SWEEP = 'SWEEP'
}

@Entity()
@ObjectType()
export class GLAccountType {
    // Id
    @PrimaryGeneratedColumn('uuid')
    @Field()
    id: string;

    @Column({
        type: 'character varying',
        nullable: false
    })
    @Field(type => String, { nullable: false })
    name: string;

    @Column({ nullable: false })
    label: string;

    @Column({ nullable: false })
    description: string;

    @ManyToMany(
        type => GLAccount,
        inverse => inverse.accountTypes
    )
    glAccounts: GLAccount[];
}
