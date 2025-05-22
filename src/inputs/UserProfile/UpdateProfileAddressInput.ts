import { InputType, Field } from 'type-graphql';

@InputType()
export class UpdateProfileAddressInput {
    @Field({ nullable: true })
    id: string;

    @Field()
    lineOne: string;

    @Field()
    lineTwo: string;

    @Field({ nullable: true })
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
