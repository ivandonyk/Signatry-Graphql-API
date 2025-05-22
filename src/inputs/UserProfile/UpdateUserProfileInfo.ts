import { InputType, Field } from 'type-graphql';
import { UpdateProfileEmailInput } from './UpdateProfileEmailInput';
import { UpdateProfilePhoneInput } from './UpdateProfilePhoneInput';
import { UpdateProfileAddressInput } from './UpdateProfileAddressInput';
@InputType()
export class UpdateUserProfileInfo {
    @Field(type => String)
    userProfileId: string;

    @Field(type => String)
    firstName: string;

    @Field(type => String, { nullable: true })
    middleName: string;

    @Field(type => String)
    lastName: string;

    @Field(type => String, { nullable: true })
    prefix: string;

    @Field(type => String, { nullable: true })
    suffix: string;

    @Field(type => String, { nullable: true })
    photo: string;

    @Field(type => [UpdateProfilePhoneInput], { nullable: true })
    phones: UpdateProfilePhoneInput[];

    @Field(type => [UpdateProfileEmailInput], { nullable: true })
    emails: UpdateProfileEmailInput[];

    @Field(type => [UpdateProfileAddressInput], { nullable: true })
    addresses: UpdateProfileAddressInput[];

    @Field(type => String, { nullable: true })
    primaryDeliveryMethod: string;
}
