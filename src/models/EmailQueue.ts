import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn
} from 'typeorm';
import { ObjectType, Field } from 'type-graphql';
@Entity()
@ObjectType()
export class EmailQueue {
    @PrimaryGeneratedColumn('uuid')
    @Field()
    id: string;

    @CreateDateColumn({ default: () => 'CURRENT_TIMESTAMP' })
    @Field()
    createdOn: Date;

    @UpdateDateColumn({ default: () => 'CURRENT_TIMESTAMP' })
    @Field()
    updatedOn: Date;

    @Column({
        type: 'date',
        nullable: true,
        enum: null,
        unique: false,
        default: () => null
    })
    @Field(type => Date, { nullable: true })
    sentOn: Date;

    @Column({
        type: 'date',
        nullable: true,
        enum: null,
        unique: false,
        default: () => null
    })
    @Field(type => Date, { nullable: true })
    teamNotifiedOn: Date;

    @Column({
        type: 'character varying',
        nullable: false,
        enum: null,
        unique: false,
        default: () => undefined
    })
    @Field(type => String, { nullable: false })
    to: string;

    @Column({
        type: 'character varying',
        nullable: false,
        enum: null,
        unique: false,
        default: () => undefined
    })
    @Field(type => String, { nullable: false })
    from: string;

    @Column({
        type: 'character varying',
        nullable: false,
        enum: null,
        unique: false,
        default: () => undefined
    })
    @Field(type => String, { nullable: false })
    bcc: string;

    @Column({
        type: 'date',
        nullable: true,
        enum: null,
        unique: false,
        default: () => null
    })
    @Field(type => Date, { nullable: true })
    lastTriedOn: Date;

    @Column({
        type: 'character varying',
        nullable: true,
        enum: null,
        unique: false,
        default: () => undefined
    })
    @Field(type => String, { nullable: true })
    subject: string;

    @Column({
        type: 'character varying',
        nullable: true,
        enum: null,
        unique: false,
        default: () => undefined
    })
    @Field(type => String, { nullable: true })
    bodyText: string;

    @Column({
        type: 'character varying',
        nullable: true,
        enum: null,
        unique: false,
        default: () => undefined
    })
    @Field(type => String, { nullable: true })
    bodyHtml: string;
}
