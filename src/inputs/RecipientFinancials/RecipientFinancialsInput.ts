import { InputType, Field, ID, Int, Float } from 'type-graphql';
import { UpdateRecipientInput } from '../Recipient/UpdateRecipientInput';

@InputType()
export class RecipientFinancialsInput {
    @Field(type => ID, { nullable: true })
    id: string;

    @Field(type => UpdateRecipientInput, { nullable: true })
    recipient: UpdateRecipientInput;

    @Field(type => Int, { nullable: true })
    mostRecentFinancialsYear: number;

    @Field(type => Float, { nullable: true })
    totalRevenue: number;

    @Field(type => Float, { nullable: true })
    totalAssets: number;

    @Field(type => Float, { nullable: true })
    totalExpenses: number;

    @Field(type => String, { nullable: true })
    irsFilingsLink: string;

    @Field(type => String, { nullable: true })
    fullFinancialReportLink: string;
}
