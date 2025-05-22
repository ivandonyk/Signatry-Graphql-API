import { ObjectType, Field } from 'type-graphql';

@ObjectType()
export class BatchMetadata {
    @Field(type => Boolean, { nullable: true })
    notRequired: boolean;

    @Field(type => Boolean, { nullable: true })
    cleared: boolean;

    @Field(type => String, { nullable: true })
    clearedBy: string;

    @Field(type => Boolean, { nullable: true })
    posted: boolean;

    @Field(type => String, { nullable: true })
    postedBy: string;

    @Field(type => String, { nullable: true })
    postedOn: string;
}
