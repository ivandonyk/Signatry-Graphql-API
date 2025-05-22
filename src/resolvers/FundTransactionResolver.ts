import { Resolver, FieldResolver, Ctx, Root, Arg, Int } from 'type-graphql';
import { DisplayStatuses, FundTransaction } from '../models/FundTransaction';
import { UserProfile } from '../models/UserProfile';
import { Recipient } from '../models/Recipient';
import { TransactionType, TransactionTypeValue } from '../models/TransactionType';
import { TransactionDetailType, TransactionDetailTypeName } from '../models/TransactionDetailType';
import { TransactionStatus } from '../models/TransactionStatus';
import { FundInvestment } from '../models/FundInvestment';
import {
    FundTransactionSource,
    FundTransactionSourceStatusValue
} from '../models/FundTransactionSource';
import { FundTransactionInfo } from '../models/FundTransactionInfo';
import { FundTransactionDetail } from '../models/FundTransactionDetail';
import { FundTransactionBatch } from '../models/FundTransactionBatch';
import { TransactionEvent } from '../models/TransactionEvent';
import { Fund } from '../models/Fund';
import { UtilityResolver } from '../graphql/core/UtilityResolver';
import { GraphQLContext } from '../context';
import { TransactionStatusValue } from '../models/TransactionStatus';
import { TransactionAllocation } from '../models/TransactionAllocation';
import { FundTransactionRepository } from '../repositories/FundTransaction';
import { TransactionRecurrence } from '../models/TransactionRecurrence';
import { FundTransactionCommentFilter } from '../inputs/FundTransactionComment/FundTransactionCommentFilter';
import { FundTransactionCommentOrderBy } from '../inputs/FundTransactionComment/FundTransactionCommentOrderBy';
import { FundTransactionComment } from '../models/FundTransactionComment';
import {
    TransactionDetailStatus,
    TransactionDetailStatusValue
} from '../models/TransactionDetailStatus';
import { FundTransactionDetailRepository } from '../repositories/FundTransactionDetail';

@Resolver(type => FundTransaction)
export class FundTransactionResolver extends UtilityResolver {
    // Fund
    @FieldResolver(type => Fund)
    public async fund(@Root() root: FundTransaction, @Ctx() context: GraphQLContext) {
        if (!root.fund) {
            root.fund = await context.typeorm.getRepository(Fund).findOne({
                id: root.fundId
            });
        }
        return root.fund;
    }

    // User Profile (created by)
    @FieldResolver(type => UserProfile)
    public async userProfile(@Root() root: FundTransaction, @Ctx() context: GraphQLContext) {
        if (!root.userProfile) {
            root.userProfile = await context.typeorm.getRepository(UserProfile).findOne({
                id: root.userProfileId
            });
        }
        return root.userProfile;
    }

    @FieldResolver(type => String)
    public async transferStatus(@Root() root: FundTransaction, @Ctx() context: GraphQLContext) {
        const { manager } = context.typeorm;

        const transactionType = await manager.findOne(TransactionType, {
            id: root.transactionTypeId
        });

        const { name: typeName } = transactionType;

        if (
            typeName === TransactionTypeValue.TRANSFER_IN ||
            typeName === TransactionTypeValue.TRANSFER_OUT
        ) {
            const status = await manager.findOne(TransactionStatus, {
                id: root.transactionStatusId
            });

            const detailStatuses = await manager.query(/* sql */ `
                SELECT 
                    CASE WHEN transaction_detail_status.name = 'SUBMITTED' THEN TRUE ELSE FALSE END as submitted,
                    CASE WHEN transaction_detail_status.name = 'COMPLETE' THEN TRUE ELSE FALSE END as completed
                FROM transaction_detail_status
                LEFT JOIN fund_transaction_detail
                ON fund_transaction_detail.transaction_detail_status_id = transaction_detail_status.id
                LEFT JOIN fund_transaction
                ON fund_transaction.id = fund_transaction_detail.fund_transaction_id
                WHERE fund_transaction.id = '${root.id}'
            `);

            if (
                detailStatuses.length > 0 &&
                detailStatuses.every(value => value.submitted === true)
            ) {
                return DisplayStatuses.SUBMITTED;
            } else if (status.name === TransactionStatusValue.PENDING) {
                return DisplayStatuses.PENDING;
            } else if (status.name === TransactionStatusValue.CANCELED) {
                return DisplayStatuses.CANCELED;
            } else if (
                detailStatuses.length > 0 &&
                detailStatuses.every(value => value.completed === true)
            ) {
                return DisplayStatuses.COMPLETE;
            } else {
                return DisplayStatuses.SUBMITTED;
            }
        } else {
            return null;
        }
    }

