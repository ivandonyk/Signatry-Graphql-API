import { FundTransaction } from '../models/FundTransaction';
import { Recipient } from '../models/Recipient';
import { Resolver, FieldResolver, Ctx, Root } from 'type-graphql';
import { UtilityResolver } from '../graphql/core/UtilityResolver';
import { TransactionRecurrence, TransactionType, UserProfileAccount } from '../models';
import {
    convertRRuleFromString,
    convertRRuleToHumanReadable
} from '../utilities/getRruleForRecurringActions';

@Resolver(type => TransactionRecurrence)
export class TransactionRecurrenceResolver extends UtilityResolver {
    @FieldResolver(type => String)
    public async recurrenceRuleReadable(@Root() root: TransactionRecurrence, @Ctx() context: any) {
        return convertRRuleToHumanReadable(convertRRuleFromString(root.recurrenceRule));
    }
    // Fund transaction
    @FieldResolver(type => FundTransaction)
    public async fundTransaction(@Root() root: TransactionRecurrence, @Ctx() context: any) {
        if (root.fundTransaction) return root.fundTransaction;

        return context.typeorm.getRepository(FundTransaction).findOne({
            transactionRecurrenceId: root.id
        });
    }

    @FieldResolver(type => UserProfileAccount)
    public async userProfileAccount(@Root() root: TransactionRecurrence, @Ctx() context: any) {
        if (root.userProfileAccount) return root.userProfileAccount;

        return context.typeorm.getRepository(UserProfileAccount).findOne({
            id: root.userProfileAccountId
        });
    }

    @FieldResolver(type => Recipient)
    public async recipient(@Root() root: TransactionRecurrence, @Ctx() context: any) {
        if (root.recipient) return root.recipient;

        return context.typeorm.getRepository(Recipient).findOne({
            id: root.recipientId
        });
    }

    @FieldResolver(type => TransactionType)
    public async transactionType(@Root() root: TransactionRecurrence, @Ctx() context: any) {
        if (root.transactionType) return root.transactionType;

        return context.typeorm.getRepository(TransactionType).findOne({
            id: root.transactionTypeId
        });
    }
}
