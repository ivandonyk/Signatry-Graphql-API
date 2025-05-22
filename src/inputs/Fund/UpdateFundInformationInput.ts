import { InputType, Field } from 'type-graphql';
import { CreateFundAddressInput } from './CreateFundAddressInput';

@InputType()
export class UpdateFundInformationInput {
    @Field(type => String)
    fundId: string;

    @Field(type => String)
    fundName: string;

    @Field(type => String, { nullable: true })
    fundPhoto: string;

    @Field(type => String, { nullable: true })
    mission: string;

    @Field(type => String, { nullable: true })
    fundType: string;

    @Field(type => String, { nullable: true })
    primaryAccountHolderId: string;

    @Field(type => CreateFundAddressInput, { nullable: true })
    fundAddress: CreateFundAddressInput;

    @Field(type => Boolean)
    divestmentFallback: boolean;
}
