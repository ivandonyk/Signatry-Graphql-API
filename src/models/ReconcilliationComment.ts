import { BaseEntity } from '../entities/BaseEntity';
import { Field, ObjectType } from 'type-graphql';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { UserProfile } from './UserProfile';
import { GLAccountReconciliation } from '.';

@Entity()
@ObjectType()
export class ReconciliationComment extends BaseEntity {
    @Column({
        type: 'text',
        nullable: false
    })
    @Field(type => String, { nullable: false })
    commentText: string;

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
}
