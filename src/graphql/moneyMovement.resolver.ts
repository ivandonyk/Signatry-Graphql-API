import { Resolver, Ctx, Arg, Query, Mutation } from 'type-graphql';
import { Connection } from 'typeorm';

import { UtilityResolver } from './core/UtilityResolver';
import { GraphQLContext } from '../context';
import { getTransactionCode } from '../utilities/getTransactionCode';
import { currency } from '../utilities/currency';
// models
import {
    FundTransaction,
    FundTransactionDetail,
    TransactionDetailType,
    TransactionType,
    TransactionStatus,
    TransactionDetailStatus,
    FundInvestment,
    TransactionEvent
} from '../models';
import { TransactionStatusValue } from '../models/TransactionStatus';
import { TransactionDetailTypeName } from '../models/TransactionDetailType';
import { TransactionDetailStatusValue } from '../models/TransactionDetailStatus';
import { MoneyMovementResults } from '../models/MoneyMovementResults';
import { EventNameValue } from '../models/TransactionEvent';
// inputs
import {
    MoneyMovementInput,
    MoneyMovementTransactionInput
} from '../inputs/MoneyMovement/MoneyMovementInput';

@Resolver(type => FundTransactionDetail)
export class MoneyMovementResolver extends UtilityResolver {
    private async findOrCreateTransaction(
        connection: Connection,
        transactionDetails: MoneyMovementTransactionInput,
        userProfileId: string
    ): Promise<FundTransaction> {
        const transactionRepo = connection.getRepository(FundTransaction);

        // fetch by id
        if (transactionDetails.id) {
            return transactionRepo.findOne(transactionDetails.id);
        }

        // create new record
        const [transactionType, transactionStatus] = await Promise.all([
            connection
                .getRepository(TransactionType)
                .findOne({ where: { name: transactionDetails.type } }),
            connection
                .getRepository(TransactionStatus)
                .findOne({ where: { name: TransactionStatusValue.PENDING }, select: ['id'] })
        ]);

        const code = await getTransactionCode(transactionType, connection.manager);
        // add description metadata
        /** @todo add metadata */
        const metadata =
            typeof transactionDetails.description === 'string' &&
            Boolean(transactionDetails.description.length)
                ? { metadata: { description: transactionDetails.description } }
                : {};

        /**
         * create FundTransaction
         * this is saved in the mutation that creates the money movement details
         * */
        const fundTransaction = transactionRepo.create({
            amount: currency.parseString(transactionDetails.amount),
            fundId: transactionDetails.fundId,
            transactionTypeId: transactionType.id,
            transactionStatusId: transactionStatus.id,
            transactionCode: code,
            createdBy: userProfileId,
            updatedBy: userProfileId,
            userProfileId: userProfileId,
            ...metadata
        });

        return fundTransaction;
    }

