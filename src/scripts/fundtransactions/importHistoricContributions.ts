import { getOrCreateConnection } from '../../typeorm';

import * as csv from 'fast-csv';
import * as fs from 'fs';
import * as path from 'path';
import dayjs from 'dayjs';
import { In } from 'typeorm';
import { finished } from 'stream';

import {
    FundTransaction,
    Fund,
    TransactionType,
    TransactionStatus,
    UserProfile,
    UserProfileAccount,
    FundTransactionDetail,
    TransactionDetailType,
    TransactionDetailStatus,
    FundInvestment,
    Security,
    UserProfileRole,
    Role
} from '../../models';
import { TransactionTypeValue } from '../../models/TransactionType';
import { TransactionStatusValue } from '../../models/TransactionStatus';
import { TransactionMetadata } from '../../models/FundTransactionMetadata';
import { TransactionDetailTypeName } from '../../models/TransactionDetailType';
import { TransactionDetailStatusValue } from '../../models/TransactionDetailStatus';
import { GLAccountTypeName } from '../../models/GLAccountType';
import { accountingUtil } from '../../utilities/accounting';
import { FundInvestmentRepository } from '../../repositories/FundInvestment';
import { DetailPaymentType } from '../../models/FundTransactionDetail';
import { RoleTypeValues } from '../../models/UserProfileRole';
import { FundTransactionDetailRepository } from '../../repositories/FundTransactionDetail';
import { currency } from '../../utilities/currency';

interface Row {
    historicalOrBlackout: 'Historical' | 'Blackout Period';
    transactionCode: string;
    fundKey: string;
    fundName: string; // maybe be empty
    fundCode: string;
    donorName: string;
    donorUserCode: string; // may be empty
    userProfileId: string; // may be empty
    contributionDate: string;
    quantity: string;
    average: string;
    amount: string;
    donationType: 'Other' | 'Security';
    assetName: string;
    ticker: string; // may be empty
    CUSIP: string; // may be empty
}

const timeLabel = 'importHistoricContributions';

