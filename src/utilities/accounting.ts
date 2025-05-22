import { EntityManager } from 'typeorm';
import { AccountingFacade } from '../accounting';
import { Fund, FundTransactionDetail, GLAccount, GLAccountType, Recipient, InstitutionAccountTransaction } from '../models';
import { InternalLedgerFundCodes } from '../models/Fund';
import { GLAccountTypeName } from '../models/GLAccountType';
import { InvestmentType } from '../models/Investment';
import { TransactionDetailTypeName } from '../models/TransactionDetailType';
import { GLAccountRepository } from '../repositories/GLAccount';
import { LocationEntityRepository } from '../repositories/LocationEntity';
import { currency } from './currency';
import { dayjs } from './datetime';
import { isType } from './transactionDetail';

type AccountsByType = {
    [key in GLAccountTypeName]: GLAccount;
};
type AccountsById = {
    [key: string]: GLAccount;
};
export const accountingUtil = {
    async postContributionCashEntries(manager: EntityManager, details: FundTransactionDetail[]) {
        if (process.env.POST_JOURNAL_ENTRIES) {
            const accounting = new AccountingFacade();
            const detailRepo = manager.getRepository(FundTransactionDetail);
            // Location entity for all transactions related to DAFs
            const dafLocationEntity = await manager
                .getCustomRepository(LocationEntityRepository)
                .getDAFLocationEntity();

            const glAccounts = await this.getGLAccountsById(manager);

            const allRelatedDetails = await detailRepo
                .createQueryBuilder('transactionDetail')
                .leftJoinAndSelect(
                    'transactionDetail.transactionDetailType',
                    'transactionDetailType'
                )
                .where('transactionDetail.fundTransactionId IN (:...transactionIds)', {
                    transactionIds: details.map(d => d.fundTransactionId)
                })
                .getMany();

            const detailsByBatch = details.reduce((byBatch, detail) => {
                if (!byBatch.hasOwnProperty(detail.batchId)) {
                    byBatch[detail.batchId] = {
                        batch: detail.batch,
                        transactionDetails: []
                    };
                }
                byBatch[detail.batchId].transactionDetails.push(detail);
                return byBatch;
            }, {});

            const journalEntryBatches = [];
            for (const batchId in detailsByBatch) {
                const journalEntries = [];
                const { batch, transactionDetails } = detailsByBatch[batchId];
                for (const detail of transactionDetails) {
                    const parentTransaction = detail.fundTransaction;
                    const fund = parentTransaction.fund;
                    const siblingDetails = allRelatedDetails.filter(
                        d => d.fundTransactionId === parentTransaction.id
                    );
                    const feeTransaction = siblingDetails.find(
                        isType(TransactionDetailTypeName.FEE)
                    );

                    let totalAmount = detail.amount;

                    if (feeTransaction) {
                        totalAmount = currency.add(detail.amount, feeTransaction.amount);
                        const feeDebitEntry = accounting.createJournalEntryObject(
                            glAccounts[feeTransaction.destinationAccountId].accountNumber,
                            `Credit card processing fee for contribution ${detail.transactionCode}`,
                            feeTransaction.amount,
                            feeTransaction.transactionCode,
                            fund.accountingProjectId,
                            parentTransaction.userProfile.accountingCustomerId,
                            dafLocationEntity.locationId,
                            null,
                            [['GLDIM990FUNCTIONAL_EXPENSE_GROUP', '10003']]
                        );
                        journalEntries.push(feeDebitEntry);
                    }

                    const creditEntry = accounting.createJournalEntryObject(
                        glAccounts[detail.sourceAccountId].accountNumber,
                        `Contribution ${detail.transactionCode}`,
                        totalAmount * -1,
                        detail.transactionCode,
                        fund.accountingProjectId,
                        parentTransaction.userProfile.accountingCustomerId,
                        dafLocationEntity.locationId
                    );
                    const debitEntry = accounting.createJournalEntryObject(
                        glAccounts[detail.destinationAccountId].accountNumber,
                        `Contribution ${detail.transactionCode}`,
                        detail.amount,
                        detail.transactionCode,
                        fund.accountingProjectId,
                        parentTransaction.userProfile.accountingCustomerId,
                        dafLocationEntity.locationId
                    );
                    journalEntries.push(creditEntry, debitEntry);
                }
                journalEntryBatches.push({
                    batch: batch,
                    journalEntries: journalEntries,
                    transactionDetails: transactionDetails
                });
            }
            for (const journalEntryBatch of journalEntryBatches) {
                try {
                    const today = dayjs().format('YYYY-MM-DD HH:mm');
                    const ledgerId = await accounting.createJournalEntryBatch(
                        journalEntryBatch.journalEntries,
                        journalEntryBatch.batch.description,
                        journalEntryBatch.batch.batchCode
                    );
                    await detailRepo
                        .createQueryBuilder('transactionDetail')
                        .update()
                        .whereInIds(details.map(d => d.id))
                        .set({ ledgerId: ledgerId })
                        .execute();
                } catch (error) {
                    console.log('Unable to post contribution journal entries');
                    console.log(error);
                }
            }
        }
    },
    async postGrantPaymentJournalEntries(manager: EntityManager, details: FundTransactionDetail[]) {
        if (process.env.POST_JOURNAL_ENTRIES) {
            const accounting = new AccountingFacade();
            const detailRepo = manager.getRepository(FundTransactionDetail);
            // Location entity for all transactions related to DAFs
            const dafLocationEntity = await manager
                .getCustomRepository(LocationEntityRepository)
                .getDAFLocationEntity();
            const glAccounts = await this.getGLAccountsById(manager);

            const parentIds = details.map(d => d.fundTransactionId);
            const recipients = await manager
                .getRepository(Recipient)
                .createQueryBuilder('recipient')
                .innerJoin('recipient.fundDestinations', 'fundTransactionInfo')
                .innerJoin('fundTransactionInfo.fundTransaction', 'fundTransaction')
                .where('fundTransaction.id IN (:...transactionIds)', { transactionIds: parentIds })
                .select('fundTransaction.id', 'fundTransactionId')
                .addSelect('recipient.id', 'recipientId')
                .addSelect('recipient.accountingVendorId', 'accountingVendorId')
                .getRawMany();

            const recipientMap = recipients.reduce(
                (map: { [fundTransactionId: string]: string }, item) => {
                    map[item.fundTransactionId] = item.accountingVendorId;
                    return map;
                },
                {}
            );

            const detailsByBatch = details.reduce((byBatch, detail) => {
                if (!byBatch.hasOwnProperty(detail.batchId)) {
                    byBatch[detail.batchId] = {
                        batch: detail.batch,
                        transactionDetails: []
                    };
                }
                byBatch[detail.batchId].transactionDetails.push(detail);
                return byBatch;
            }, {});

            const journalEntryBatches = [];
            for (const batchId in detailsByBatch) {
                const journalEntries = [];
                const { batch, transactionDetails } = detailsByBatch[batchId];
                for (const detail of transactionDetails) {
                    const parentTransaction = detail.fundTransaction;
                    const fund = parentTransaction.fund;
                    const recipientVendorId = recipientMap[parentTransaction.id];
                    const creditEntry = accounting.createJournalEntryObject(
                        glAccounts[detail.sourceAccountId].accountNumber,
                        parentTransaction.metadata?.transactionPayment?.paymentMemo ??
                            `${batch.paymentType} PAYMENT FOR GRANT ${parentTransaction.transactionCode}`,
                        detail.amount,
                        detail.transactionCode,
                        fund.accountingProjectId,
                        null,
                        dafLocationEntity.locationId,
                        recipientVendorId
                    );
                    const debitEntry = accounting.createJournalEntryObject(
                        glAccounts[detail.destinationAccountId].accountNumber,
                        parentTransaction.metadata?.transactionPayment?.paymentMemo ??
                            `${batch.paymentType} PAYMENT FOR GRANT ${parentTransaction.transactionCode}`,
                        detail.amount * -1,
                        detail.transactionCode,
                        fund.accountingProjectId,
                        null,
                        dafLocationEntity.locationId,
                        recipientVendorId
                    );
                    journalEntries.push(creditEntry, debitEntry);
                }
                journalEntryBatches.push({
                    batch: batch,
                    journalEntries: journalEntries,
                    transactionDetails: transactionDetails
                });
            }
            for (const journalEntryBatch of journalEntryBatches) {
                try {
                    const today = dayjs().format('YYYY-MM-DD HH:mm');
                    const ledgerId = await accounting.createJournalEntryBatch(
                        journalEntryBatch.journalEntries,
                        journalEntryBatch.batch.description,
                        journalEntryBatch.batch.batchCode
                    );
                    detailRepo
                        .createQueryBuilder('transactionDetail')
                        .update()
                        .whereInIds(journalEntryBatch.transactionDetails.map(d => d.id))
                        .set({ ledgerId: ledgerId })
                        .execute();
                } catch (error) {
                    console.log('Unable to post grant payment journal entries');
                    console.log(error);
                }
            }
        }
    },
    async postInterestJournalEntries(manager: EntityManager, details: FundTransactionDetail[]) {
        if (process.env.POST_JOURNAL_ENTRIES) {
            const dafLocationEntity = await manager
                .getCustomRepository(LocationEntityRepository)
                .getDAFLocationEntity();
            const fundRepo = manager.getRepository(Fund);
            const detailRepo = manager.getRepository(FundTransactionDetail);
            const interestFund = await fundRepo.findOne({
                fundCode: InternalLedgerFundCodes.INTEREST
            });
            const accounting = new AccountingFacade();
            const [glAccountsByType, glAccountsById] = await Promise.all([
                this.getGLAccountsByType(manager),
                this.getGLAccountsById(manager)
            ]);
            const interestIncomeAccount = glAccountsByType[GLAccountTypeName.INTEREST_INCOME];
            const detailsByBatch = details.reduce((byBatch, detail) => {
                if (!byBatch.hasOwnProperty(detail.batchId)) {
                    const investmentType = detail.fundInvestment.investment.investmentType;
                    byBatch[detail.batchId] = {
                        batch: detail.batch,
                        investmentType: investmentType,
                        transactionDetails: []
                    };
                }
                byBatch[detail.batchId].transactionDetails.push(detail);
                return byBatch;
            }, {});

            const journalEntryBatches = [];
            for (const batchId in detailsByBatch) {
                const journalEntries = [];
                const { batch, investmentType, transactionDetails } = detailsByBatch[batchId];
                for (const detail of details) {
                    let projectId = interestFund.accountingProjectId;
                    if (investmentType === InvestmentType.POOL) {
                        const poolLedgerFund = detail.fundInvestment.investment.subledgerFund;
                        projectId = poolLedgerFund.accountingProjectId;
                    }
                    const creditEntry = accounting.createJournalEntryObject(
                        interestIncomeAccount.accountNumber,
                        'Interest earned',
                        detail.amount * -1,
                        detail.transactionCode,
                        projectId,
                        null,
                        dafLocationEntity.locationId
                    );
                    const debitEntry = accounting.createJournalEntryObject(
                        glAccountsById[detail.destinationAccountId].accountNumber,
                        'Interest earned',
                        detail.amount,
                        detail.transactionCode,
                        projectId,
                        null,
                        dafLocationEntity.locationId
                    );
                }
                journalEntryBatches.push({
                    batch: batch,
                    journalEntries: journalEntries,
                    transactionDetails: transactionDetails
                });
            }
            for (const journalEntryBatch of journalEntryBatches) {
                try {
                    const today = dayjs().format('YYYY-MM-DD HH:mm');
                    const ledgerId = await accounting.createJournalEntryBatch(
                        journalEntryBatch.journalEntries,
                        journalEntryBatch.batch.description,
                        journalEntryBatch.batch.batchCode
                    );
                    detailRepo
                        .createQueryBuilder('transactionDetail')
                        .update()
                        .whereInIds(journalEntryBatch.transactionDetails.map(d => d.id))
                        .set({ ledgerId: ledgerId })
                        .execute();
                } catch (error) {
                    console.log('Unable to post interest journal entries');
                    console.log(error);
                }
            }
        }
    },
    async postDividendJournalEntries(manager: EntityManager, details: FundTransactionDetail[]) {
        if (process.env.POST_JOURNAL_ENTRIES) {
            const dafLocationEntity = await manager
                .getCustomRepository(LocationEntityRepository)
                .getDAFLocationEntity();
            const fundRepo = manager.getRepository(Fund);
            const detailRepo = manager.getRepository(FundTransactionDetail);
            const accounting = new AccountingFacade();
            const [glAccountsByType, glAccountsById] = await Promise.all([
                this.getGLAccountsByType(manager),
                this.getGLAccountsById(manager)
            ]);
            const dividendIncomeAccount = glAccountsByType[GLAccountTypeName.DIVIDEND_INCOME];
            const detailsByBatch = details.reduce((byBatch, detail) => {
                if (!byBatch.hasOwnProperty(detail.batchId)) {
                    const investmentType = detail.fundInvestment.investment.investmentType;
                    byBatch[detail.batchId] = {
                        batch: detail.batch,
                        investmentType: investmentType,
                        transactionDetails: []
                    };
                }
                byBatch[detail.batchId].transactionDetails.push(detail);
                return byBatch;
            }, {});

            const journalEntryBatches = [];
            for (const batchId in detailsByBatch) {
                const journalEntries = [];
                const { batch, investmentType, transactionDetails } = detailsByBatch[batchId];
                for (const detail of details) {
                    let projectId = detail.fundInvestment.fund.accountingProjectId;
                    if (investmentType === InvestmentType.POOL) {
                        const poolLedgerFund = detail.fundInvestment.investment.subledgerFund;
                        projectId = poolLedgerFund.accountingProjectId;
                    }
                    const creditEntry = accounting.createJournalEntryObject(
                        dividendIncomeAccount.accountNumber,
                        'Interest earned',
                        detail.amount * -1,
                        detail.transactionCode,
                        projectId,
                        null,
                        dafLocationEntity.locationId
                    );
                    const debitEntry = accounting.createJournalEntryObject(
                        glAccountsById[detail.destinationAccountId].accountNumber,
                        'Interest earned',
                        detail.amount,
                        detail.transactionCode,
                        projectId,
                        null,
                        dafLocationEntity.locationId
                    );
                }
                journalEntryBatches.push({
                    batch: batch,
                    journalEntries: journalEntries,
                    transactionDetails: transactionDetails
                });
            }
            for (const journalEntryBatch of journalEntryBatches) {
                try {
                    const today = dayjs().format('YYYY-MM-DD HH:mm');
                    const ledgerId = await accounting.createJournalEntryBatch(
                        journalEntryBatch.journalEntries,
                        journalEntryBatch.batch.description,
                        journalEntryBatch.batch.batchCode
                    );
                    detailRepo
                        .createQueryBuilder('transactionDetail')
                        .update()
                        .whereInIds(journalEntryBatch.transactionDetails.map(d => d.id))
                        .set({ ledgerId: ledgerId })
                        .execute();
                } catch (error) {
                    console.log('Unable to post dividend journal entries');
                    console.log(error);
                }
            }
        }
    },
    async postDivestmentJournalEntries(manager: EntityManager, details: FundTransactionDetail[]) {
        if (process.env.POST_JOURNAL_ENTRIES) {
            const detailRepo = manager.getRepository(FundTransactionDetail);
            // Location entity for all transactions related to DAFs
            const dafLocationEntity = await manager
                .getCustomRepository(LocationEntityRepository)
                .getDAFLocationEntity();
            const accounting = new AccountingFacade();
            const glAccounts = await this.getGLAccountsById(manager);
            const allRelatedDetails = await detailRepo
                .createQueryBuilder('transactionDetail')
                .leftJoinAndSelect(
                    'transactionDetail.transactionDetailType',
                    'transactionDetailType'
                )
                .where('transactionDetail.fundTransactionId IN (:...transactionIds)', {
                    transactionIds: details.map(d => d.fundTransactionId)
                })
                .getMany();
            const detailsByBatch = details.reduce((byBatch, detail) => {
                if (!byBatch.hasOwnProperty(detail.batchId)) {
                    byBatch[detail.batchId] = {
                        batch: detail.batch,
                        transactionDetails: []
                    };
                }
                byBatch[detail.batchId].transactionDetails.push(detail);
                return byBatch;
            }, {});
            const journalEntryBatches = [];

            for (const batchId in detailsByBatch) {
                const journalEntries = [];
                const { batch, transactionDetails } = detailsByBatch[batchId];
                for (const detail of transactionDetails) {
                    const parentTransaction = detail.fundTransaction;
                    const fund = parentTransaction.fund;
                    const totalAmount = Math.abs(detail.amount);

                    const creditEntry = accounting.createJournalEntryObject(
                        glAccounts[detail.sourceAccountId].accountNumber,
                        `Divestment ${detail.transactionCode}`,
                        totalAmount * -1,
                        detail.transactionCode,
                        fund.accountingProjectId,
                        parentTransaction.userProfile.accountingCustomerId,
                        dafLocationEntity.locationId
                    );
                    const debitEntry = accounting.createJournalEntryObject(
                        glAccounts[detail.destinationAccountId].accountNumber,
                        `Divestment ${detail.transactionCode}`,
                        totalAmount,
                        detail.transactionCode,
                        fund.accountingProjectId,
                        parentTransaction.userProfile.accountingCustomerId,
                        dafLocationEntity.locationId
                    );
                    journalEntries.push(creditEntry, debitEntry);
                }
                journalEntryBatches.push({
                    batch: batch,
                    journalEntries: journalEntries,
                    transactionDetails: transactionDetails
                });
            }
            for (const journalEntryBatch of journalEntryBatches) {
                try {
                    const ledgerId = await accounting.createJournalEntryBatch(
                        journalEntryBatch.journalEntries,
                        journalEntryBatch.batch.description,
                        journalEntryBatch.batch.batchCode
                    );
                    await detailRepo
                        .createQueryBuilder('transactionDetail')
                        .update()
                        .whereInIds(details.map(d => d.id))
                        .set({ ledgerId: ledgerId })
                        .execute();
                } catch (error) {
                    console.log('Unable to post divestment journal entries');
                    console.log(error);
                }
            }
        }
    },
    async postContributionJournalEntries(manager: EntityManager, details: FundTransactionDetail[]) {
        if (process.env.POST_JOURNAL_ENTRIES) {
            const detailRepo = manager.getRepository(FundTransactionDetail);
            // Location entity for all transactions related to DAFs
            const dafLocationEntity = await manager
                .getCustomRepository(LocationEntityRepository)
                .getDAFLocationEntity();
            const accounting = new AccountingFacade();
            const glAccounts = await this.getGLAccountsById(manager);
            const allRelatedDetails = await detailRepo
                .createQueryBuilder('transactionDetail')
                .leftJoinAndSelect(
                    'transactionDetail.transactionDetailType',
                    'transactionDetailType'
                )
                .where('transactionDetail.fundTransactionId IN (:...transactionIds)', {
                    transactionIds: details.map(d => d.fundTransactionId)
                })
                .getMany();
            const detailsByBatch = details.reduce((byBatch, detail) => {
                if (!byBatch.hasOwnProperty(detail.batchId)) {
                    byBatch[detail.batchId] = {
                        batch: detail.batch,
                        transactionDetails: []
                    };
                }
                byBatch[detail.batchId].transactionDetails.push(detail);
                return byBatch;
            }, {});
            const journalEntryBatches = [];

            for (const batchId in detailsByBatch) {
                const journalEntries = [];
                const { batch, transactionDetails } = detailsByBatch[batchId];
                for (const detail of transactionDetails) {
                    const parentTransaction = detail.fundTransaction;
                    const fund = parentTransaction.fund;
                    const totalAmount = Math.abs(detail.amount);

                    const creditEntry = accounting.createJournalEntryObject(
                        glAccounts[detail.sourceAccountId].accountNumber,
                        `Contribution ${detail.transactionCode}`,
                        totalAmount * -1,
                        detail.transactionCode,
                        fund.accountingProjectId,
                        parentTransaction.userProfile.accountingCustomerId,
                        dafLocationEntity.locationId
                    );
                    const debitEntry = accounting.createJournalEntryObject(
                        glAccounts[detail.destinationAccountId].accountNumber,
                        `Contribution ${detail.transactionCode}`,
                        totalAmount,
                        detail.transactionCode,
                        fund.accountingProjectId,
                        parentTransaction.userProfile.accountingCustomerId,
                        dafLocationEntity.locationId
                    );
                    journalEntries.push(creditEntry, debitEntry);
                }
                journalEntryBatches.push({
                    batch: batch,
                    journalEntries: journalEntries,
                    transactionDetails: transactionDetails
                });
            }
            for (const journalEntryBatch of journalEntryBatches) {
                try {
                    const ledgerId = await accounting.createJournalEntryBatch(
                        journalEntryBatch.journalEntries,
                        journalEntryBatch.batch.description,
                        journalEntryBatch.batch.batchCode
                    );
                    await detailRepo
                        .createQueryBuilder('transactionDetail')
                        .update()
                        .whereInIds(details.map(d => d.id))
                        .set({ ledgerId: ledgerId })
                        .execute();
                } catch (error) {
                    console.log('Unable to post contribution journal entries');
                    console.log(error);
                }
            }
        }
    },
    async postGainLossJournalEntries(manager: EntityManager, details: FundTransactionDetail[]) {
        if (process.env.POST_JOURNAL_ENTRIES) {
            const detailRepo = manager.getRepository(FundTransactionDetail);
            const instituteDetailRepo = manager.getRepository(InstitutionAccountTransaction);
            // Location entity for all transactions related to DAFs
            const dafLocationEntity = await manager
                .getCustomRepository(LocationEntityRepository)
                .getDAFLocationEntity();
            const accounting = new AccountingFacade();
            const glAccounts = await this.getGLAccountsById(manager);
            
            const detailsByBatch = details.reduce((byBatch, detail) => {
                if (!byBatch.hasOwnProperty(detail.batchId)) {
                    byBatch[detail.batchId] = {
                        batch: detail.batch,
                        transactionDetails: []
                    };
                }
                byBatch[detail.batchId].transactionDetails.push(detail);
                return byBatch;
            }, {});
            const journalEntryBatches = [];

            for (const batchId in detailsByBatch) {
                const journalEntries = [];
                const { batch, transactionDetails } = detailsByBatch[batchId];
                for (const detail of transactionDetails) {
                    const parentTransaction = detail.fundTransaction;
                    const fund = parentTransaction.fund;

                    const instituteTransaction = await instituteDetailRepo.findOne({ batchId: detail.batchId });

                    if(instituteTransaction)
                    {
                    
                        const realizedData = instituteTransaction.realizedGain;

                        if(realizedData !== null){ 
                            const creditAccount = glAccounts[detail.sourceAccountId].accountNumber;
                            const debitAccount = glAccounts[detail.destinationAccountId].accountNumber;

                            if(realizedData<0){
                                const debitAccount = glAccounts[detail.sourceAccountId].accountNumber;
                                const creditAccount = glAccounts[detail.destinationAccountId].accountNumber;
                            }
                           

                            const creditEntry = accounting.createJournalEntryObject(
                                creditAccount,
                                `Realized Gain ${detail.transactionCode}`,
                                Math.abs(realizedData) * -1,
                                detail.transactionCode,
                                fund.accountingProjectId,
                                parentTransaction.userProfile.accountingCustomerId,
                                dafLocationEntity.locationId
                            );
                            const debitEntry = accounting.createJournalEntryObject(
                                debitAccount,
                                `Realized Gain ${detail.transactionCode}`,
                                Math.abs(realizedData),
                                detail.transactionCode,
                                fund.accountingProjectId,
                                parentTransaction.userProfile.accountingCustomerId,
                                dafLocationEntity.locationId
                            );
                            journalEntries.push(creditEntry, debitEntry);
                        }
                    }
                }
                journalEntryBatches.push({
                    batch: batch,
                    journalEntries: journalEntries,
                    transactionDetails: transactionDetails
                });
            }
            for (const journalEntryBatch of journalEntryBatches) {
                try {
                    const ledgerId = await accounting.createJournalEntryBatch(
                        journalEntryBatch.journalEntries,
                        journalEntryBatch.batch.description,
                        journalEntryBatch.batch.batchCode
                    );
                    await detailRepo
                        .createQueryBuilder('transactionDetail')
                        .update()
                        .whereInIds(details.map(d => d.id))
                        .set({ ledgerId: ledgerId })
                        .execute();
                } catch (error) {
                    console.log('postGainLossJournalEntries: Unable to post realized gains/losses - ${error.message}');
                    
                }
            }
        }
    },
    async getGLAccountsByType(manager: EntityManager): Promise<AccountsByType> {
        const glAccountTypeRepo = manager.getRepository(GLAccountType);

        const accountTypes = await glAccountTypeRepo
            .createQueryBuilder('glAccountType')
            .innerJoinAndSelect('glAccountType.glAccounts', 'glAccounts')
            .where('glAccountType.name != :sweepType', { sweepType: GLAccountTypeName.SWEEP })
            .andWhere('glAccountType.name != :investmentType', {
                investmentType: GLAccountTypeName.INVESTMENT
            })
            .getMany();

        const accountsByType = accountTypes.reduce((accountsByType, accountType) => {
            accountsByType[accountType.name] = accountType.glAccounts[0];
            return accountsByType;
        }, {});

        return accountsByType as AccountsByType;
    },

    async getGLAccountsById(manager: EntityManager): Promise<AccountsById> {
        const glAccountRepo = manager.getCustomRepository(GLAccountRepository);

        const accounts = await glAccountRepo.createQueryBuilder('glAccount').getMany();

        const accountsById = accounts.reduce((accountsById, account) => {
            accountsById[account.id] = account;
            return accountsById;
        }, {});

        return accountsById as AccountsById;
    },

    async getGLAccountsByInvestment(manager: EntityManager): Promise<AccountsById> {
        const glAccountRepo = manager.getCustomRepository(GLAccountRepository);

        const accounts = await glAccountRepo
            .createQueryBuilder('glAccount')
            .innerJoinAndSelect('glAccount.investment', 'investment')
            .getMany();

        const accountsById = accounts.reduce((accountsById, account) => {
            accountsById[account.investment.id] = account;
            return accountsById;
        }, {});

        return accountsById as AccountsById;
    }
};