    @FieldResolver(type => String)
    public async displayStatus(@Root() root: FundTransaction, @Ctx() context: GraphQLContext) {
        const manager = context.typeorm.manager;
        const transactionType = await manager.findOne(TransactionType, {
            id: root.transactionTypeId
        });
        const transactionStatus = await manager.findOne(TransactionStatus, {
            id: root.transactionStatusId
        });

        if (transactionType.name === TransactionTypeValue.GRANT) {
            const status = await manager.findOne(TransactionStatus, {
                id: root.transactionStatusId
            });

            const paymentCashType = await manager.findOne(TransactionDetailType, {
                name: TransactionDetailTypeName.CASH_OUT
            });

            const paymentCash = await manager.findOne(FundTransactionDetail, {
                fundTransactionId: root.id,
                transactionDetailTypeId: paymentCashType.id
            });
            
            if(typeof paymentCash === "undefined") { 
                return DisplayStatuses.PENDING;
            }

            const paymentCashStatus = await manager.findOne(TransactionDetailStatus, {
                id: paymentCash?.transactionDetailStatusId
            });

            const divestmentCashType = await manager.findOne(TransactionDetailType, {
                name: TransactionDetailTypeName.GRANT_DIVESTMENT_CASH
            });
            
            if(typeof divestmentCashType === "undefined") { 
                return DisplayStatuses.PENDING;
            }

            const divestmentCashDetail = await manager.findOne(FundTransactionDetail, {
                fundTransactionId: root.id,
                transactionDetailTypeId: divestmentCashType.id
            });

            const divestmentCashDetailStatus = await manager.findOne(TransactionDetailStatus, {
                id: divestmentCashDetail?.transactionDetailStatusId
            });

            if (
                (status.name === TransactionStatusValue.SUBMITTED ||
                    status.name === TransactionStatusValue.NEW ||
                    status.name === TransactionStatusValue.SCHEDULED) &&
                paymentCashStatus.name === TransactionDetailStatusValue.PENDING &&
                divestmentCashDetailStatus.name === TransactionDetailStatusValue.PENDING
            ) {
                root.displayStatus = DisplayStatuses.SUBMITTED;
            } else if (
                status.name === TransactionStatusValue.COMPLETE &&
                !!root.finalReview &&
                !root.onHold
            ) {
                root.displayStatus = DisplayStatuses.COMPLETE;
            } else if (
                status.name === TransactionStatusValue.PAID &&
                !!root.finalReview &&
                !root.onHold
            ) {
                root.displayStatus = DisplayStatuses.PAID;
            } else if (
                status.name === TransactionStatusValue.CANCELED ||
                paymentCashStatus?.name === TransactionDetailStatusValue.CANCELED ||
                status.name === TransactionStatusValue.DENIED ||
                paymentCashStatus?.name === TransactionDetailStatusValue.DENIED
            ) {
                root.displayStatus = DisplayStatuses.CANCELED;
            } else {
                root.displayStatus = DisplayStatuses.PENDING;
            }
        } else if (transactionType.name === TransactionTypeValue.CONTRIBUTION) {
            const { typeorm } = context;
            const cashTransactionDetailType = TransactionDetailTypeName.CASH_IN;
            const stockInTransactionDetailType = TransactionDetailTypeName.STOCK_IN;

            const cashTransactionDetail = await typeorm
                .getCustomRepository(FundTransactionDetailRepository)
                .getCashDetailForTransaction(root, cashTransactionDetailType);
            const stockTransactionDetail = await typeorm
                .getCustomRepository(FundTransactionDetailRepository)
                .getCashDetailForTransaction(root, stockInTransactionDetailType);

            const transactionSource = await typeorm
                .createQueryBuilder(FundTransactionSource, 'source')
                .where('source.id = :id', { id: root.fundTransactionSourceId })
                .getOne();

            try {
                if (cashTransactionDetail) {
                    switch (cashTransactionDetail.transactionDetailStatus.name) {
                        case TransactionDetailStatusValue.READY_FOR_INVESTMENT:
                        case TransactionDetailStatusValue.READY_FOR_PAYMENT:
                        case TransactionDetailStatusValue.READY_FOR_PAYOUT:
                        case TransactionDetailStatusValue.PENDING_PAYOUT:
                        case TransactionDetailStatusValue.PENDING_RECONCILIATION:
                        case TransactionDetailStatusValue.PENDING:
                            root.displayStatus = DisplayStatuses.PENDING;
                            break;
                        case TransactionDetailStatusValue.COMPLETE:
                            root.displayStatus = DisplayStatuses.COMPLETE;
                            break;
                        default:
                            break;
                    }
                } else if (stockTransactionDetail) {
                    switch (stockTransactionDetail.transactionDetailStatus.name) {
                        case TransactionDetailStatusValue.PENDING_RECONCILIATION:
                        case TransactionDetailStatusValue.PENDING:
                            root.displayStatus = DisplayStatuses.PENDING;
                            break;
                        case TransactionDetailStatusValue.COMPLETE:
                            root.displayStatus = DisplayStatuses.COMPLETE;
                            break;
                        default:
                            break;
                    }
                }

                if (root.transactionStatus?.name === TransactionStatusValue.CANCELED) {
                    root.displayStatus = DisplayStatuses.CANCELED;
                }
            } catch (error) {
                console.error(`Error for transaction ID ${root.id}`);
                console.error(error);
                root.displayStatus = DisplayStatuses.PENDING;
            }
        } else {
            root.displayStatus = DisplayStatuses.PENDING;
        }
        return root.displayStatus ?? transactionStatus.name;
    }

