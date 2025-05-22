import { ObjectType, Field, createUnionType } from 'type-graphql';

// Client-relevant fields on the Stripe paymentMethods.ICardPaymentMethod interface that the client needs (majority are proxied from the Stripe API, as opposed to sourced from the database)
@ObjectType()
export class UIStripeCard {
    // Stripe PaymentMethod.id
    @Field()
    paymentMethodId: string;

    @Field()
    brand:
        | string
        | 'Visa'
        | 'American Express'
        | 'MasterCard'
        | 'Discover'
        | 'JCB'
        | 'Diners Club'
        | 'Unknown';

    @Field()
    expMonth: number;

    @Field()
    expYear: number;

    @Field()
    last4: string;

    @Field(() => String, { nullable: false })
    userProfileAccountId: string;

    @Field(() => Boolean, { nullable: false })
    isPrimary: boolean;
}

@ObjectType()
export class UIPlaidBalances {
    @Field({ nullable: true })
    current: number;

    @Field({ nullable: true })
    available: number;
}

// Client-relevant fields on BOTH the Plaid Account and Plaid Institution interfaces that the client needs (majority are proxied from the Plaid API, as opposed to sourced from the database)
@ObjectType()
export class UIPlaidBankAccount {
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

    @Field(() => UIPlaidBalances, { nullable: false })
    balances: UIPlaidBalances;

    @Field(() => String, { nullable: false })
    userProfileAccountId: string;

    @Field(() => Boolean, { nullable: false })
    isPrimary: boolean;
}

// This object type returned when `ITEM_LOGIN_REQUIRED` error occurs
@ObjectType()
export class ExpiredUIPlaidBankAccount {
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
    userProfileAccountId: string;

    @Field(() => Boolean, { nullable: false })
    isPrimary: boolean;
}

export const UIFundingSourceUnion = createUnionType({
    name: 'UIFundingSource',
    types: () => [UIStripeCard, UIPlaidBankAccount, ExpiredUIPlaidBankAccount],
    resolveType: value => {
        if ('accessToken' in value) {
            return ExpiredUIPlaidBankAccount;
        }
        if ('brand' in value && 'expMonth' in value && 'expYear' in value && 'last4' in value) {
            return UIStripeCard;
        }
        if (
            'accountName' in value &&
            'accountOfficialName' in value &&
            'type' in value &&
            'subtype' in value &&
            'mask' in value
        ) {
            return UIPlaidBankAccount;
        }
        return undefined;
    }
});
