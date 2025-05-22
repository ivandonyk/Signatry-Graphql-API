import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    VersionColumn,
    OneToMany
} from 'typeorm';
import { ObjectType, Field } from 'type-graphql';

import { UserProfile } from './UserProfile';

export enum PositionTypeName {
    CUSTOMER_SUCCESS = 'Customer Success',
    SALES_MARKETING = 'Sales/Marketing',
    RELATIONSHIP_MANAGER = 'Relationship Manager',
    IMPLEMENTATION_SPECIALIST = 'Implementation Specialist',
    EXECUTIVE_SUPER = 'Executive/Super'
}

@Entity()
@ObjectType()
export class PositionType {
    // Id
    @PrimaryGeneratedColumn('uuid')
    @Field()
    id: string;

    @Column({
        type: 'character varying',
        nullable: false,
        enum: PositionTypeName,
        unique: false,
        default: () => undefined
    })
    @Field(type => String, { nullable: false })
    name: string;

    // Enabled
    @Column({
        type: 'boolean',
        nullable: false,
        enum: null,
        unique: false,
        default: () => true
    })
    @Field(type => Boolean, { nullable: false })
    enabled: boolean;

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

    // Fund Transactions
    @OneToMany(
        type => UserProfile,
        inverse => inverse.positionType
    )
    @Field(type => [UserProfile], { nullable: true })
    userProfiles: UserProfile[];
}