    // Transaction type
    @FieldResolver(type => TransactionType)
    public async transactionType(@Root() root: FundTransaction, @Ctx() context: GraphQLContext) {
        if (!root.transactionType) {
            root.transactionType = await context.typeorm
                .getRepository(TransactionType)
                .findOne({ id: root.transactionTypeId });
        }
        return root.transactionType;
    }

    // Fund transaction status
    @FieldResolver(type => TransactionStatus)
    public async transactionStatus(@Root() root: FundTransaction, @Ctx() context: GraphQLContext) {
        if (!root.transactionStatus) {
            root.transactionStatus = await context.typeorm
                .getRepository(TransactionStatus)
                .findOne({
                    id: root.transactionStatusId
                });
        }
        return root.transactionStatus;
    }

    // Fund transaction comments
    @FieldResolver(type => [FundTransactionComment])
    public async fundTransactionComments(
        @Root() root: FundTransaction,
        @Ctx() context: GraphQLContext,
        @Arg('orderBy', { nullable: true }) orderBy?: FundTransactionCommentOrderBy,
        @Arg('skip', type => Int, { nullable: true }) skip?: number,
        @Arg('take', type => Int, { nullable: true }) take?: number,
        @Arg('where', type => FundTransactionCommentFilter, { nullable: true })
        where?: FundTransactionCommentFilter
    ) {
        const conditions = {
            ...where,
            fundTransactionId: root.id
        };
        const repo = context.typeorm.getRepository(FundTransactionComment);
        return this.createQuery(repo, conditions, orderBy, skip, take).getMany();
    }

    // Transaction events
    @FieldResolver(type => [TransactionEvent])
    public async transactionEvents(@Root() root: FundTransaction, @Ctx() context: GraphQLContext) {
        return context.typeorm.getRepository(TransactionEvent).find({
            fundTransactionId: root.id
        });
    }

    // Transaction events
    @FieldResolver(type => [TransactionEvent])
    public async transactionParentEvents(
        @Root() root: FundTransaction,
        @Ctx() context: GraphQLContext
    ) {
        return context.typeorm.getRepository(TransactionEvent).find({
            fundTransactionId: root.id,
            parentEventId: null
        });
    }

