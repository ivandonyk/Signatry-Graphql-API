import { InputType, Field, ID } from 'type-graphql';
import { GuideStarSeal } from '../../models/Recipient';

export enum CharityFilterTag {
    FEATURED = 'featured',
    FAVORITE = 'favorite',
    PREAPPROVED = 'preapproved'
}

@InputType()
export class CharityFilter {
    @Field(type => String, { nullable: true })
    name: string;

    @Field(type => [String], { nullable: true })
    tags?: CharityFilterTag[];

    @Field(type => String, { nullable: true })
    cause?: string[];

    @Field(type => String, { nullable: true })
    location?: string[];

    @Field(type => String, { nullable: true })
    rating?: GuideStarSeal[];
}
