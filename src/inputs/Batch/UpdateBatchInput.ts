import { InputType, Field, ID } from 'type-graphql';

@InputType()
export class UpdateBatchInput {
    @Field(type => ID, { nullable: false })
    batchId: string;

    @Field(type => Boolean, { nullable: true })
    cleared?: boolean;
}