    // Fund transaction source
    @FieldResolver(type => FundTransactionSource)
    public async fundTransactionSource(
        @Root() root: FundTransaction,
        @Ctx() context: GraphQLContext
    ) {
        if (!root.fundTransactionSource) {
            root.fundTransactionSource = await context.typeorm
                .getRepository(FundTransactionSource)
                .findOne({
                    id: root.fundTransactionSourceId
                });
        }
        return root.fundTransactionSource;
    }

    // Fund transaction destination
    @FieldResolver(type => FundTransactionInfo)
    public async transactionInfo(@Root() root: FundTransaction, @Ctx() context: GraphQLContext) {
        if (!root.transactionInfo) {
            root.transactionInfo = await context.typeorm
                .getRepository(FundTransactionInfo)
                .findOne({
                    fundTransactionId: root.id
                });
        }
        return root.transactionInfo;
    }

    // Fund recurrence
    @FieldResolver(type => TransactionRecurrence)
    public async transactionRecurrence(@Root() root: FundTransaction, @Ctx() context: any) {
        if (!root.transactionRecurrence) {
            root.transactionRecurrence = await context.typeorm
                .getRepository(TransactionRecurrence)
                .findOne({
                    id: root.transactionRecurrenceId
                });
        }
        return root.transactionRecurrence;
    }

    // Fund transaction recipient
    @FieldResolver(type => Recipient)
    public async recipient(@Root() root: FundTransaction, @Ctx() context: GraphQLContext) {
        const repo = context.typeorm.getRepository(Recipient);
        const builder = repo
            .createQueryBuilder('recipient')
            .leftJoin('recipient.fundDestinations', 'fundDestination')
            .where('fundDestination.fundTransactionId = :id', { id: root.id });
        return builder.getOne();
    }

    // Fund transaction recipient
    @FieldResolver(type => UserProfile)
    public async createdByProfile(@Root() root: FundTransaction, @Ctx() context: GraphQLContext) {
        const repo = context.typeorm.getRepository(UserProfile);
        const builder = repo
            .createQueryBuilder('userProfile')
            .where('userProfile.id = :id', { id: root.createdBy });

        return await builder.getOne();
    }

    // Fund transaction recipient
    @FieldResolver(type => UserProfile)
    public async createdByAdmin(@Root() root: FundTransaction, @Ctx() context: GraphQLContext) {
        if (root.createdByAdminId) {
            const repo = context.typeorm.getRepository(UserProfile);
            const builder = repo
                .createQueryBuilder('userProfile')
                .where('userProfile.id = :id', { id: root.createdByAdminId });

            return await builder.getOne();
        }
        return null;
    }

    @FieldResolver(type => [FundTransactionDetail])
    public async recurringFundTransactions(@Root() root: FundTransaction, @Ctx() context: any) {
        return context.typeorm
            .getRepository(FundTransaction)
            .find({ originalFundTransactionId: root.id });
    }

    @FieldResolver(type => FundTransaction)
    public async originalFundTransaction(
        @Root() root: FundTransaction,
        @Ctx() context: GraphQLContext
    ) {
        return context.typeorm
            .getRepository(FundTransaction)
            .findOne({ id: root.originalFundTransactionId });
    }

    // Fund transaction details
    @FieldResolver(type => [FundTransactionDetail])
    public async transactionDetails(@Root() root: FundTransaction, @Ctx() context: any) {
        if (!root.transactionDetails) {
            root.transactionDetails = await context.typeorm
                .getRepository(FundTransactionDetail)
                .find({ fundTransactionId: root.id });
        }
        return root.transactionDetails;
    }

    // DEPRECATED
    @FieldResolver(type => FundTransactionBatch)
    public async fundTransactionBatch(
        @Root() root: FundTransaction,
        @Ctx() context: GraphQLContext
    ) {
        if (!root.fundTransactionBatch) {
            root.fundTransactionBatch = await context.typeorm
                .getRepository(FundTransactionBatch)
                .findOne({ id: root.fundTransactionBatchId });
        }

        return root.fundTransactionBatch;
    }

