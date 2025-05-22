import { RecipientPreferredPaymentMeta } from './RecipientPreferredPaymentMeta';
import { PaymentTypeValue } from './Recipient';
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
export class RecipientPreferredPayment {
    // Id
    @PrimaryGeneratedColumn('uuid')
    @Field()
    id: string;

    // Recipient ID
    @ManyToOne(
        type => Recipient,
        inverse => inverse.recipientPreferredPayments
    )
    @Field(type => Recipient, { nullable: false })
    recipient: Recipient;
    @Column({ nullable: false })
    recipientId: string;

    @Column({
        type: 'character varying',
        nullable: true,
        enum: PaymentTypeValue,
        unique: false,
        default: () => undefined
    })
    @Field(type => String, { nullable: true })
    paymentType: string;

    // JSONB column to keep track of payment changes
    @Column({
        type: 'jsonb',
        nullable: false,
        enum: null,
        unique: false,
        default: () => undefined
    })
    @Field(type => RecipientPreferredPaymentMeta, {
        nullable: false
    })
    metadata: RecipientPreferredPaymentMeta;

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
}