(async () => {
    console.log('importing historic transactions');
    console.time(timeLabel);

    const connection = await getOrCreateConnection();

    const [filePath] = process.argv.slice(2);

    // passed as argument or default to file in release-scripts/data dir
    const file =
        filePath ||
        path.resolve(__dirname, '../../..', 'release-scripts', 'data', 'historicContributions.csv');

    const fundTransactionRepo = connection.manager.getRepository(FundTransaction);
    const fundTransactionDetailRepo = connection.manager.getCustomRepository(
        FundTransactionDetailRepository
    );
    const fundRepo = connection.manager.getRepository(Fund);
    const userProfileRepo = connection.manager.getRepository(UserProfile);
    const userProfileAccountRepo = connection.manager.getRepository(UserProfileAccount);
    const securityRepo = connection.manager.getRepository(Security);

    // fetch types, statuses, and gl accounts
    const [
        contributionType,
        completeStatus,
        detailTypes,
        completeDetailStatus,
        donorRole,
        glAccounts
    ] = await Promise.all([
        connection.manager
            .getRepository(TransactionType)
            .findOne({ name: TransactionTypeValue.CONTRIBUTION }),
        connection.manager
            .getRepository(TransactionStatus)
            .findOne({ name: TransactionStatusValue.COMPLETE }),
        connection.manager.getRepository(TransactionDetailType).find({
            where: {
                name: In([
                    TransactionDetailTypeName.FEE,
                    TransactionDetailTypeName.CASH_IN,
                    TransactionDetailTypeName.STOCK_IN
                ])
            }
        }),
        connection.manager
            .getRepository(TransactionDetailStatus)
            .findOne({ name: TransactionDetailStatusValue.COMPLETE }),
        connection.manager.getRepository(Role).findOne({ name: RoleTypeValues.DONOR }),
        accountingUtil.getGLAccountsByType(connection.manager)
    ]);

    // reformat to object for quicker lookup
    const detailTypeIds: { [detailTypeName: string]: string } = detailTypes.reduce((acc, type) => {
        acc[type.name] = type.id;
        return acc;
    }, {});

    // cache for funds
    const cachedFunds: { fund: Fund; fundInvestment: FundInvestment }[] = [];
    const fetchFundsFromCache = async (fundData: {
        id?: string;
        fundKey?: string;
        fundCode?: string;
        name?: string;
    }): Promise<{ fund: Fund; fundInvestment: FundInvestment }> => {
        // fetch from cache
        const cached = cachedFunds.find(({ fund }) => {
            // check all available fund properties
            let hasValue = false;
            for (const key in fundData) {
                if (fund[key] === fundData[key]) {
                    hasValue = true;
                    break;
                }
            }
            return hasValue;
        });
        if (cached) return Promise.resolve(cached);

        // fetch from db and store in cache
        const fund = await fundRepo.findOneOrFail({
            where: [
                fundData.id?.length ? { id: fundData.id } : false,
                fundData.fundKey?.length ? { fundKey: fundData.fundKey } : false,
                fundData.fundCode?.length ? { fundCode: fundData.fundCode } : false,
                fundData.name?.length ? { name: fundData.name } : false
            ].filter(Boolean)
        });
        const fundInvestment = await connection.manager
            .getCustomRepository(FundInvestmentRepository)
            .getContributionCashInvestmentForFund(fund.id);

        const results = { fund, fundInvestment };
        cachedFunds.push(results);

        return results;
    };

    const fetchSecurity = async (securityData: {
        tickerSymbol: string;
        cusip: string;
        name: string;
    }): Promise<Security> => {
        const security = await securityRepo.findOneOrFail({
            where: [
                securityData.tickerSymbol.length
                    ? { tickerSymbol: securityData.tickerSymbol }
                    : false,
                securityData.cusip.length ? { cusip: securityData.cusip } : false,
                securityData.name.length ? { name: securityData.name } : false
            ].filter(Boolean)
        });
        return security;
    };

    const fetchUserProfiles = async (userData: {
        id: string;
        donorUserCode: string;
        donorName: string;
    }): Promise<{
        userProfileId: string;
        userProfileAccountId: string;
    }> => {
        const [first, last] = userData.donorName.split(',');

        const [userProfile, userProfileAccount] = await Promise.all([
            userProfileRepo.findOne({
                where: [
                    userData.id.length ? { id: userData.id } : false,
                    userData.donorUserCode.length ? { userCode: userData.donorUserCode } : false,
                    first && last ? { firstName: first.trim(), lastName: last.trim() } : false
                ].filter(Boolean)
            }),
            userData.id.length
                ? userProfileAccountRepo.findOne({ userProfileId: userData.id })
                : Promise.resolve(undefined)
        ]);

        const results = {
            userProfileId: userProfile?.id,
            userProfileAccountId: userProfileAccount?.id
        };
        // create user if doesn't exist
        if (!results.userProfileId) {
            const user = await userProfileRepo.save(
                userProfileRepo.create({
                    firstName: first,
                    lastName: last,
                    userCode: userData.donorUserCode
                })
            );
            await connection.manager.getRepository(UserProfileRole).save({
                userProfileId: user.id,
                roleId: donorRole.id
            });

            results.userProfileId = user.id;
        }
        if (!results.userProfileAccountId) {
            /** @todo what do i do? */
        }

        return results;
    };

    // helper function to generate detail records
    const createAndSaveDetailRecords = async (contributions: FundTransaction[]) => {
        // create fund transaction details
        const cashOrStockEntities: FundTransactionDetail[] = [];
        const feeEntities: FundTransactionDetail[] = [];

        for await (const contribution of contributions) {
            const { fundInvestment } = await fetchFundsFromCache({ id: contribution.fundId });

            // fee
            feeEntities.push(
                fundTransactionDetailRepo.create({
                    fundTransactionId: contribution.id,
                    transactionDetailTypeId: detailTypeIds[TransactionDetailTypeName.FEE],
                    transactionDetailStatusId: completeDetailStatus.id,
                    amount: 0,
                    createdBy: contribution.createdBy,
                    updatedBy: contribution.createdBy,
                    sourceAccountId: glAccounts[GLAccountTypeName.CONTRIBUTION_REVENUE].id,
                    destinationAccountId: glAccounts[GLAccountTypeName.CREDIT_CARD_FEES].id
                })
            );

            // create cash or stock depending on metadata
            const isSecurity =
                contribution.metadata.paymentDetails.paymentType === DetailPaymentType.SECURITY;

            cashOrStockEntities.push(
                fundTransactionDetailRepo.create({
                    // fk
                    fundTransactionId: contribution.id,
                    fundInvestmentId: fundInvestment.id,
                    // source/types/amount
                    transactionDetailTypeId: isSecurity
                        ? detailTypeIds[TransactionDetailTypeName.STOCK_IN]
                        : detailTypeIds[TransactionDetailTypeName.CASH_IN],
                    transactionDetailStatusId: completeDetailStatus.id,
                    amount: contribution.amount,
                    // timestamps/user
                    createdBy: contribution.createdBy,
                    updatedBy: contribution.createdBy,
                    createdOn: contribution.createdOn,
                    updatedOn: contribution.updatedOn,
                    // source/destination
                    sourceAccountId: isSecurity
                        ? glAccounts[GLAccountTypeName.CONTRIBUTION_REVENUE_NONCASH].id
                        : glAccounts[GLAccountTypeName.CONTRIBUTION_REVENUE].id,
                    destinationAccountId: isSecurity
                        ? glAccounts[GLAccountTypeName.SHARED_STOCK].id
                        : glAccounts[GLAccountTypeName.PRIMARY].id
                })
            );
        }

        console.log(`saving ${cashOrStockEntities.length} cash/stock records`);
        await fundTransactionDetailRepo.save(cashOrStockEntities);

        console.log(`saving ${feeEntities.length} fee records`);
        await fundTransactionDetailRepo.save(feeEntities);
    };

    console.log('finished fetching data');
    console.timeLog(timeLabel);

    const stream = fs.createReadStream(file).pipe(csv.parse({ headers: true }));

    // error handling
    stream.on('error', error => {
        console.error(error);
        process.exit(0);
    });

    // generate giant array of data
    const rows: Row[] = [];
    let total = 0;
    stream
        .on('data', async (row: Row) => rows.push(row))
        .on('end', (rowCount: number) => (total = rowCount));

    // save records to db
    finished(stream, async err => {
        if (err) {
            console.error('error finishing stream', err);
            return;
        }

        console.log('finished streaming csv');
        console.timeLog(timeLabel);

        // keep track of index to process every 1000 `contributionEntities`
        let index = 0;
        const contributionEntities: FundTransaction[] = [];

        rowLoop: for await (const row of rows) {
            index++;

            // fetch data from cache
            const { fund } = await fetchFundsFromCache({
                fundKey: row.fundKey,
                fundCode: row.fundCode,
                name: row.fundName
            }).catch(err => ({ fund: null }));

            /**
             * @note this is the `SIGNATRY Transfer Account` fund
             * return early
             * */
            if (!fund) continue rowLoop;

            const [{ userProfileId, userProfileAccountId }, security] = await Promise.all([
                // fetch user profile
                fetchUserProfiles({
                    id: row.userProfileId,
                    donorName: row.donorName,
                    donorUserCode: row.donorUserCode
                }),
                // conditionally fetch security
                row.donationType === 'Security'
                    ? await fetchSecurity({
                          tickerSymbol: row.ticker,
                          cusip: row.CUSIP,
                          name: row.assetName
                      }).catch(() => undefined)
                    : undefined
            ]);

            // generate metadata
            let metadata: TransactionMetadata;
            switch (row.donationType) {
                case 'Security':
                    metadata = {
                        paymentDetails: {
                            units: row.quantity,
                            paymentType: DetailPaymentType.SECURITY,
                            value: currency.parseString(row.average).toString(),
                            securityId: security?.id || '',
                            securityName: security?.name || row.assetName,
                            tickerSymbol: security?.tickerSymbol || row.ticker,
                            cusip: security?.cusip || row.CUSIP,
                            paymentNumber: ''
                        }
                    };
                    break;

                case 'Other':
                default:
                    metadata = {
                        paymentDetails: {
                            paymentType: DetailPaymentType.CASH,
                            paymentNumber: ''
                        }
                    };
            }

            // format date (set to midday)
            const contributionDate = dayjs(row.contributionDate)
                .add(12, 'hour')
                .toDate();

            // create the contribution
            contributionEntities.push(
                fundTransactionRepo.create({
                    // default values
                    transactionTypeId: contributionType.id,
                    transactionStatusId: completeStatus.id,
                    metadata,
                    // clients requested all imported contributions have historic values
                    isHistoric: true,
                    historicImportedOn: new Date(),
                    // from csv
                    transactionCode: `C-H-${row.transactionCode}`,
                    amount: currency.parseString(row.amount),
                    transactionDateTime: contributionDate,
                    createdOn: contributionDate,
                    chargedOn: contributionDate,
                    fundId: fund.id,
                    userProfileId: userProfileId,
                    createdBy: userProfileId,
                    updatedBy: userProfileId,
                    userProfileAccountId: userProfileAccountId
                })
            );

            if (contributionEntities.length % 1000 === 0 || index === total) {
                console.log(`saving ${contributionEntities.length} contributions`);
                console.time(`${timeLabel}_${index}`);

                // `save` wasn't working so use `insert` method instead
                const { generatedMaps } = await fundTransactionRepo.insert(contributionEntities);

                // "garbage collect"
                contributionEntities.splice(0, contributionEntities.length);

                await createAndSaveDetailRecords(generatedMaps as FundTransaction[]);
                console.timeEnd(`${timeLabel}_${index}`);
            }
        } // end rowLoop

        console.log('finished!');
        console.timeEnd(timeLabel);
    });
})();
