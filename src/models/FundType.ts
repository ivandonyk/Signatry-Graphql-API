import { Fund } from './Fund';
import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    VersionColumn,
    OneToMany
} from 'typeorm';
import { ObjectType, Field, Int, Float } from 'type-graphql';

export enum FundTypeName {
    DONOR_ADVISED_FUND = 'Donor Advised Fund',
    POOL_SUBLEDGER = 'Pool Subledger',
    CHARITY_FUND = 'Charity Fund',
    DESIGNATED_FUND = 'Designated Fund',
    SPECIAL_PURPOSE_FUND = 'Special Purpose Fund'
}

@Entity()
@ObjectType()
export class FundType {
    @PrimaryGeneratedColumn('uuid')
    @Field()
    id: string;

    @CreateDateColumn({ default: () => 'CURRENT_TIMESTAMP' })
    @Field()
    createdOn: Date;

    @UpdateDateColumn({ default: () => 'CURRENT_TIMESTAMP' })
    @Field()
    updatedOn: Date;

    @VersionColumn({ default: 1 })
    @Field()
    version: number;

    @Column({
        type: 'character varying',
        nullable: false,
        enum: null,
        unique: false,
        default: () => undefined
    })
    @Field(type => String, { nullable: false })
    name: string;

    @Column({
        type: 'character varying',
        nullable: false,
        enum: null,
        unique: false,
        default: () => undefined
    })
    @Field(type => String, { nullable: false })
    description: string;

    @Column({
        type: 'int',
        nullable: false,
        enum: null,
        unique: false,
        default: () => undefined
    })
    @Field(type => Int, { nullable: false })
    orderNum: number;

    @Column({
        type: 'boolean',
        nullable: false,
        enum: null,
        unique: false,
        default: () => undefined
    })
    @Field(type => Boolean, { nullable: false })
    enabled: boolean;

    @OneToMany(
        type => Fund,
        inverse => inverse.fundType
    )
    @Field(type => [Fund], { nullable: false })
    funds: Fund[];
}