    // Combined status for contributions view
    // Return stripe status unless investment is completed
    @FieldResolver(type => String)
    public async combinedStatus(@Root() root: FundTransaction, @Ctx() context: GraphQLContext) {
        const { typeorm } = context;

        const transactionType = await context.typeorm.manager.findOne(TransactionType, {
            id: root.transactionTypeId
        });

        const cashTransactionDetailType =
            transactionType.name === TransactionTypeValue.CONTRIBUTION
                ? TransactionDetailTypeName.CASH_IN
                : TransactionDetailTypeName.GRANT_DIVESTMENT_CASH;

        const cashTransactionDetail = await typeorm
            .getCustomRepository(FundTransactionDetailRepository)
            .getCashDetailForTransaction(root, cashTransactionDetailType);

        const transactionSource = await typeorm
            .createQueryBuilder(FundTransactionSource, 'source')
            .where('source.id = :id', { id: root.fundTransactionSourceId })
            .getOne();

        try {
            if (
                cashTransactionDetail?.transactionDetailType?.name ===
                TransactionDetailTypeName.CASH_IN
            ) {
                if (
                    cashTransactionDetail.transactionDetailStatus.name ===
                    TransactionDetailStatusValue.READY_FOR_INVESTMENT
                ) {
                    return TransactionStatusValue.APPROVED;
                } else if (
                    cashTransactionDetail.transactionDetailStatus.name ===
                    TransactionDetailStatusValue.COMPLETE
                ) {
                    return TransactionStatusValue.COMPLETE;
                }
            } else if (
                cashTransactionDetail?.transactionDetailType?.name ===
                TransactionDetailTypeName.GRANT_DIVESTMENT_CASH
            ) {
                if (
                    cashTransactionDetail.transactionDetailStatus.name ===
                    TransactionDetailStatusValue.READY_FOR_DIVESTMENT
                ) {
                    return TransactionStatusValue.APPROVED;
                } else if (
                    cashTransactionDetail.transactionDetailStatus.name ===
                    TransactionDetailStatusValue.COMPLETE
                ) {
                    return TransactionStatusValue.COMPLETE;
                }
            }

            if (root.transactionStatus.name === TransactionStatusValue.CANCELED) {
                return TransactionStatusValue.CANCELED;
            }

            if (transactionSource?.status === FundTransactionSourceStatusValue.POSTED) {
                return TransactionStatusValue.COMPLETE;
            }

            if (root.transactionStatus.name === TransactionStatusValue.SCHEDULED) {
                return TransactionStatusValue.PENDING;
            }

            return transactionSource.status;
        } catch (error) {
            console.error(`Error for transaction ID ${root.id}`);
            if (root.scheduledDate) {
                return TransactionStatusValue.READY_FOR_PAYOUT;
            }
            return TransactionStatusValue.COMPLETE;
        }
    }

    // DEPRECATED
    // Return associated fee transaction
    @FieldResolver(type => FundTransactionDetail)
    public async feeTransaction(@Root() root: FundTransaction, @Ctx() context: GraphQLContext) {
        const { typeorm } = context;

        // Currently, only contributions have fees
        const transactionType = await typeorm
            .getRepository(TransactionType)
            .findOne({ id: root.transactionTypeId });

        if (transactionType.name !== TransactionTypeValue.CONTRIBUTION) {
            return null;
        }

        return typeorm.manager
            .createQueryBuilder(FundTransactionDetail, 'fundTransactionDetail')
            .leftJoin('fundTransactionDetail.transactionDetailType', 'transactionDetailType')
            .where('transactionDetailType.name = :name', { name: TransactionDetailTypeName.FEE })
            .andWhere('fundTransactionDetail.fundTransactionId = :id', {
                id: root.id
            })
            .getOne();
    }

    // Investment allocations
    @FieldResolver(type => [TransactionAllocation])
    public async investmentAllocations(
        @Root() root: FundTransaction,
        @Ctx() context: GraphQLContext
    ) {
        const { typeorm } = context;

        const fundInvestments = await typeorm.manager
            .createQueryBuilder(FundInvestment, 'fundInvestment')
            .where('fundInvestment.fundId = :id', { id: root.fundId })
            .leftJoinAndSelect('fundInvestment.investment', 'investment')
            .orderBy('investment.orderNum', 'ASC')
            .getMany();

        const cashDetail = await context.typeorm.manager
            .getCustomRepository(FundTransactionDetailRepository)
            .getCashDetailForTransaction(root, TransactionDetailTypeName.CASH_IN);

        return fundInvestments.map(fundInvestment => {
            return {
                name: fundInvestment.investment.name,
                amount: fundInvestment.allocationPercentage * cashDetail.amount
            };
        });
    }

