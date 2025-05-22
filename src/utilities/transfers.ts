import { EntityManager, In } from 'typeorm';
import { registerEnumType } from 'type-graphql';

import {
    FundTransaction,
    FundTransactionDetail,
    InvestmentUnitPriceHistory,
    TransactionStatus,
    TransactionType,
    Fund,
    TransactionDetailStatus,
    UserProfile,
    TransactionDetailType,
    TransactionEvent
} from '../models';

import { getTransactionCode } from './getTransactionCode';
import { TransactionStatusValue } from '../models/TransactionStatus';
import { TransactionDetailStatusValue } from '../models/TransactionDetailStatus';
import { TransactionDetailTypeName } from '../models/TransactionDetailType';
import { TransactionTypeValue } from '../models/TransactionType';
import { TransferMetadata } from '../models/FundTransactionMetadata';
import { eventNameFromStatusName } from '../models/TransactionEvent';

import { CreateFundTransferInput } from '../inputs/FundTransfer/CreateFundTransferInput';
import { UpdateFundTransferInput } from '../inputs/FundTransfer/UpdateFundTransferInput';
import { FundInvestmentRepository } from '../repositories/FundInvestment';
import { fundsWithoutBalanceFromFundTransactions } from './fees';
import { FundRepository } from '../repositories/Fund';

import { FundTransactionDetailRepository } from '../repositories/FundTransactionDetail';
import { GLAccountRepository } from '../repositories/GLAccount';
import { GLAccountTypeName } from '../models/GLAccountType';
import { ProposedDetailsMeta } from '../models/FundTransactionMetadata';
import { currency } from '../utilities/currency';
import { createProposedDetails } from './transactionDetail';
import { RequestTransactionContext } from '../context';

export enum TransferType {
    TRANSFER_IN = 'TRANSFER_IN',
    TRANSFER_OUT = 'TRANSFER_OUT'
}

registerEnumType(TransferType, {
    name: 'TransferType'
});

async function executeCreateTransfer(
    manager: EntityManager,
    transferId: string,
    profileId: string | null,
    proposalOnly = false
) {
    const transRepo = manager.getRepository(FundTransaction);
    const detailRepo = manager.getRepository(FundTransactionDetail);
    const customDetailRepo = manager.getCustomRepository(FundTransactionDetailRepository);
    const glRepo = manager.getCustomRepository(GLAccountRepository);
    const unitPriceRepo = manager.getRepository(InvestmentUnitPriceHistory);

    async function createTransferInvestmentMeta(
        transferTransaction: FundTransaction
    ): Promise<ProposedDetailsMeta[]> {
        const transactionDetails = await createProposedDetails(manager, transferTransaction.id);
        return transactionDetails;
    }

    async function createTransferDivestmentMeta(
        transferTransaction: FundTransaction
    ): Promise<ProposedDetailsMeta[]> {
        const transactionDetails = await createProposedDetails(manager, transferTransaction.id);
        return transactionDetails;
    }

    async function saveTransactionDetails(
        proposedDetails: ProposedDetailsMeta[]
    ): Promise<FundTransactionDetail[]> {
        const transDeets = proposedDetails.map(proposedDetail => {
            return manager.create(FundTransactionDetail, {
                ...proposedDetail
            });
        });
        return detailRepo.save(transDeets);
    }

    const transfer = await transRepo.findOne(transferId, {
        relations: ['fund', 'fund.investments', 'fund.investments.investment', 'transactionType']
    });

    let transactionProposedMeta: ProposedDetailsMeta[];

    if (transfer.transactionType.name === TransactionTypeValue.TRANSFER_IN) {
        transactionProposedMeta = await createTransferInvestmentMeta(transfer);
    } else if (transfer.transactionType.name === TransactionTypeValue.TRANSFER_OUT) {
        transactionProposedMeta = await createTransferDivestmentMeta(transfer);
    }

    if (proposalOnly) {
        return transRepo.update(transfer.id, {
            metadata: { ...transfer.metadata, ...{ proposedDetails: transactionProposedMeta } }
        });
    } else {
        return saveTransactionDetails(transactionProposedMeta);
    }
}