    // create fundTransactionDetails, but don't save to DB
    private async generateMoneyMovements(
        connection: Connection,
        investments: {
            sources: MoneyMovementInput[];
            destinations: MoneyMovementInput[];
        },
        detailInput: { name: TransactionDetailTypeName; id?: string },
        fundTransaction: FundTransaction,
        userProfileId: string
    ): Promise<FundTransactionDetail[]> {
        const detailRepo = connection.getRepository(FundTransactionDetail);
        const fundInvestmentRepo = connection.getRepository(FundInvestment);
        const { sources, destinations } = investments;

        const detailTypeWhere = detailInput.id
            ? { id: detailInput.id }
            : { name: detailInput.name };

        // fetch data
        const [detailType, detailStatus] = await Promise.all([
            connection.getRepository(TransactionDetailType).findOne(detailTypeWhere),
            connection
                .getRepository(TransactionDetailStatus)
                .findOne({ name: TransactionDetailStatusValue.PENDING })
        ]);

        // gather FundInvestment.Investment
        const [destinationRecords, sourceRecords] = await Promise.all(
            [destinations, sources].map(fi => {
                return Promise.all(
                    fi.map(inv => {
                        return fundInvestmentRepo.findOne(inv.fundInvestmentId, {
                            relations: ['investment']
                        });
                    })
                );
            })
        );

        // helper functions to generate detail records
        function generateFTD(
            amount: number,
            FISourceId: string,
            FIDestinationId: string
        ): FundTransactionDetail {
            const sourceFI = sourceRecords.find(({ id }) => id === FISourceId);
            const destinationFI = destinationRecords.find(({ id }) => id === FIDestinationId);
            const isDivestment = detailInput.name === TransactionDetailTypeName.DIVESTMENT;

            const ftd = detailRepo.create({
                amount: isDivestment ? amount * -1 : amount,
                sourceAccountId: sourceFI.investment.glAccountId,
                destinationAccountId: destinationFI.investment.glAccountId,
                fundTransactionId: fundTransaction.id,
                fundInvestmentId: isDivestment ? sourceFI.id : destinationFI.id,
                transactionDateTime: new Date(),
                transactionDetailStatusId: detailStatus.id,
                transactionDetailTypeId: detailType.id,
                createdBy: userProfileId,
                updatedBy: userProfileId
            });
            if (fundTransaction.metadata?.description) {
                ftd.description = fundTransaction.metadata.description;
            }

            return ftd;
        }

        // create MoneyMovements
        const moneyMovements: FundTransactionDetail[] = [];
        destinations.forEach(destination => {
            const destinationValue = currency.parseString(destination.amount);

            const recursiveBuild = async (
                remainingDestinationAmount: number,
                remainingSources: any[]
            ) => {
                if (remainingDestinationAmount === 0) return;

                // Check to see if one 'source' transaction can cover the whole 'destination' transaction
                const completeSourceCandidateIndex = remainingSources.findIndex(
                    (source: { amount: string }) => {
                        return currency.parseString(source.amount) >= remainingDestinationAmount;
                    }
                );

                // If there is one, do that and finish
                if (completeSourceCandidateIndex !== -1) {
                    const completeSourceCandidate = remainingSources[completeSourceCandidateIndex];

                    moneyMovements.push(
                        generateFTD(
                            remainingDestinationAmount,
                            completeSourceCandidate.fundInvestmentId,
                            destination.fundInvestmentId
                        )
                    );

                    const newFromValue =
                        currency.parseString(completeSourceCandidate.amount) -
                        remainingDestinationAmount;

                    // Delete if the 'from' side has nothing left to give
                    if (newFromValue === 0) {
                        remainingSources.splice(completeSourceCandidateIndex, 1);
                    } else {
                        // otherwise, reduce its value
                        remainingSources[
                            completeSourceCandidateIndex
                        ].amount = newFromValue.toString();
                    }

                    return;
                }
                // Otherwise, build what you can with 'from' funds available and repeat
                else {
                    const fromCandidateIndex = remainingSources.findIndex(
                        (source: { amount: string }) => {
                            return currency.parseString(source.amount) !== 0;
                        }
                    );

                    // This checks if there's somehow a zero in there
                    if (fromCandidateIndex !== -1) {
                        const fromCandidate = remainingSources[fromCandidateIndex];
                        const newValue = currency.parseString(fromCandidate.amount);

                        moneyMovements.push(
                            generateFTD(
                                newValue,
                                fromCandidate.fundInvestmentId,
                                destination.fundInvestmentId
                            )
                        );

                        // remove from available 'from' funds
                        remainingSources.splice(fromCandidateIndex, 1);

                        // call it again with the reduced value
                        recursiveBuild(remainingDestinationAmount - newValue, remainingSources);
                    }
                }
            };

            recursiveBuild(destinationValue, sources);
        });

        return moneyMovements;
    }

    @Query(type => MoneyMovementResults)
    async potentialMoneyMovements(
        @Ctx() context: GraphQLContext,
        @Arg('sourceInvestments', type => [MoneyMovementInput])
        sourceInvestments: MoneyMovementInput[],
        @Arg('destinationInvestments', type => [MoneyMovementInput])
        destinationInvestments: MoneyMovementInput[],
        @Arg('transaction', type => MoneyMovementTransactionInput)
        transaction: MoneyMovementTransactionInput
    ): Promise<MoneyMovementResults> {
        const [userProfile, [{ current_timestamp: timestamp }]] = await Promise.all([
            this.getCurrentUserProfile(context),
            context.typeorm.query('SELECT CURRENT_TIMESTAMP')
        ]);

        const fundTransaction = await this.findOrCreateTransaction(
            context.typeorm,
            transaction,
            userProfile.id
        );

        const moneyMovements = await this.generateMoneyMovements(
            context.typeorm,
            { sources: sourceInvestments, destinations: destinationInvestments },
            { name: transaction.detailType },
            fundTransaction,
            userProfile.id
        );

        return Promise.resolve({
            timestamp,
            count: moneyMovements.length,
            totalAmount: moneyMovements.reduce((sum, mm) => currency.add(sum, mm.amount), 0),
            data: moneyMovements
        });
    }

