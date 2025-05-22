import { InputType, Field, ID } from 'type-graphql';

import { RecipientContactAddressInput } from '../RecipientContactAddress/RecipientContactAddressInput';
import { RecipientContactPhoneInput } from '../RecipientContactPhone/RecipientContactPhoneInput';
import { RecipientContactEmailInput } from '../RecipientContactEmail/RecipientContactEmailInput';

/**
 * @NOTE used in create and update operations, so not all fields are required
 * */

@InputType()
export class RecipientContactInput {
    @Field(type => ID, { nullable: true })
    id: string;

    @Field(type => ID, { nullable: true })
    recipientContactId: string;

    @Field(type => String, { nullable: true })
    name: string;

    @Field(type => RecipientContactEmailInput, { nullable: true })
    email: RecipientContactEmailInput;

    @Field(type => Boolean, { nullable: true })
    isGrantContact: boolean;

    @Field(type => RecipientContactAddressInput, { nullable: true })
    primaryAddress: RecipientContactAddressInput;

    @Field(type => RecipientContactPhoneInput, { nullable: true })
    primaryPhone: RecipientContactPhoneInput;

    @Field(type => RecipientContactAddressInput, { nullable: true })
    donationAddress: RecipientContactAddressInput;
}
