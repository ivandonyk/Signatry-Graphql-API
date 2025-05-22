import { InputType, Field } from 'type-graphql';
import { AdminUpdateUserProfileInfo } from './AdminUpdateUserProfileInfo';
import { UpdateUserProfileAddressInput } from './UpdateUserProfileAddressInput';
import { UpdateUserProfileInfo } from './UpdateUserProfileInfo';

@InputType()
export class AdminCreateUserProfileInput {
    @Field(type => Boolean)
    invitation: boolean;

    @Field(type => String)
    username: string;

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

    @Field(type => String)
    role: string;

    @Field(type => String, { nullable: true })
    positionType: string;

    @Field(type => String, { nullable: true })
    profilePicture: string;

    @Field(type => String, { nullable: true })
    phone: string;

    @Field(type => String, { nullable: true })
    phoneType: string;

    @Field(type => String, { nullable: true })
    secondPhone: string;

    @Field(type => String, { nullable: true })
    secondPhoneType: string;

    @Field(type => String, { nullable: true })
    email: string;

    @Field(type => String, { nullable: true })
    secondEmail: string;

    @Field(type => UpdateUserProfileAddressInput, { nullable: true })
    address: UpdateUserProfileAddressInput;

    @Field(type => UpdateUserProfileAddressInput, { nullable: true })
    secondAddress: UpdateUserProfileAddressInput;

    @Field(type => String)
    primaryDeliveryMethod: string;
}