    // Divestment allocations
    @FieldResolver(type => [TransactionAllocation])
    public async divestmentAllocations(
        @Root() root: FundTransaction,
        @Ctx() context: GraphQLContext
    ) {
        return context.typeorm.manager
            .getCustomRepository(FundTransactionRepository)
            .getDivestmentAllocations(root);
    }

    // Hold reason
    @FieldResolver(type => String)
    public async holdReason(@Root() root: FundTransaction, @Ctx() context: GraphQLContext) {
        const lastHoldComment = await context.typeorm.manager
            .createQueryBuilder(FundTransactionComment, 'fundTransactionComment')
            .where('fundTransactionComment.fundTransactionId = :id', { id: root.id })
            .andWhere('fundTransactionComment.isHold = true')
            .orderBy('fundTransactionComment.createdOn', 'DESC')
            .getOne();

        return lastHoldComment ? lastHoldComment.comment : '';
    }

    @FieldResolver(type => String)
    public async divestmentStatus(@Root() root: FundTransaction, @Ctx() context: GraphQLContext) {
        // Series transactions don't have their own divestment status, fill in complete
        const transactionType = await context.typeorm.manager
            .getRepository(TransactionType)
            .findOne(root.transactionTypeId);
        if (
            transactionType.name === TransactionTypeValue.GRANT_SERIES ||
            transactionType.name === TransactionTypeValue.CONTRIBUTION_SERIES
        ) {
            return TransactionDetailStatusValue.COMPLETE;
        }
        const divestmentDetails = await context.typeorm.manager
            .getCustomRepository(FundTransactionDetailRepository)
            .getDivestmentsForTransaction(root);

        const statuses = divestmentDetails.map(divestment => {
            return divestment.transactionDetailStatus.name;
        });

        if (
            divestmentDetails.length > 0 &&
            statuses.every(s => s === TransactionDetailStatusValue.COMPLETE)
        ) {
            return TransactionDetailStatusValue.COMPLETE;
        } else if (statuses.includes(TransactionDetailStatusValue.PENDING_RECONCILIATION)) {
            return TransactionDetailStatusValue.PENDING_RECONCILIATION;
        } else {
            return TransactionDetailStatusValue.PENDING;
        }
    }

    @FieldResolver(type => String)
    public async grantPaymentStatus(@Root() root: FundTransaction, @Ctx() context: GraphQLContext) {
        // Series transactions don't have their own payment status, fill in complete
        const transactionType = await context.typeorm.manager
            .getRepository(TransactionType)
            .findOne(root.transactionTypeId);
        if (
            transactionType.name === TransactionTypeValue.GRANT_SERIES ||
            transactionType.name === TransactionTypeValue.CONTRIBUTION_SERIES
        ) {
            return TransactionDetailStatusValue.COMPLETE;
        }
        const cashDetail = await context.typeorm.manager
            .getCustomRepository(FundTransactionDetailRepository)
            .getCashDetailForTransaction(root, TransactionDetailTypeName.CASH_OUT);

        return cashDetail?.transactionDetailStatus?.name;
    }

    @FieldResolver(type => FundTransactionDetail)
    public async cashDetail(@Root() root: FundTransaction, @Ctx() context: GraphQLContext) {
        const transactionType = await context.typeorm.manager.findOne(TransactionType, {
            id: root.transactionTypeId
        });

        const cashTransactionDetailType =
            transactionType.name === TransactionTypeValue.CONTRIBUTION
                ? TransactionDetailTypeName.CASH_IN
                : TransactionDetailTypeName.GRANT_DIVESTMENT_CASH;

        const cashDetail = await context.typeorm.manager
            .getCustomRepository(FundTransactionDetailRepository)
            .getCashDetailForTransaction(root, cashTransactionDetailType);

        return cashDetail;
    }
}