    @Mutation(type => Boolean)
    async createMoneyMovements(
        @Ctx() context: GraphQLContext,
        @Arg('sourceInvestments', type => [MoneyMovementInput])
        sourceInvestments: MoneyMovementInput[],
        @Arg('destinationInvestments', type => [MoneyMovementInput])
        destinationInvestments: MoneyMovementInput[],
        @Arg('transaction', type => MoneyMovementTransactionInput)
        transaction: MoneyMovementTransactionInput,
        @Arg('deleteExisting', type => Boolean) deleteExisting: boolean
    ): Promise<boolean> {
        const userProfile = await this.getCurrentUserProfile(context);

        // create parent transaction and save to DB before creating details
        const fundTransaction = await this.findOrCreateTransaction(
            context.typeorm,
            transaction,
            userProfile.id
        );
        const transactionDetailType = await context.typeorm.manager.findOne(TransactionDetailType, {
            name: transaction.detailType
        });
        const allTransactionDetailTypes = await context.typeorm.manager
            .getRepository(TransactionDetailType)
            .createQueryBuilder('transactionDetailType')
            .where('name IN (:...typeNames)', {
                typeNames: [
                    TransactionDetailTypeName.TRANSFER,
                    TransactionDetailTypeName.INVESTMENT,
                    TransactionDetailTypeName.DIVESTMENT
                ]
            })
            .getMany();

        const allTransactionDetailTypeIds = allTransactionDetailTypes.map(t => t.id);

        const pendingStatus = await context.typeorm.manager.findOne(TransactionDetailStatus, {
            name: TransactionDetailStatusValue.PENDING
        });

        const detailTypeIdsPromise = context.typeorm.getRepository(FundTransactionDetail).find({
            where: { fundTransactionId: fundTransaction.id },
            select: ['transactionDetailTypeId']
        });

        // save fund_transaction (necessary for newly created transaction in `findOrCreateTransaction`)
        const { id: fundTransactionId } = await context.typeorm
            .getRepository(FundTransaction)
            .save(fundTransaction);

        // if necessary, delete existing promises
        let detailType: FundTransactionDetail;
        if (deleteExisting) {
            const transactionDetailType = await context.typeorm.manager.findOne(
                TransactionDetailType,
                { name: transaction.detailType }
            );

            const deletePromise = context.typeorm
                .createQueryBuilder()
                .delete()
                .from(FundTransactionDetail)
                .where({
                    fundTransactionId: fundTransaction.id,
                    transactionDetailStatusId: pendingStatus.id
                })
                .andWhere('transactionDetailTypeId IN (:...typeIds)', {
                    typeIds: allTransactionDetailTypeIds
                });

            // these 3 types are exclusive, so a fund_transaction will only have 1 of them
            const detailTypeIdsPromise = context.typeorm
                .getRepository(FundTransactionDetail)
                .createQueryBuilder('detail')
                .leftJoin('detail.transactionDetailType', 'type')
                .where('detail.fundTransactionId = :fundTransactionId', { fundTransactionId })
                .andWhere('type.name IN (:...types)', {
                    types: [
                        TransactionDetailTypeName.DIVESTMENT,
                        TransactionDetailTypeName.INVESTMENT,
                        TransactionDetailTypeName.TRANSFER
                    ]
                })
                .getOne();

            const results = await Promise.all([detailTypeIdsPromise, deletePromise.execute()]);
            // assign to detailType
            detailType = results[0];
        }

        // create details, create event, and save to db
        const moneyMovements = await this.generateMoneyMovements(
            context.typeorm,
            { sources: sourceInvestments, destinations: destinationInvestments },
            { name: transaction.detailType, id: detailType?.transactionDetailTypeId },
            fundTransaction,
            userProfile.id
        );

        const event = context.typeorm.manager.create(TransactionEvent, {
            fundTransactionId: fundTransactionId,
            name: EventNameValue.CREATED,
            createdBy: userProfile.id,
            updatedBy: userProfile.id,
            userProfileId: userProfile.id
        });

        // no need to await
        Promise.all([
            context.typeorm.getRepository(FundTransactionDetail).insert(moneyMovements),
            context.typeorm.getRepository(TransactionEvent).save(event)
        ]);

        return Promise.resolve(true);
    }
}
