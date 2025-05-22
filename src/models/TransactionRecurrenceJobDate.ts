/**
 * @note used in vw_recurring_records_to_process
 * */

import { Field, Int, ObjectType } from 'type-graphql';
import { Column, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity()
@ObjectType()
export class TransactionRecurrenceJobDate {
    @PrimaryGeneratedColumn()
    @Field(type => Int)
    id: number;

    @Field()
    @Column({ nullable: false, comment: 'date recurrence cron job last ran on' })
    date: Date;

    @Field()
    @UpdateDateColumn({ nullable: false, default: () => 'CURRENT_TIMESTAMP' })
    updatedOn: Date;
}
