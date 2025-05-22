import { UserProfile } from './UserProfile';
import { Investment } from './Investment';
import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    VersionColumn,
    ManyToOne,
    JoinColumn
} from 'typeorm';
import { ObjectType, Field, Int, Float } from 'type-graphql';

@Entity()
@ObjectType()
export class InvestmentUnitPriceHistory {
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
        type: 'boolean',
        nullable: false,
        enum: null,
        unique: false,
        default: () => true
    })
    @Field(type => Boolean, { nullable: false })
    enabled: boolean;

    @Column({
        type: 'float',
        nullable: false,
        enum: null,
        unique: false,
        default: () => undefined
    })
    @Field(type => Float, { nullable: false })
    closePrice: number;

    @Column({
        type: 'timestamp',
        nullable: true,
        enum: null,
        unique: false,
        default: () => 'CURRENT_TIMESTAMP'
    })
    @Field(type => Date, { nullable: true })
    closePriceAsOf: Date;

    @Column({
        type: 'float',
        nullable: true,
        enum: null,
        unique: false,
        default: () => undefined
    })
    @Field(type => Float, { nullable: true })
    previousPrice: number;

    @Column({ nullable: true })
    @Field(type => Float, { nullable: true })
    totalUnits: number;

    // Created By
    @Column({
        type: 'character varying',
        nullable: false,
        enum: null,
        unique: false,
        default: () => undefined
    })
    createdBy: string;

    // Updated By
    @Column({
        type: 'character varying',
        nullable: false,
        enum: null,
        unique: false,
        default: () => undefined
    })
    updatedBy: string;

    @ManyToOne(
        type => UserProfile,
        inverse => inverse.createdInvestmentUnitPriceHistory
    )
    @JoinColumn({
        name: 'created_by'
    })
    @Field(type => UserProfile, { nullable: true })
    createdByUserProfile: UserProfile;

    @ManyToOne(
        type => Investment,
        inverse => inverse.unitPriceHistory
    )
    @Field(type => Investment, { nullable: false })
    investment: Investment;
    @Column({ nullable: false })
    investmentId: string;
}
