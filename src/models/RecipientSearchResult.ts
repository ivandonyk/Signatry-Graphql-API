import { ObjectType, Field } from 'type-graphql';

@ObjectType()
export class RecipientSearchResult {
    @Field({ nullable: true })
    id: string;

    @Field({ nullable: true })
    recipientCode?: string;

    @Field()
    name: string;

    @Field()
    ein: string;

    @Field({ nullable: true })
    contactName: string;

    @Field()
    addressLineOne: string;

    @Field({ nullable: true })
    addressLineTwo?: string;

    @Field()
    city: string;

    @Field()
    state: string;

    @Field()
    zip: string;

    @Field({ nullable: true })
    phone: string;

    @Field({ nullable: true })
    website?: string;

    @Field({ nullable: true })
    npoStatus?: string;

    @Field({ nullable: true })
    ofac?: string;

    @Field()
    pub78?: boolean;

    @Field({ nullable: true })
    recipientStatus?: string;

    @Field({ nullable: true })
    primaryCause?: string;
}
