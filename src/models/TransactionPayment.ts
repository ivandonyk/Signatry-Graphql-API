import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    VersionColumn
} from 'typeorm';
import { ObjectType, Field, Float } from 'type-graphql';
import { BaseEntity } from '../entities/BaseEntity';

@Entity()
@ObjectType()
export class TransactionPayment extends BaseEntity {
    // Id
    @PrimaryGeneratedColumn('uuid')
    @Field()
    id: string;

    @Column({
        nullable: true
    })
    @Field(type => Date, { nullable: true })
    date: Date;

    @Column({
        type: 'character varying',
        nullable: false
    })
    @Field(type => String, { nullable: false })
    type: string;

    @Column({
        type: 'integer',
        nullable: false
    })
    @Field(type => Float, { nullable: false })
    count: number;

    @Column({
        type: 'float',
        nullable: false
    })
    @Field(type => Float, { nullable: false })
    amount: number;

    @Column({
        nullable: true
    })
    @Field(type => String, { nullable: true })
    sourceAccount: string;

    @Column({
        nullable: true
    })
    @Field(type => String, { nullable: true })
    fileName: string;

    @Column({
        type: 'boolean',
        nullable: false
    })
    @Field(type => Boolean, { nullable: false })
    complete: boolean;

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
}
