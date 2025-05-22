import { ObjectType, Field } from 'type-graphql';

@ObjectType()
export class RecipientSocialMediaLinks {
    @Field(() => String, { nullable: true })
    facebook: string | null;

    @Field(() => String, { nullable: true })
    twitter: string | null;

    @Field(() => String, { nullable: true })
    instagram: string | null;
}
