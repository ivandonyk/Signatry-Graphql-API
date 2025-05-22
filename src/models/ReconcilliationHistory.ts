import { BaseEntity } from '../entities/BaseEntity';
import { Field, Float, Int, ObjectType } from 'type-graphql';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { UserProfile } from './UserProfile';
import { GLAccountReconciliation } from '.';

export enum ReconciliationHistoryAction {
    RECONCILIATION = 'RECONCILIATION',
    POST = 'POST'
}

@Entity()
@ObjectType()
export class ReconciliationHistory extends BaseEntity {
    @ManyToOne(type => GLAccountReconciliation)
    @JoinColumn({ name: 'gl_account_reconciliation_id' })
    @Field(type => GLAccountReconciliation, { nullable: false })
    glAccountReconciliation: GLAccountReconciliation;
    @Column({ name: 'gl_account_reconciliation_id', nullable: false })
    glAccountReconciliationId: string;

    @Column({ name: 'gl_account_id', nullable: false })
    glAccountId: string;

    @ManyToOne(type => UserProfile)
    @JoinColumn({ name: 'created_by' })
    @Field(type => UserProfile, { nullable: false })
    createdByProfile: UserProfile;

    @Column({ enum: ReconciliationHistoryAction })
    @Field(type => String, { nullable: false })
    action: ReconciliationHistoryAction;

    @Column({
        type: 'integer',
        nullable: false
    })
    @Field(type => Int, { nullable: false })
    transactionCount: number;

    @Column({
        type: 'float',
        nullable: false
    })
    @Field(type => Float, { nullable: false })
    totalAmount: number;
}
