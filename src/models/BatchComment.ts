import { BaseEntity } from '../entities/BaseEntity';
import { Field, ObjectType } from 'type-graphql';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { Batch } from './Batch';
import { UserProfile } from './UserProfile';

@Entity()
@ObjectType()
export class BatchComment extends BaseEntity {
    @Column({
        type: 'text',
        nullable: false
    })
    @Field(type => String, { nullable: false })
    commentText: string;

    @ManyToOne(type => Batch)
    @JoinColumn({ name: 'batch_id' })
    @Field(type => Batch, { nullable: false })
    batch: Batch;
    @Column({ name: 'batch_id', nullable: false })
    batchId: string;

    @ManyToOne(type => UserProfile)
    @JoinColumn({ name: 'created_by' })
    @Field(type => UserProfile, { nullable: false })
    createdByProfile: UserProfile;
}
