import { ObjectType, Field, createUnionType } from 'type-graphql';

@ObjectType()
export class UITenantPlaidBankAccount {
    // Plaid.Account.name (API returns string | null)
    @Field(() => String, { nullable: true })
    accountName: string | null;

    // Plaid.Account.official_name (API returns string | null)
    @Field(() => String, { nullable: true })
    accountOfficialName: string | null;

    // Plaid.Account.type (API returns string | null)
    @Field(() => String, { nullable: true })
    type: string | null;

    // Plaid.Account.subtype (API returns string | null)
    @Field(() => String, { nullable: true })
    subtype: string | null;

    // Plaid.Account.mask (API returns string | null)
    @Field(() => String, { nullable: true })
    mask: string | null;

    // Plaid.Institution.name (API returns string | null)
    @Field(() => String, { nullable: true })
    institutionName: string | null;

    // Plaid.Institution.logo (Base64 string encoding of the institution's logo image; API returns string | null)
    @Field(() => String, { nullable: true })
    institutionLogo: string | null;

    // Plaid.Institution.primary_color (hexadecimal color string; API returns string | null)
    @Field(() => String, { nullable: true })
    institutionColor: string | null;

    @Field(() => String, { nullable: false })
    tenantAccountId: string;
}

@ObjectType()
export class ExpiredUITenantPlaidBankAccount {
    @Field(() => String, { nullable: false })
    accessToken: string;

    // Plaid.Institution.name (API returns string | null)
    @Field(() => String, { nullable: true })
    institutionName: string | null;

    // Plaid.Institution.logo (Base64 string encoding of the institution's logo image; API returns string | null)
    @Field(() => String, { nullable: true })
    institutionLogo: string | null;

    // Plaid.Institution.primary_color (hexadecimal color string; API returns string | null)
    @Field(() => String, { nullable: true })
    institutionColor: string | null;

    @Field(() => String, { nullable: false })
    tenantAccountId: string;
}

export const UITenantAccountUnion = createUnionType({
    name: 'UITenantFundingSource',
    types: () => [UITenantPlaidBankAccount, ExpiredUITenantPlaidBankAccount],
    resolveType: value => {
        if ('accessToken' in value) {
            return ExpiredUITenantPlaidBankAccount;
        }
        if (
            'accountName' in value &&
            'accountOfficialName' in value &&
            'type' in value &&
            'subtype' in value &&
            'mask' in value
        ) {
            return UITenantPlaidBankAccount;
        }
        return undefined;
    }
});
