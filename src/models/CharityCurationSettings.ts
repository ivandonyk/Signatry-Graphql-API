import { ObjectType, Field, registerEnumType } from 'type-graphql';

export enum CurationInterval {
    'seconds',
    'minutes',
    'hours',
    'months',
    'years'
}

registerEnumType(CurationInterval, {
    name: 'CurationInterval'
});

@ObjectType()
export class CharityCurationSettings {
    @Field(type => CurationInterval, { nullable: false })
    trendingCauseInterval: CurationInterval;

    @Field(type => CurationInterval, { nullable: false })
    recentlyApprovedInterval: CurationInterval;

    @Field(type => CurationInterval, { nullable: false })
    recentGrantCountInterval: CurationInterval;
}
