import { UserProfile } from './UserProfile';
import { ObjectType, Field } from 'type-graphql';
import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    VersionColumn,
    ManyToOne
} from 'typeorm';
import { Recipient } from '.';

@Entity()
@ObjectType()
export class RecipientComment {
    // Id
    @PrimaryGeneratedColumn('uuid')
    @Field()
    id: string;

    // Created On
    @CreateDateColumn({ default: () => 'CURRENT_TIMESTAMP' })
    @Field()
    createdOn: Date;

    // Created By
    @Column({
        type: 'character varying',
        nullable: false,
        enum: null,
        unique: false,
        default: () => undefined
    })
    createdBy: string;

    // Updated On
    @UpdateDateColumn({ default: () => 'CURRENT_TIMESTAMP' })
    @Field()
    updatedOn: Date;

    // Updated By
    @Column({
        type: 'character varying',
        nullable: false,
        enum: null,
        unique: false,
        default: () => undefined
    })
    updatedBy: string;

    // Version
    @VersionColumn({ default: 1 })
    @Field()
    version: number;

    // Recipient Id
    @Column({ nullable: false })
    recipientId: string;

    @ManyToOne(
        type => Recipient,
        inverse => inverse.recipientComments
    )
    @Field(type => Recipient, { nullable: false })
    recipient: Recipient;

    // Comment Author
    @Field(type => UserProfile, { nullable: false })
    author: UserProfile;

    // Comment
    @Column({
        type: 'character varying'
    })
    @Field(type => String, { nullable: false })
    comment: string;
}
