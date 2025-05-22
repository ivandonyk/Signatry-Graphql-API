import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    OneToMany,
    ManyToOne
} from 'typeorm';

import { ObjectType, Field } from 'type-graphql';
import { Role } from './Role';
import { PendingFundUser } from '.';

@Entity()
@ObjectType()
export class Invitation {
    // Id
    @PrimaryGeneratedColumn('uuid')
    @Field()
    id: string;

    // invitation code
    @Column({
        type: 'uuid',
        nullable: false,
        enum: null,
        unique: true,
        default: () => 'uuid_generate_v4()'
    })
    code: string;

    // email
    @Column({
        type: 'character varying',
        nullable: false,
        enum: null,
        unique: false,
        default: () => undefined
    })
    email: string;

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

    // Role
    @ManyToOne(
        type => Role,
        inverse => inverse.invitations
    )
    @Field(type => Role, { nullable: false })
    role: Role;
    @Column({ nullable: false })
    roleId: string;

    // Pending Fund User
    @ManyToOne(
        type => PendingFundUser,
        inverse => inverse.invitations
    )
    @Field(type => Role, { nullable: true })
    pendingFundUser: PendingFundUser;
    @Column({ nullable: true })
    pendingFundUserId: string;
}
