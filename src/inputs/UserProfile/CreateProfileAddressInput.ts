import { InputType, Field } from 'type-graphql';

@InputType()
export class CreateProfileAddressInput {
    @Field()
    lineOne: string;

    @Field()
    lineTwo: string;

    @Field()
    lineThree: string;

    @Field()
    city: string;

    @Field()
    state: string;

    @Field()
    postalCode: string;

    @Field()
    country: string;

    @Field()
    isPrimary: boolean;
}
