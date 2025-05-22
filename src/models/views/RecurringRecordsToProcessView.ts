import { Field, Int } from 'type-graphql';
import { ViewColumn, ViewEntity } from 'typeorm';

@ViewEntity({ name: 'vw_recurring_records_to_process' })
export class RecurringRecordsToProcessView {
    @ViewColumn()
    @Field(type => String, { nullable: false })
    id: string;

    @ViewColumn()
    @Field(type => String, { nullable: false })
    transactionType: string;

    @ViewColumn()
    @Field(type => Date, { nullable: false })
    nextScheduledDate: Date | string;

    @ViewColumn()
    @Field(type => Date, { nullable: false, description: 'parsed from rrule' })
    startDate: Date | string;

    @ViewColumn()
    @Field(type => Date, { nullable: false, description: 'parsed from rrule' })
    endDate: Date | string;

    @ViewColumn()
    @Field(type => Int, { nullable: false, description: 'parsed from rrule' })
    recurrenceCount: number;

    @ViewColumn()
    @Field(type => String, { nullable: false, description: 'series-level code' })
    transactionCode: string;

    @ViewColumn()
    @Field(type => Int, {
        nullable: false,
        description: 'number of fund_transaction - transaction_recurrence FKs'
    })
    transactionCount: number;
}
