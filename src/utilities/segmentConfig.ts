import Analytics from 'analytics-node';
import { EntityManager } from 'typeorm';

import { filterRecurrencesByStatus } from '../graphql/filterRecurrencesByStatus';
import { RecurrenceStatuses } from '../graphql/transactionRecurrence.resolver';
import { Fund, Recipient, UserProfile, UserProfileAccount } from '../models';
import { TransactionTypeValue } from '../models/TransactionType';
import { UserProfileAccountTypes } from '../models/UserProfileAccount';
import StorageClient from '../storage/client';

export enum SegmentEvent {
    ACCOUNT_VERIFIED = 'Account verified',
    FUND_ADDED = 'Fund added',
    PAYMENT_METHOD_ADDED = 'Payment method added',
    CONTRIBUTION_ADDED = 'Contribution added',
    ADDED_ACCOUNT_HOLDER = 'Added account holder',
    REQUESTED_REBALANCE = 'Requested rebalance',
    SAVED_DIVESTMENT_ALLOCATIONS = 'Saved divestment allocations',
    SAVED_INVESTMENT_ALLOCATIONS = 'Saved investment allocations',
    GRANT_RECOMMENDED = 'Grant recommended',
    CONTRIBUTION_MADE = 'Contribution made',
    RECURRING_CONTRIBUTION_ADDED = 'Recurring contribution added',
    RECURRING_GRANT_ADDED = 'Recurring grant added'
}

export enum AccountTypes {
    CREDIT_CARD = 'credit card',
    BANK_ACCOUNT = 'bank account'
}

export enum ContributionTypes {
    ONE_TIME = 'one time',
    RECURRING = 'recurring'
}

const getProfile = async (manager: EntityManager, userProfileId) => {
    return await manager
        .getRepository(UserProfile)
        .createQueryBuilder('userProfile')
        .leftJoinAndSelect('userProfile.appUser', 'appUser')
        .leftJoinAndSelect('userProfile.emails', 'emails')
        .where('userProfile.id = :id', { id: userProfileId })
        .getOne();
};
export const segmentClient = new Analytics(`${process.env.REACT_APP_SEGMENT_NODE_KEY}`, {
    flushAt: Number(process.env.REACT_APP_SEGMENT_FLUSH_AT),
    flushInterval: Number(process.env.REACT_APP_SEGMENT_FLUSH_INTERVAL)
});

export const newAccountAdded = async (
    manager: EntityManager,
    userProfileId: string,
    accountType: AccountTypes
) => {
    const profile = await getProfile(manager, userProfileId);
    const repo = manager.getRepository(UserProfileAccount);

    const creditCardCount = await repo.count({
        userProfileId: userProfileId,
        accountType: UserProfileAccountTypes.CREDIT_CARD
    });
    const bankAccountCount = await repo.count({
        userProfileId: userProfileId,
        accountType: UserProfileAccountTypes.BANK_ACCOUNT
    });

    const email = profile.appUser
        ? profile.appUser.emailAddress
        : profile.emails.find(e => e.isPrimary);

    segmentClient.identify({
        userId: userProfileId,
        traits: {
            name: profile.fullName,
            email: email,
            username: profile.appUser?.username || null,
            credit_card_accounts_linked: creditCardCount,
            bank_accounts_linked: bankAccountCount
        }
    });

    segmentClient.track({
        userId: userProfileId,
        event: SegmentEvent.PAYMENT_METHOD_ADDED,
        properties: {
            payment_method_type: accountType
        }
    });
};

export const trackNewSignUp = async (manager: EntityManager, userProfileId: string) => {
    const profile = await getProfile(manager, userProfileId);

    segmentClient.identify({
        userId: userProfileId,
        traits: {
            name: profile.fullName,
            email: profile.appUser.emailAddress,
            username: profile.appUser.username
        }
    });
};

export const trackUserAddAccountHolder = (
    userProfileId: string,
    fundId: string,
    fundName: string
) => {
    segmentClient.track({
        userId: userProfileId,
        event: SegmentEvent.ADDED_ACCOUNT_HOLDER,
        properties: {
            fund_id: fundId,
            fund_name: fundName
        }
    });
};

export const trackRebalanceRequested = (
    userProfileId: string,
    fundId: string,
    fundName: string
) => {
    segmentClient.track({
        userId: userProfileId,
        event: SegmentEvent.REQUESTED_REBALANCE,
        properties: {
            fund_id: fundId,
            fund_name: fundName
        }
    });
};

export const trackDivestmentInstructionsUpdated = (
    userProfileId: string,
    fundId: string,
    fundName: string
) => {
    segmentClient.track({
        userId: userProfileId,
        event: SegmentEvent.SAVED_DIVESTMENT_ALLOCATIONS,
        properties: {
            fund_id: fundId,
            fund_name: fundName
        }
    });
};

export const trackInvestmentInstructionsUpdated = (
    userProfileId: string,
    fundId: string,
    fundName: string
) => {
    segmentClient.track({
        userId: userProfileId,
        event: SegmentEvent.SAVED_INVESTMENT_ALLOCATIONS,
        properties: {
            fund_id: fundId,
            fund_name: fundName
        }
    });
};

export const trackGrantCreated = async (
    manager: EntityManager,
    userProfileId: string,
    fund: Fund,
    recipientId: string,
    grantType: SegmentEvent
) => {
    const recipientRepo = manager.getRepository(Recipient);
    const recipient = await recipientRepo.findOne({ id: recipientId });
    segmentClient.track({
        userId: userProfileId,
        event: grantType,
        properties: {
            fund_name: fund.name,
            fund_id: fund.fundCode,
            recipient_id: recipient.recipientCode,
            recipient_name: recipient.name
        }
    });
};

