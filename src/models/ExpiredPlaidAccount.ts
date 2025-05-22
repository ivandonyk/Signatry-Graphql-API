import { ObjectType, Field } from 'type-graphql';

@ObjectType()
export class ExpiredPlaidAccount {
    @Field(type => String, { nullable: false })
    accountId: string;

    @Field(type => String, {
        nullable: false,
        description:
            'In the event of a ITEM_LOGIN_ERROR in which the user must re-authenticate with the institution, resolves the accessToken to launch PlaidLink for this institution in Update Mode'
    })
    accessToken: string;

    @Field(type => String, {
        nullable: false,
        description:
            'In the event of a ITEM_LOGIN_ERROR in which the user must re-authenticate with the institution, resolves the institutionId so that the user can know which institution needs to be updated.'
    })
    institutionId: string;
}