async function createTransferDetails(
    manager: EntityManager,
    transferId: string,
    profileId: string | null
) {
    await executeCreateTransfer(manager, transferId, profileId);
}

async function createTransferDetailsFromArray(
    manager: EntityManager,
    transferIds: string[],
    profileId: string | null
) {
    for await (const transferId of transferIds) {
        await executeCreateTransfer(manager, transferId, profileId);
    }
}

async function createTransferMeta(
    manager: EntityManager,
    transferId: string,
    profileId: string | null
) {
    await executeCreateTransfer(manager, transferId, profileId, true);
}

export const createTransfer = async (
    context: RequestTransactionContext,
    userProfileId: string,
    transferId: string,
    input: CreateFundTransferInput
): Promise<FundTransaction> => {
    let resultTransaction: FundTransaction;

    await context.joinTransaction('createTransfer', async (manager, tranContext) => {
        const grantApprovalDisabled = process.env.GRANT_APPROVAL_ENABLED === 'false';

        const transferStatusSubmitted = await manager.findOne(TransactionStatus, {
            name: TransactionStatusValue.SUBMITTED
        });

        const transferStatusPending = await manager.findOne(TransactionStatus, {
            name: TransactionStatusValue.PENDING
        });

        // Get Transaction Detail Status
        const transactionDetailStatus = await manager.findOne(TransactionDetailStatus, {
            name: TransactionDetailStatusValue.PENDING
        });

        const submittedStatus = await manager.findOne(TransactionDetailStatus, {
            name: TransactionDetailStatusValue.SUBMITTED
        });

        // Get Current User
        const userProfile = await manager.findOne(UserProfile, {
            id: userProfileId
        });

        // Get Funds
        const toFund = await manager.findOne(Fund, {
            where: { id: input.toFundId }
        });

        const fromFund = await manager.findOne(Fund, {
            where: { id: input.fromFundId }
        });

        const transferOutType = await manager.findOne(TransactionType, {
            name: TransactionTypeValue.TRANSFER_OUT
        });

        if (input.type === TransferType.TRANSFER_OUT) {
            const transferOutCode = await getTransactionCode(transferOutType, manager);
            const transferType = await manager.findOne(TransactionDetailType, {
                name: TransactionDetailTypeName.TRANSFER_OUT
            });

            // metadata object
            const metaDataObject: TransferMetadata = {
                transactionSource: {
                    id: `temporary_id_${transferId}`,
                    fundDetails: {
                        fundId: fromFund.id,
                        fundCode: fromFund.fundCode,
                        fundName: fromFund.name
                    }
                },
                transactionDestination: {
                    id: `temporary_id_${transferId}`,
                    fundDetails: {
                        fundId: !!toFund ? toFund.id : null,
                        fundCode: !!toFund ? toFund.fundCode : input.toFundCode,
                        fundName: !!toFund ? toFund.name : input.toFundName
                    }
                },
                transferId
            };

            // Create Fund Transaction Record
            const transferOut = await manager.save(
                manager.create(FundTransaction, {
                    fundId: fromFund.id,
                    transactionCode: transferOutCode,
                    transactionRecurrenceId: null,
                    transactionTypeId: transferOutType.id,
                    fundTransactionSourceId: null,
                    amount: -Math.abs(input.amount),
                    transactionStatusId: transferStatusSubmitted.id,
                    userProfileId: userProfileId,
                    createdBy: userProfile.id,
                    updatedBy: userProfile.id,
                    scheduledDate: input.requestDate,
                    metadata: JSON.parse(JSON.stringify(metaDataObject))
                })
            );

            // update metadata with id
            const { metadata } = transferOut;

            const newMetadata = {
                ...metadata,
                transactionSource: {
                    ...metadata.transactionSource,
                    id: transferOut.id
                }
            };

            // parse into JSON object and assigning them to the metadata column for the transfer records just created
            transferOut.metadata = JSON.parse(JSON.stringify(newMetadata));

            //  saving the updated records in the DB
            await manager.save(transferOut);

            const eventName = eventNameFromStatusName(TransactionStatusValue.SUBMITTED);
            await manager.save(
                manager.create(TransactionEvent, {
                    createdBy: userProfile.id,
                    updatedBy: userProfile.id,
                    userProfileId: userProfile.id,
                    fundTransactionId: transferOut.id,
                    name: eventName
                })
            );

            // dont generate these until the transition is processed
            await createTransferMeta(manager, transferOut.id, userProfileId);

            resultTransaction = transferOut;
        } else {
            const transferInType = await manager.findOne(TransactionType, {
                name: TransactionTypeValue.TRANSFER_IN
            });
            const transferInCode = await getTransactionCode(transferInType, manager);

            const transferType = await manager.findOne(TransactionDetailType, {
                name: TransactionDetailTypeName.INVESTMENT
            });

            // Create Fund Transaction Record
            const transferIn = await manager.save(
                manager.create(FundTransaction, {
                    fundId: toFund.id,
                    transactionCode: transferInCode,
                    transactionRecurrenceId: null,
                    transactionTypeId: transferInType.id,
                    fundTransactionSourceId: null,
                    amount: input.amount,
                    transactionStatusId: transferStatusPending.id,
                    userProfileId: userProfileId,
                    createdBy: userProfile.id,
                    updatedBy: userProfile.id,
                    scheduledDate: input.requestDate
                })
            );

            const transferOut = await manager
                .createQueryBuilder()
                .select('transOut')
                .from(FundTransaction, 'transOut')
                .where('transaction_type_id = :transTypeId', {
                    transTypeId: transferOutType.id
                })
                .andWhere('metadata @> :meta', { meta: { transferId } })
                .getOne();

            // metadata object
            const metaDataObject: TransferMetadata = {
                transactionSource: {
                    id: transferOut.id,
                    fundDetails: {
                        fundId: fromFund.id,
                        fundCode: fromFund.fundCode,
                        fundName: fromFund.name
                    }
                },
                transactionDestination: {
                    id: transferIn.id,
                    fundDetails: {
                        fundId: toFund.id,
                        fundCode: toFund.fundCode,
                        fundName: toFund.name
                    }
                },
                transferId
            };

            // convert to JSON string
            const metaDataString = JSON.stringify(metaDataObject);

            // parse into JSON object and assigning them to the metadata column for the transfer records just created and update the old record
            transferIn.metadata = JSON.parse(metaDataString);
            transferOut.metadata = JSON.parse(metaDataString);

            //  saving the updated records in the DB
            await manager.save(transferIn);
            await manager.save(transferOut);

            await createTransferDetails(manager, transferIn.id, userProfileId);

            const eventName = eventNameFromStatusName(TransactionStatusValue.SUBMITTED);

            await manager.save(
                manager.create(TransactionEvent, {
                    createdBy: userProfileId,
                    updatedBy: userProfileId,
                    userProfileId: userProfileId,
                    fundTransactionId: transferIn.id,
                    name: eventName
                })
            );

            resultTransaction = transferIn;
        }
    });

    return resultTransaction;
};

