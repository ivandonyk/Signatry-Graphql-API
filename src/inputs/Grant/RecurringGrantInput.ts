import { InputType, Field, ID } from 'type-graphql';

export enum RecurringGrantRepeatIntervals {
    // Enum key name = 'User-friendly name'
    EVERY_OTHER_WEEK = 'Every-Other-Week',
    MONTHLY = 'Monthly',
    EVERY_OTHER_MONTH = 'Every-Other-Month',
    QUARTERLY = 'Quarterly',
    SEMI_ANNUALLY = 'Semi-Annually',
    ANNUALLY = 'Annually'
}

@InputType()
export class RecurringGrantInput {
    @Field()
    startOn: string;
    @Field()
    repeat: string;
    @Field({ nullable: true })
    ends: string; //  End date | if null then Never ends
    @Field({ nullable: true })
    numberOfRecurrences: number;
}
