import {
    CharityCurationSettings,
    TenantPasswordSettings,
    TenantPurposeNotesCategorySettings
} from './';
import { ObjectType, Field, Int, Float } from 'type-graphql';

@ObjectType()
export class TenantSettings {
    @Field(type => String, { nullable: false })
    tenantName: string;

    @Field(type => String, { nullable: true })
    tenantLegalName: string;

    @Field(type => Int, { nullable: false })
    contributionMinimum: number;

    @Field(type => Int, { nullable: false })
    grantMinimum: number;

    @Field(type => String, { nullable: false })
    fromEmail: string;

    @Field(type => Float, { nullable: true })
    specialApprovalThreshold: number;

    @Field(type => String, { nullable: false })
    email: string;

    @Field(type => TenantPasswordSettings, { nullable: false })
    password: TenantPasswordSettings;

    @Field(type => Number, { nullable: true })
    checkNumber: number;

    @Field(type => Number, { nullable: true })
    achNumber: number;

    @Field(type => Number, { nullable: true })
    wireNumber: number;

    @Field(type => [TenantPurposeNotesCategorySettings], { nullable: false })
    purposeCategories: TenantPurposeNotesCategorySettings[];

    @Field(type => [String], { nullable: false })
    specialRecognitionCategories: string[];

    @Field(type => CharityCurationSettings, { nullable: false })
    charityCurationSettings: CharityCurationSettings;

    @Field(type => [String])
    visualizationColors: string[];

    @Field(type => [String])
    investmentToEmail: string[];

    @Field(type => String, { nullable: false })
    ein: string;

    @Field(type => String, { nullable: false })
    bccEmail: string;
}