export const updateTransfer = async (
    manager: EntityManager,
    transferId: string,
    input: UpdateFundTransferInput
): Promise<FundTransaction> => {
    // TODO add more edit functionality here... for now it's just updating the metadata for funds updates

    // Get Funds
    const toFund = await manager.findOne(Fund, {
        where: { id: input.toFundId }
    });

    const fromFund = await manager.findOne(Fund, {
        where: { id: input.fromFundId }
    });

    const transferOut = await manager.findOne(FundTransaction, transferId);

    // metadata object
    const metaDataObject: TransferMetadata = {
        ...transferOut.metadata,
        ...{
            transactionSource: {
                id: `temporary_id_${transferId}`,
                fundDetails: {
                    fundId: fromFund.id,
                    fundCode: fromFund.fundCode,
                    fundName: fromFund.name
                }
            },
            transactionDestination: {
                id: `temporary_id_${transferId}`,
                fundDetails: {
                    fundId: toFund.id,
                    fundCode: toFund.fundCode,
                    fundName: toFund.name
                }
            }
        }
    };

    // parse into JSON object and assigning them to the metadata column for the transfer records just created
    transferOut.metadata = JSON.parse(JSON.stringify(metaDataObject));

    //  saving the updated records in the DB
    return await manager.save(transferOut);
};