export const trackSingleContributionCreated = async (
    userProfileId: string,
    fundName: string,
    fundCode: string,
    accountType: UserProfileAccountTypes | null,
    contributionType: ContributionTypes,
    amount: number
) => {
    segmentClient.track({
        userId: userProfileId,
        event: SegmentEvent.CONTRIBUTION_MADE,
        properties: {
            fund_name: fundName,
            fund_id: fundCode,
            payment_method_type: accountType,
            contribution_type: contributionType,
            amount
        }
    });
};

export const trackRecurringContributionCreated = async (
    userProfileId: string,
    fundName: string,
    fundCode: string,
    accountType: UserProfileAccountTypes | null
) => {
    segmentClient.track({
        userId: userProfileId,
        event: SegmentEvent.RECURRING_CONTRIBUTION_ADDED,
        properties: {
            fund_name: fundName,
            fund_id: fundCode,
            payment_method_type: accountType
        }
    });
};

export const largeIdentify = async (manager: EntityManager, userProfileId: string) => {
    const profile = await getProfile(manager, userProfileId);

    const client = new StorageClient();
    // const userDocuments = await client.getDocuments('users', profile.userCode);
    const userDocuments = await client.getDocuments('users', '0145');

    let hasSuccessionPlan = false;

    if (userDocuments && userDocuments.length > 0) {
        for (const doc of userDocuments) {
            if (doc.type === 'successionPlan') {
                hasSuccessionPlan = true;
                break;
            }
        }
    }

    const funds = await manager.query(/* sql */ `
        SELECT fund.id
        FROM fund
        LEFT JOIN fund_user_profile
            ON fund_user_profile.fund_id = fund.id
        WHERE fund_user_profile.user_profile_id = '${profile.id}';
    `);

    const [{ count: otherFundUsers }] = !funds.length
        ? [{ count: 0 }]
        : await manager.query(/* sql */ `
        SELECT COUNT(*)
        FROM fund_user_profile
        LEFT JOIN fund
            ON fund.id = fund_user_profile.fund_id
        WHERE fund.id IN (${funds.map(fund => `'${fund.id}'`).join(', ')})
        AND fund_user_profile.user_profile_id != '${profile.id}';
    `);

    const [{ count: hasImaCount }] = !funds.length
        ? [{ count: 0 }]
        : await manager.query(/* sql */ `
        SELECT COUNT(*)
        FROM fund_investment
        LEFT JOIN investment
            ON investment.id = fund_investment.investment_id
        WHERE investment.investment_type = 'IMA'
        AND fund_investment.fund_id IN (${funds.map(fund => `'${fund.id}'`).join(', ')});
    `);

    const [{ count: cardCount }] = await manager.query(/* sql */ `
        SELECT COUNT(*)
        FROM user_profile_account
        WHERE user_profile_id = '${profile.id}'
        AND account_type = '${UserProfileAccountTypes.CREDIT_CARD}'
    `);

    const [{ count: bankCount }] = await manager.query(/* sql */ `
        SELECT COUNT(*)
        FROM user_profile_account
        WHERE user_profile_id = '${profile.id}'
        AND account_type = '${UserProfileAccountTypes.BANK_ACCOUNT}'
    `);

    const recurringContributions = await manager.query(/* sql */ `
        SELECT tr.id, tr.recurrence_rule, tr.enabled
        FROM transaction_recurrence tr
        LEFT JOIN fund f
            ON f.id = tr.fund_id
        LEFT JOIN fund_user_profile fup
            ON fup.fund_id = f.id
        WHERE fup.user_profile_id = '${profile.id}'
        AND tr.transaction_type_id = (SELECT id FROM transaction_type WHERE name = '${TransactionTypeValue.CONTRIBUTION_SERIES}');
    `);

    const filteredContributions = filterRecurrencesByStatus(
        recurringContributions,
        RecurrenceStatuses.ACTIVE,
        'recurrence_rule'
    );

    const recurringGrants = await manager.query(/* sql */ `
        SELECT tr.id, tr.recurrence_rule, tr.enabled
        FROM transaction_recurrence tr
        LEFT JOIN fund f
            ON f.id = tr.fund_id
        LEFT JOIN fund_user_profile fup
            ON fup.fund_id = f.id
        WHERE fup.user_profile_id = '${profile.id}'
        AND tr.transaction_type_id = (SELECT id FROM transaction_type WHERE name = '${TransactionTypeValue.GRANT_SERIES}');
    `);

    const filteredGrants = filterRecurrencesByStatus(
        recurringGrants,
        RecurrenceStatuses.ACTIVE,
        'recurrence_rule'
    );

    const createdDate = new Date(profile.createdOn);

    const identifyObject = {
        userId: userProfileId,
        traits: {
            name: profile.fullName,
            email: profile.appUser.emailAddress,
            username: profile.appUser.username,
            total_num_funds: funds.length,
            total_num_external_account_holders: parseInt(otherFundUsers),
            has_ima_account: hasImaCount > 0,
            total_num_linked_credit_cards: parseInt(cardCount),
            total_num_linked_bank_accounts: parseInt(bankCount),
            total_num_recurring_contributions: filteredContributions?.length || 0,
            total_num_recurring_grants: filteredGrants?.length || 0,
            is_succession_plan_uploaded: hasSuccessionPlan,
            is_migrated_user: profile.wasMigrated,
            user_since: createdDate.getFullYear()
            // TODO: the below fields are post mvp
            // is_vip_fund_associated: false,
            // has_complex_asset: false,
        }
    };

    segmentClient.identify(identifyObject);
};
