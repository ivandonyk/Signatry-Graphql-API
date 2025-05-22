import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    ManyToOne,
    JoinColumn,
    OneToMany,
    OneToOne
} from 'typeorm';
import { ObjectType, Field, Float, Int } from 'type-graphql';
import { Fund, GLAccount, GLAccountReconciliationView } from '.';
import { BaseEntity } from '../entities/BaseEntity';
import { InstitutionAccountTransaction } from './InstitutionAccountTransaction';
import dayjs from 'dayjs';
import { isToday } from '../utilities/datetime';

@Entity()
@ObjectType()
export class GLAccountReconciliation extends BaseEntity {
    // Id
    @PrimaryGeneratedColumn('uuid')
    @Field()
    id: string;

    @ManyToOne(type => GLAccount)
    @JoinColumn({ name: 'gl_account_id' })
    @Field(type => GLAccount, { nullable: false })
    glAccount: GLAccount;
    @Column({ nullable: true })
    glAccountId: string;

    @Column({
        nullable: true
    })
    @Field(type => Date, { nullable: true })
    dateReconciled?: Date;

    @Column({
        nullable: true
    })
    @Field(type => Date, { nullable: true })
    datePreviousReconciled?: Date;

    @Column({
        type: 'float',
        nullable: false
    })
    @Field(type => Float, { nullable: false })
    balanceOpen: number;

    @Column({
        type: 'float',
        nullable: true
    })
    @Field(type => Float, { nullable: true })
    balanceClose?: number;

    @Column({ type: 'character varying', nullable: true })
    reconciledBy?: string;

    @Column({ nullable: true })
    @Field(type => Float, { nullable: true })
    startingBalance?: number;

    @Column({ nullable: true })
    @Field(type => Float, { nullable: true })
    endingBalance?: number;

    @Column({ nullable: true })
    @Field(type => Float, { nullable: true })
    changeInInvestmentValue?: number;

    @Column({ nullable: true })
    @Field(type => Float, { nullable: true })
    deposits?: number;

    @Column({ nullable: true })
    @Field(type => Float, { nullable: true })
    withdrawals?: number;

    @Column({ nullable: true })
    @Field(type => Float, { nullable: true })
    fees?: number;

    @Column({ nullable: true })
    @Field(type => Float, { nullable: true })
    dividends?: number;

    @Column({ nullable: true })
    @Field(type => Float, { nullable: true })
    interest?: number;

    @Column({ nullable: true })
    @Field(type => Float, { nullable: true })
    sells?: number;

    @Column({ nullable: true })
    @Field(type => Float, { nullable: true })
    sellsUnits?: number;

    @Column({ nullable: true })
    @Field(type => Float, { nullable: true })
    buys?: number;

    @Column({ nullable: true })
    @Field(type => Float, { nullable: true })
    buysUnits?: number;

    @Column({ nullable: true })
    @Field(type => Float, { nullable: true })
    stockTransfers?: number;

    @Column({ nullable: true })
    @Field(type => Float, { nullable: true })
    stockTransfersUnits?: number;

    @Field(type => Fund, { nullable: true })
    fund?: Fund;

    @OneToMany(
        type => InstitutionAccountTransaction,
        inverse => inverse.glAccountReconciliation
    )
    @Field(type => [InstitutionAccountTransaction], { nullable: false })
    transactions: InstitutionAccountTransaction[];

    @OneToOne(type => GLAccountReconciliationView)
    @Field(type => GLAccountReconciliationView, { nullable: false })
    glAccountReconciliationView: GLAccountReconciliationView;

    constructor(
        glAccount: GLAccount,
        datePreviousReconciled: Date,
        balanceOpen: number,
        fund?: Fund
    ) {
        super();
        this.glAccount = glAccount;
        this.datePreviousReconciled = datePreviousReconciled;
        this.balanceOpen = balanceOpen;
        this.fund = fund;
    }

    reconcile(date: Date, transactionAmount: number, reconciledBy: string) {
        const balanceClose = this.balanceOpen + transactionAmount;

        const dateReconciled = isToday(date)
            ? date
            : dayjs(date)
                  .endOf('day')
                  .toDate();

        this.dateReconciled = dateReconciled;
        this.balanceClose = balanceClose;
        this.reconciledBy = reconciledBy;

        return new GLAccountReconciliation(this.glAccount, dateReconciled, balanceClose, this.fund);
    }
}