// start ONE transfer
export const startTransfer = async (manager: EntityManager, transId: string): Promise<boolean> => {
    const [{ id: fundPendingId }] = await manager.query(/* sql */ `
        SELECT id FROM transaction_status WHERE name = '${TransactionStatusValue.PENDING}';
    `);

    const updateResult = await manager
        .createQueryBuilder()
        .update(FundTransaction)
        .set({ transactionStatusId: fundPendingId })
        .where('id = :transId', { transId })
        .execute();

    // dont generate these until the transition is processed
    await createTransferDetails(manager, transId, null);

    return !!updateResult;
};

export const startableTransfersQuery = async (manager: EntityManager, omittedIds: string[]) => {
    const [{ id: fundSubmittedId }] = await manager.query(/* sql */ `
        SELECT id FROM transaction_status WHERE name = '${TransactionStatusValue.SUBMITTED}';
    `);

    const [{ id: transferOutTypeId }] = await manager.query(/* sql */ `
        SELECT id FROM transaction_type WHERE name = '${TransactionTypeValue.TRANSFER_OUT}';
    `);

    const transQuery = manager
        .createQueryBuilder()
        .select('ft.id')
        .addSelect('ft.fundId')
        .addSelect('ft.amount')
        .from(FundTransaction, 'ft')
        .leftJoin('ft.fund', 'fund')
        .where('ft.transactionStatusId = :fundSubmittedId', { fundSubmittedId })
        .andWhere('ft.transactionTypeId = :transferOutTypeId', { transferOutTypeId })
        .andWhere(
            'ft.metadata::JSONB  #> \'{"transactionDestination","fundDetails","fundId" }\' != \'null\' '
        )
        .andWhere('ft.onHold = FALSE');

    if (omittedIds.length > 0) {
        transQuery.andWhere('ft.id NOT IN (:...omittedIds)', { omittedIds });
    }

    return transQuery;
};

export const startTransfers = async (manager: EntityManager, ids: string[]): Promise<string[]> => {
    const [{ id: fundPendingId }] = await manager.query(/* sql */ `
        SELECT id FROM transaction_status WHERE name = '${TransactionStatusValue.PENDING}';
    `);

    const transQuery = await startableTransfersQuery(manager, ids);
    const queried = await transQuery.getMany();

    const fundsWithout = await fundsWithoutBalanceFromFundTransactions(
        queried,
        manager.getCustomRepository(FundRepository)
    );

    const filteredTransactions = [] as FundTransaction[];
    const underfundedTransactions = [] as FundTransaction[];

    for (const transaction of queried) {
        if (fundsWithout.includes(transaction.fundId)) {
            underfundedTransactions.push(transaction);
        } else {
            filteredTransactions.push(transaction);
        }
    }

    const affectedIds = filteredTransactions.map(trans => trans.id);
    const underfundedIds = underfundedTransactions.map(trans => trans.id);

    if (underfundedIds.length) {
        await manager
            .createQueryBuilder()
            .update(FundTransaction)
            .set({ onHold: true })
            .where({ id: In(underfundedIds) })
            .execute();
    }

    if (affectedIds.length) {
        await manager
            .createQueryBuilder()
            .update(FundTransaction)
            .set({ transactionStatusId: fundPendingId })
            .where({ id: In(affectedIds) })
            .execute();
    }

    // don't generate these until the transition is processed
    createTransferDetailsFromArray(manager, affectedIds, null);

    return affectedIds;
};
