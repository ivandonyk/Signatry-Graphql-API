import { ObjectType, Field } from 'type-graphql';
import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    VersionColumn
} from 'typeorm';

export enum UserProfileEventNameValue {
    NOTIFICATION = 'NOTIFICATION'
}

@Entity()
@ObjectType()
export class UserProfileEvent {
    // Id
    @PrimaryGeneratedColumn('uuid')
    @Field()
    id: string;

    // Name
    @Column({
        type: 'character varying',
        nullable: false,
        enum: UserProfileEventNameValue,
        unique: false,
        default: () => undefined
    })
    @Field(type => String, { nullable: false })
    name: UserProfileEventNameValue;

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

    @VersionColumn({ default: 1 })
    @Field()
    version: number;

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

    @Column({ nullable: false })
    userProfileId: string;
}
