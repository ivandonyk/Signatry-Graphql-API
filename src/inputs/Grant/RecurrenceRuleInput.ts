import { Field, InputType } from 'type-graphql';

@InputType()
export class RecurrenceRuleInput {
    @Field()
    rrule: string;
}
