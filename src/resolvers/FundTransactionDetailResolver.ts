import { Resolver, FieldResolver, Ctx, Root } from 'type-graphql';

import { UtilityResolver } from '../graphql/core/UtilityResolver';
import { GraphQLContext } from '../context';
import { FundTransactionDetailRepository } from '../repositories/FundTransactionDetail';
import {
    FundTransaction,
    FundInvestment,
    FundTransactionDetail,
    TransactionDetailType,
    TransactionDetailStatus,
    GLAccount
} from '../models';

@Resolver(type => FundTransactionDetail)
export class FundTransactionDetailResolver extends UtilityResolver {
    // Fund transaction
    @FieldResolver(type => FundTransaction)
    public async fundTransaction(
        @Root() root: FundTransactionDetail,
        @Ctx() context: GraphQLContext
    ) {
        if (!root.fundTransaction) {
            root.fundTransaction = await context.typeorm.getRepository(FundTransaction).findOne({
                id: root.fundTransactionId
            });
        }
        return root.fundTransaction;
    }

    // Fund investment
    @FieldResolver(type => FundInvestment)
    public async fundInvestment(
        @Root() root: FundTransactionDetail,
        @Ctx() context: GraphQLContext
    ) {
        if (!root.fundInvestment) {
            root.fundInvestment = await context.typeorm
                .getRepository(FundInvestment)
                .findOne({ id: root.fundInvestmentId });
        }
        return root.fundInvestment;
    }

    // Type
    @FieldResolver(type => TransactionDetailType)
    public async transactionDetailType(
        @Root() root: FundTransactionDetail,
        @Ctx() context: GraphQLContext
    ) {
        if (!root.transactionDetailType) {
            root.transactionDetailType = await context.typeorm
                .getRepository(TransactionDetailType)
                .findOne({ id: root.transactionDetailTypeId });
        }

        return root.transactionDetailType;
    }

    // Status
    @FieldResolver(type => TransactionDetailStatus)
    public async transactionDetailStatus(
        @Root() root: FundTransactionDetail,
        @Ctx() context: GraphQLContext
    ) {
        if (!root.transactionDetailStatus) {
            root.transactionDetailStatus = await context.typeorm
                .getRepository(TransactionDetailStatus)
                .findOne({ id: root.transactionDetailStatusId });
        }
        return root.transactionDetailStatus;
    }

    @FieldResolver(type => GLAccount)
    public async sourceAccount(
        @Root() root: FundTransactionDetail,
        @Ctx() context: GraphQLContext
    ) {
        if (root.sourceAccount) {
            return root.sourceAccount;
        }
        // fetch from FK
        if (root.sourceAccountId) {
            return await context.typeorm.getRepository(GLAccount).findOne(root.sourceAccountId);
        }

        // fallback
        const detailType = await this.transactionDetailType(root, context);
        return await context.typeorm
            .getCustomRepository(FundTransactionDetailRepository)
            .getSourceAccountForDetailTypeName(
                detailType.name,
                root.fundInvestmentId,
                root.fundTransactionId
            );
    }

    @FieldResolver(type => GLAccount)
    public async destinationAccount(
        @Root() root: FundTransactionDetail,
        @Ctx() context: GraphQLContext
    ) {
        if (root.destinationAccount) {
            return root.destinationAccount;
        }

        // fetch from FK
        if (root.destinationAccountId) {
            return await context.typeorm
                .getRepository(GLAccount)
                .findOne(root.destinationAccountId);
        }

        // fallback
        const detailType = await this.transactionDetailType(root, context);
        return await context.typeorm
            .getCustomRepository(FundTransactionDetailRepository)
            .getDestinationAccountForDetailTypeName(detailType.name, root.fundInvestmentId);
    }
}
