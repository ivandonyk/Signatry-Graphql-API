import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    VersionColumn,
    OneToOne,
    JoinColumn
} from 'typeorm';
import { ObjectType, Field } from 'type-graphql';
import { Tenant } from './Tenant';

@Entity({ name: 'byallaccounts_user' })
@ObjectType()
export class ByAllAccountsUser {
    // Id
    @PrimaryGeneratedColumn('uuid')
    @Field()
    id: string;

    @Column({
        type: 'character varying',
        nullable: false
    })
    @Field(type => String, { nullable: false })
    userId: string;

    @Column({
        type: 'character varying',
        nullable: false
    })
    @Field(type => String, { nullable: false })
    loginName: string;

    @Column({
        type: 'character varying',
        nullable: false
    })
    @Field(type => String, { nullable: false })
    loginPass: string;

    @Column({
        type: 'character varying',
        nullable: false
    })
    @Field(type => String, { nullable: false })
    firstName: string;

    @Column({
        type: 'character varying',
        nullable: false
    })
    @Field(type => String, { nullable: false })
    lastName: string;

    @Column({
        type: 'character varying',
        nullable: false
    })
    @Field(type => String, { nullable: false })
    email: string;

    @Column({
        type: 'character varying'
    })
    @Field(type => String, { nullable: true })
    financialProfileId: string;

    @Column({
        type: 'uuid',
        nullable: false
    })
    @Field(type => String, { nullable: false })
    tenantId: string;
}
