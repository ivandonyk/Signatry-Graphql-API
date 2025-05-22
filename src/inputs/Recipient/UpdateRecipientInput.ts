import { InputType, Field, ID, registerEnumType, Float } from 'type-graphql';

import { RecipientStatusName } from '../../models/RecipientStatus';
import { RecipientContactInput } from '../RecipientContact/RecipientContactInput';
import { UpdateRecipientBoardOfDirectorsMemberInput } from '../RecipientBoardOfDirectorsMember/UpdateRecipientBoardOfDirectorsMemberInput';
import { RecipientCauseInput } from '../RecipientCause/RecipientCauseInput';
import { RecipientFinancialsInput } from '../RecipientFinancials/RecipientFinancialsInput';
import { PaymentTypeValue } from '../../models/Recipient';

registerEnumType(RecipientStatusName, {
    name: 'RecipientStatusName',
    description: 'An enum defining the available options for recipient statuses'
});

@InputType()
export class UpdateRecipientInput {
    @Field(type => ID, { nullable: false })
    id: string;

    @Field(type => String, { nullable: true })
    name: string;

    @Field(type => String, { nullable: true })
    description: string;

    @Field(type => String, { nullable: true })
    alsoKnownAs: string;

    @Field(type => RecipientStatusName, { nullable: true })
    recipientStatus: RecipientStatusName;

    @Field(type => PaymentTypeValue, { nullable: true })
    paymentType: PaymentTypeValue;

    @Field(type => [String], { nullable: true })
    keywords: string[];

    @Field(type => [String], { nullable: true })
    socialMediaLinks: string[];

    @Field(type => Float, { nullable: true })
    numberOfEmployees: number;

    @Field(type => String, { nullable: true })
    guideStarPublicProfileLink: string;

    @Field(type => String, { nullable: true })
    ein: string;

    @Field(type => String, { nullable: true })
    website: string;

    @Field(type => String, { nullable: true })
    logo: string;

    @Field(type => [UpdateRecipientBoardOfDirectorsMemberInput], { nullable: true })
    boardOfDirectors: UpdateRecipientBoardOfDirectorsMemberInput[];

    @Field(type => RecipientFinancialsInput, { nullable: true })
    financials: RecipientFinancialsInput;

    @Field(type => RecipientContactInput, { nullable: true })
    contact: RecipientContactInput;

    @Field(type => RecipientCauseInput, { nullable: true })
    causes: RecipientCauseInput[];

    @Field(type => String, { nullable: true })
    foundationCode: string;

    @Field(type => String, { nullable: true })
    bmfOrganizationName: string;

    @Field(type => Boolean, { nullable: true })
    pub78: boolean;

    @Field(type => String, { nullable: true })
    npoStatus: string;
}
