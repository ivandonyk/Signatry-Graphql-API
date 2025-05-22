import { ObjectType, Field } from 'type-graphql';

@ObjectType()
export class Document {
    @Field(type => String)
    url: string;

    @Field(type => String)
    fileName: string;

    @Field(type => String)
    createdOn: string;

    // if no `type` display as other
    @Field(type => String, { nullable: true })
    type: string;
}

@ObjectType()
export class ReturnDocument {
    // user document types
    @Field(type => [Document], { nullable: true })
    donorStatement: Document[];

    // fund document types
    @Field(type => [Document], { nullable: true })
    fundStatement: Document[];

    @Field(type => [Document], { nullable: true })
    fundApplication: Document[];

    @Field(type => [Document], { nullable: true })
    investmentStatement: Document[];

    @Field(type => [Document], { nullable: true })
    successionPlan: Document[];

    @Field(type => [Document], { nullable: true })
    contributionLetter: Document[];

    @Field(type => [Document], { nullable: true })
    grantLetter: Document[];

    // shared document types
    @Field(type => [Document], { nullable: true })
    other: Document[];
}
