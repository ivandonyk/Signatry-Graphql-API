import { ObjectType, Field, Float } from 'type-graphql';
import { GraphQLContext } from '../context';
import { TenantAccount } from './TenantAccount';
import { InstitutionAccount } from './InstitutionAccount';
import { GLAccount } from './GLAccount';

export enum AccountProviderName {
    BAA = 'BAA',
    PLAID = 'PLAID',
    MANUAL = 'MANUAL'
}
export interface HasLinkedAccountData {
    provider: AccountProviderName;
    institutionAccount?: InstitutionAccount;
    institutionAccountId?: string;
    tenantAccount?: TenantAccount;
    tenantAccountId?: string;
}

@ObjectType()
export class ProviderAccountData {
    constructor(custodianName: string, accountNumber: string, displayName: string) {
        this.custodianName = custodianName;
        this.accountNumber = accountNumber;
        this.displayName = displayName;
    }

    @Field(type => String, { nullable: true })
    custodianName: string;

    @Field(type => String, { nullable: true })
    accountNumber: string;

    @Field(type => String, { nullable: true })
    displayName: string;

    static async getProviderAccountData(
        context: GraphQLContext,
        model: HasLinkedAccountData
    ): Promise<ProviderAccountData> {
        if (model.provider === AccountProviderName.BAA) {
            let instAccount = model.institutionAccount;
            if (!instAccount) {
                instAccount = await context.typeorm
                    .getRepository(InstitutionAccount)
                    .findOne(
                        { id: model.institutionAccountId, isSweepAccount: false },
                        { order: { accountId: 'DESC' } }
                    );
            }
            const displayName = instAccount.displayName
                ? instAccount.displayName
                : instAccount.name;
            return new ProviderAccountData(
                instAccount.custodianName,
                instAccount.accountNumber,
                displayName
            );
        } else if (model.provider === AccountProviderName.PLAID) {
            let tenantAccount = model.tenantAccount;
            if (!tenantAccount) {
                tenantAccount = await context.typeorm
                    .getRepository(TenantAccount)
                    .findOne({ id: model.tenantAccountId });
            }
            return new ProviderAccountData(
                tenantAccount.institutionName,
                tenantAccount.mask,
                tenantAccount.name
            );
        }
    }

    static async getProviderAccountDataForGLAccount(
        context: GraphQLContext,
        glAccount: GLAccount
    ): Promise<ProviderAccountData> {
        const instAccount = await context.typeorm
            .getRepository(InstitutionAccount)
            .findOne(
                { glAccountId: glAccount.id, isSweepAccount: false },
                { order: { accountId: 'DESC' } }
            );

        if (instAccount) {
            const displayName = instAccount.displayName
                ? instAccount.displayName
                : instAccount.name;

            return new ProviderAccountData(
                instAccount.custodianName,
                instAccount.accountNumber,
                displayName
            );
        }

        const tenantAccount = await context.typeorm
            .getRepository(TenantAccount)
            .findOne({ glAccountId: glAccount.id });
        if (tenantAccount) {
            return new ProviderAccountData(
                tenantAccount.institutionName,
                tenantAccount.mask,
                tenantAccount.name
            );
        }
        // Return blank data if no associated account is found
        return new ProviderAccountData('Not found', 'Not found', 'Not found');
    }
}
