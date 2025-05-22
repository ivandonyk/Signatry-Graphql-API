import { Field, Float, ObjectType } from 'type-graphql';
import { AfterLoad, Column, Entity, JoinColumn, ManyToOne, OneToOne } from 'typeorm';
import { BaseEntity } from '../entities/BaseEntity';
import { Batch } from './Batch';
import { GLAccountReconciliation } from './GLAccountReconciliation';
import { Holding } from './Holding';
import { InstitutionAccount } from './InstitutionAccount';
import {
    AccountProviderName,
    HasLinkedAccountData,
    ProviderAccountData
} from './ProviderAccountData';
import { TenantAccount } from './TenantAccount';
import { UserProfile } from './UserProfile';
import { TransactionDetailTypeName } from './TransactionDetailType';

export enum InstitutionAccountTransactionType {
    DEPOSIT = 'Deposit',
    DIRECT_DEPOSIT = 'Direct deposit',
    WITHDRAWAL = 'Withdrawal',
    DIVIDEND = 'Dividend',
    INTEREST = 'Interest',
    FEE = 'Fee',
    SELL = 'Sell',
    BUY = 'Buy',
    REINVESTMENT = 'Reinvestment',
    CREDIT = 'Credit',
    DEBIT = 'Debit',
    CHECK = 'Check',
    OTHER = 'Other',
    TRANSFER = 'Transfer',
    INCOME = 'Income',
    PAYMENT = 'Payment'
}

@Entity()
@ObjectType()
export class InstitutionAccountTransaction extends BaseEntity implements HasLinkedAccountData {
    @Column({
        type: 'character varying',
        nullable: false
    })
    @Field(type => String, { nullable: false })
    transactionId: string;

    @Column({
        type: 'float',
        nullable: false
    })
    @Field(type => Float, { nullable: false })
    amount: number;

    @Column({
        type: 'float',
        nullable: true
    })
    @Field(type => Float, { nullable: true })
    feeAmount: number;

    @Column({
        enum: InstitutionAccountTransactionType,
        type: 'character varying',
        nullable: false
    })
    @Field(type => String, { nullable: false })
    transactionType: InstitutionAccountTransactionType;

    @Column({
        type: 'character varying',
        nullable: true
    })
    @Field(type => String, { nullable: true })
    name: string;

    @Column({ nullable: true })
    @Field(type => Date, { nullable: true })
    postedOn: Date;

    @Column({
        nullable: true
    })
    @Field(type => Date, { nullable: false })
    executionDate: Date;

    @Column({
        type: 'float',
        nullable: true
    })
    @Field(type => Float, { nullable: true })
    units: number;

    @Column({
        type: 'float',
        nullable: true
    })
    @Field(type => Float, { nullable: true })
    unitPrice: number;

    @Column({
        type: 'float',
        nullable: true
    })
    @Field(type => Float, { nullable: true })
    costBasis: number;

    @Column({
        type: 'float',
        nullable: true
    })
    @Field(type => Float, { nullable: true })
    realizedGain: number;

    @Column({
        enum: AccountProviderName,
        type: 'character varying',
        nullable: false
    })
    @Field(type => String, { nullable: false })
    provider: AccountProviderName;

    @ManyToOne(
        type => InstitutionAccount,
        inverse => inverse.transactions
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

    @ManyToOne(
        type => Holding,
        inverse => inverse.transactions,
        { onDelete: 'CASCADE' }
    )
    @JoinColumn({ name: 'holding_id' })
    @Field(type => Holding, { nullable: true })
    holding: Holding;
    @Column({ nullable: true })
    holdingId: string;

    @ManyToOne(type => GLAccountReconciliation)
    @JoinColumn({ name: 'gl_account_reconciliation_id' })
    @Field(type => GLAccountReconciliation, { nullable: true })
    glAccountReconciliation: GLAccountReconciliation;
    @Column({ nullable: true })
    glAccountReconciliationId: string;

    @OneToOne(type => Batch, { eager: true })
    @JoinColumn({ name: 'batch_id' })
    @Field(type => Batch, { nullable: true })
    batch: Batch;
    @Column({ nullable: true })
    batchId: string;

    @Field(type => ProviderAccountData, { nullable: false })
    providerAccountData: ProviderAccountData;

    /**
     * ignored flag
     * refactor into enum column if we need more "status"
     * */
    @Column({ nullable: true, type: 'boolean', default: false })
    @Field(type => Boolean, { defaultValue: false })
    isIgnored: boolean;

    // transactionName, creationDate, flowAmount, flowUnits are newer fields and maybe null
    @Column({ type: 'character varying', nullable: false })
    @Field(type => String, { nullable: true })
    transactionName: string;

    @Column({ nullable: true, type: 'time without time zone' })
    @Field(type => Date, { nullable: true })
    creationDate: Date;

    @Column({ type: 'float', nullable: true })
    @Field(type => Float, { nullable: true })
    flowAmount: number;

    @Column({ type: 'float', nullable: true })
    @Field(type => Float, { nullable: true })
    flowUnits: number;

    @Field(type => Date, {
        nullable: false,
        description: 'virtual field to manage the dates in the BAA response'
    })
    date: Date;
    @AfterLoad()
    setDate() {
        this.date = this.getDate();
    }

    private getDate() {
        // normalize dates returned by BAA
        if (this.postedOn) return this.postedOn;
        else if (this.executionDate) return this.executionDate;
        return this.creationDate;
    }

    canBeMatchedWith(batch: Batch) {
        const transactionIsNotAlreadyMatched =
            this.glAccountReconciliationId === null || this.batchId === null;
        const sameGlAccountId = [batch.sourceGLAccountId, batch.destinationGLAccountId].includes(
            this.institutionAccount.glAccountId
        );
        const roundedTransactionAmount = Math.round(this.amount * 100) / 100;
        const roundedBatchAmount = Math.round(batch.amount * 100) / 100;
        let sameAmount = Math.abs(roundedBatchAmount) === Math.abs(roundedTransactionAmount);

        if (
            this.amount === 0 &&
            this.transactionType === InstitutionAccountTransactionType.TRANSFER
        ) {
            // If the transactions is a stock transfer, look for a batch with a
            // stock contribution that has the right number of units
            const stockInTransaction = batch.transactions.find(
                t => t.transactionDetailType.name === TransactionDetailTypeName.STOCK_IN
            );
            const transactionUnits =
                stockInTransaction?.fundTransaction.metadata?.paymentDetails?.units;
            if (!transactionUnits) {
                sameAmount = false;
            }
            sameAmount = stockInTransaction && parseFloat(transactionUnits) === this.units;
        }

        /** 
         * @note we no longer want a date constraint when determining match feasibility 
         const dateFormat = 'YYYYMMDD';
         const batchCreatedBeforeTransaction = formatDate(batch.createdOn, dateFormat) <= formatDate(this.getDate(), dateFormat);
         * */

        return transactionIsNotAlreadyMatched && sameGlAccountId && sameAmount;
    }

    matchWith(batch: Batch, user: UserProfile) {
        this.batchId = batch.id;
        this.batch = batch;
        batch.matchWith(this, user);
    }

    reconcileTo(reconciliation: GLAccountReconciliation, userProfile: UserProfile) {
        this.glAccountReconciliation = reconciliation;
        this.glAccountReconciliationId = reconciliation.id;
    }
}
