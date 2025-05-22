import * as csv from 'fast-csv';
import * as fs from 'fs';
import * as path from 'path';
import { Holding, InstitutionAccount, InstitutionAccountTransaction, Security } from '../../models';
import { HoldingInterface } from '../../models/interfaces/Holding';
import { AccountProviderName } from '../../models/ProviderAccountData';
import { getOrCreateConnection } from '../../typeorm';
import dayjs from 'dayjs';
import {
    calculateHoldingCostAndGains,
    CostAndGainData
} from '../../utilities/calculateHoldingCostAndGains';
import { currency } from '../../utilities/currency';
import {
    formatDate,
    parseFromFormat,
    parseToDatetime,
    parseToDateAndAddDay
} from '../../utilities/datetime';

export async function importManualPositionsAndTransactions(): Promise<{
    totalPositionCount: number;
    importedPositionCount: number;
    totalTransactionCount: number;
    importedTransactionCount: number;
    positionErrors: string[];
    transactionErrors: string[];
}> {
    const connection = await getOrCreateConnection();

    const securityRepo = connection.getRepository(Security);
    const institutionAccountRepo = connection.getRepository(InstitutionAccount);
    const holdingRepo = connection.getRepository(Holding);
    const transactionRepo = connection.getRepository(InstitutionAccountTransaction);

    /** @note looks like this function uses either transactions or positions (holdings) */
    const positionHeaders = {
        institutionAccountNumber: 'INSTITUTION ACCOUNT *',
        name: 'NAME *',
        tickerSymbol: 'TICKER * (either Ticker or CUSIP required)',
        cusip: 'CUSIP *',
        assetSubClass: 'ASSET SUB CLASS',
        assetClass: 'ASSET CLASS *',
        units: 'UNITS *',
        cumulativeAverageCost: 'AVG. COST',
        unitPrice: 'PRICE *',
        priceAsOf: 'PRICE AS OF *',
        date: 'DATE *',
        marketValue: 'MARKET VALUE*',
        holdingId: 'HOLDING ID'
    };

    const transactionHeaders = {
        institutionAccountNumber: 'INSTITUTION ACCOUNT #*',
        transactionType: 'TRANSACTION TYPE *',
        amount: 'AMOUNT *',
        executionDate: 'EXECUTED DATE *',
        postedOn: 'SETTLEMENT DATE *',
        units: 'UNITS**',
        unitPrice: 'PRICE**',
        cusip: 'CUSIP**',
        tickerSymbol: 'TICKER**',
        name: 'DESCRIPTION',
        feeAmount: 'FEE AMOUNT'
    };

    const positionsFilename = 'import-files/manual-position-upload.csv';
    const transactionsFilename = 'import-files/manual-transaction-upload.csv';

    // data arrays
    const positionsData = [];
    const transactionsData = [];

    try {
      await new Promise((resolve, reject) => {
        fs.createReadStream(path.resolve(positionsFilename))
          .pipe(csv.parse({ headers: true }))
          .on('error', error => reject(error))
          .on('data', row => {
              const rowData = {};
              for (const header in positionHeaders) {
                  rowData[header] = row[positionHeaders[header]];
              }
              positionsData.push(rowData);
          })
          .on('end', () => resolve(true));
      });
      console.log(`Successfully imported ${positionsData.length} rows of account data`);

      await new Promise((resolve, reject) => {
        fs.createReadStream(path.resolve(transactionsFilename))
          .pipe(csv.parse({ headers: true }))
          .on('error', error => reject(error))
          .on('data', row => {
              const rowData = {};
              for (const header in transactionHeaders) {
                  rowData[header] = row[transactionHeaders[header]];
              }
              transactionsData.push(rowData);
          })
          .on('end', () => resolve(true));
      });
      console.log(`Successfully imported ${transactionsData.length} rows of account data`);
    } catch (error) {
        console.log('Error reading CSV');
        console.log(error);
        process.exit(1);
    }

    let positionCount = 1;
    let importedPositionCount = 0;

    const positionErrors = [];
    const positionsValues: Holding[] = [];

    const createSecurity = async data => {
        let security = null;
        const securityQuery = securityRepo.createQueryBuilder('security');
        const nameStripped = data.name.replace(/\W/g, '');
        const securityId = `MANUAL-${nameStripped}`;

        security = await securityQuery
            .where('security.securityId = :securityId', { securityId })
            .getOne();
        if (!security) {
            security = await securityRepo.save(
                securityRepo.create({
                    cusip: data.cusip !== '' ? data.cusip : null,
                    tickerSymbol: data.tickerSymbol !== '' ? data.tickerSymbol : null,
                    name: data.name,
                    securityId: `MANUAL-${nameStripped}`,
                    securityType: data.assetClass
                })
            );
        }
        return security;
    };

    for (const data of positionsData) {
        try {
            const units = currency.parseString(data.units);
            const unitPrice = currency.parseString(data.unitPrice);
            const marketValue = currency.parseString(data.marketValue);
            const nameStripped = data.name.replace(/\W/g, '');
            const tickerSymbol = data.tickerSymbol.trim();
            const cusip = data.cusip.trim();
            const institutionAccountNumber = data.institutionAccountNumber.trim();

            // fetch IA
            const institutionAccount = await institutionAccountRepo
                .createQueryBuilder('institutionAccount')
                .where('institutionAccount.displayAccountNumber = :accountNumber', {
                    accountNumber: data.institutionAccountNumber
                })
                .orWhere('institutionAccount.accountNumber = :accountNumber', {
                    accountNumber: data.institutionAccountNumber
                })
                .andWhere('institutionAccount.glAccountId IS NOT NULL')
                .getOne();

            if (!institutionAccount) {
                const errorMsg = `MANUAL POSITION TRANSACTION IMPORT: Row ${positionCount} - Could not import position: Could not find account`;
                console.log(errorMsg);
                positionCount++;
                positionErrors.push(errorMsg);
                continue;
            }
            // fetch security
            let security = null;
            const securityQuery = securityRepo.createQueryBuilder('security');
            if (cusip !== '' || tickerSymbol !== '') {
                if (cusip !== '' && tickerSymbol === '') {
                    security = await securityQuery
                        .where('security.cusip = :cusip', { cusip })
                        .getOne();
                } else if (cusip === '' && tickerSymbol !== '') {
                    security = await securityQuery
                        .where('security.tickerSymbol = :tickerSymbol', { tickerSymbol })
                        .getOne();
                } else if (data.cusip !== '' && data.tickerSymbol !== '') {
                    security = await securityQuery
                        .where('security.tickerSymbol = :tickerSymbol', { tickerSymbol })
                        .orWhere('security.cusip = :cusip', { cusip })
                        .getOne();
                }
                if (!security) {
                    security = await createSecurity(data);
                }
            } else {
                security = await createSecurity(data);
            }

            //get previous holding
            let previousHolding =
                data.holdingId !== '' && data.holdingId
                    ? { holdingId: data.holdingId }
                    : await holdingRepo
                          .createQueryBuilder('holding')
                          .where('holding.securityId = :securityId', { securityId: security.id })
                          .andWhere('holding.institutionAccountId = :institutionAccountId', {
                              institutionAccountId: institutionAccount.id
                          })
                          .orderBy('holding.date', 'DESC')
                          .getOne();

            let costAndGainData: CostAndGainData;
            let holdingId;
            if (previousHolding) {
                costAndGainData = calculateHoldingCostAndGains(
                    units,
                    unitPrice,
                    previousHolding as HoldingInterface
                );
                holdingId = previousHolding.holdingId;
            } else {
                holdingId = `MANUAL-${institutionAccountNumber}-${nameStripped}`;
                previousHolding = await holdingRepo
                    .createQueryBuilder('holding')
                    .where('holding.holdingId = :holdingId', { holdingId })
                    .orderBy('holding.date', 'DESC')
                    .getOne();

                if (previousHolding) {
                    costAndGainData = calculateHoldingCostAndGains(
                        units,
                        unitPrice,
                        previousHolding as HoldingInterface
                    );
                } else {
                    costAndGainData = {
                        costBasis: units,
                        cumulativeAverageCost: unitPrice,
                        cumulativeRealized: 0,
                        cumulativeUnrealized: 0
                    };
                }
            }

            // generate record
            const position = holdingRepo.create({
                holdingId,
                institutionAccountId: institutionAccount.id,
                name: data.name,
                securityId: security ? security.id : null,
                assetClass: data.assetClass !== '' ? data.assetClass : null,
                assetSubclass: data.assetSubclass !== '' ? data.assetSubclass : null,
                date: parseToDateAndAddDay(new Date(data.date)),
                priceAsOf: formatDate(
                    parseFromFormat(data.priceAsOf, 'MM/DD/YYYY'),
                    'YYYY-MM-DD HH:mm:ss'
                ),
                units: units,
                unitPrice: unitPrice,
                marketValue: marketValue,
                costBasis: costAndGainData.costBasis,
                cumulativeAverageCost: costAndGainData.cumulativeAverageCost,
                cumulativeRealized: costAndGainData.cumulativeRealized,
                cumulativeUnrealized: costAndGainData.cumulativeUnrealized,
                provider: AccountProviderName.MANUAL
            });

            positionsValues.push(position);
        } catch (error) {
            const errorMsg = `MANUAL POSITION TRANSACTION IMPORT: Row ${positionCount} - Could not import position ${data.name} - ${error.message}.`;
            positionErrors.push(errorMsg);
        }
        positionCount++;
    }

    for (const value of positionsValues) {
        try {
            await holdingRepo
                .createQueryBuilder('holding')
                .insert()
                .values(value)
                .execute();
            importedPositionCount++;
        } catch (error) {
            const errorMsg = `MANUAL POSITION TRANSACTION IMPORT: Unable to store manual holding ${value.name} for ${value.date} - ${value.marketValue} - ${error.message}`;
            console.log(errorMsg);
            positionErrors.push(errorMsg);
        }
    }

    /** @note this might be deprecated */
    let transactionCount = 1;
    let importedTransactionCount = 0;
    const transactionErrors = [];
    const transactionValues = [];
    let holding = null;
    const holdingQuery = holdingRepo
        .createQueryBuilder('holding')
        .leftJoinAndSelect('holding.security', 'security');
    for (const data of transactionsData) {
        try {
            if (data.cusip !== '' || data.tickerSymbol !== '') {
                if (data.cusip !== '' && data.tickerSymbol === '') {
                    holdingQuery.where('security.cusip = :cusip', { cusip: data.cusip });
                } else if (data.cusip === '' && data.tickerSymbol !== '') {
                    holdingQuery.where('security.tickerSymbol = :tickerSymbol', {
                        tickerSymbol: data.tickerSymbol
                    });
                } else if (data.cusip !== '' && data.tickerSymbol !== '') {
                    holdingQuery
                        .where('security.tickerSymbol = :tickerSymbol', {
                            tickerSymbol: data.tickerSymbol
                        })
                        .orWhere('security.cusip = :cusip', { cusip: data.cusip });
                }
                holding = await holdingQuery.orderBy('holding.date', 'DESC').getOne();
            }

            const institutionAccount = await institutionAccountRepo
                .createQueryBuilder('institutionAccount')
                .where('institutionAccount.displayAccountNumber = :accountNumber', {
                    accountNumber: data.institutionAccountNumber
                })
                .orWhere('institutionAccount.accountNumber = :accountNumber', {
                    accountNumber: data.institutionAccountNumber
                })
                .andWhere('institutionAccount.glAccountId IS NOT NULL')
                .getOne();

            if (!institutionAccount) {
                const errorMsg = `MANUAL TRANSACTION IMPORT: Row ${transactionCount} - Could not import transaction ${data.name}: Could not find account`;
                console.log(errorMsg);
                transactionErrors.push(errorMsg);
                transactionCount++;
                continue;
            }
            const dateStripped = data.postedOn.replace(/\D/g, '');

            const transaction = {
                transactionId: `MANUAL-${data.institutionAccountNumber}-${dateStripped}-${transactionCount}`,
                institutionAccountId: institutionAccount.id,
                transactionType: data.transactionType,
                holdingId: holding ? holding.id : null,
                name: data.name,
                description: data.name,
                postedOn: `${parseToDatetime(new Date(data.postedOn))}`,
                executionDate: `${parseToDatetime(new Date(data.executionDate))}`,
                units: data.units !== '' ? currency.parseString(data.units) : null,
                unitPrice: data.unitPrice !== '' ? currency.parseString(data.unitPrice) : null,
                amount: currency.parseString(data.amount),
                feeAmount: data.feeAmount !== '' ? currency.parseString(data.feeAmount) : null,
                provider: AccountProviderName.MANUAL,
                transactionName: data.tickerSymbol || '',
                creationDate: parseToDatetime(new Date()),
                flowAmount: data.units !== '' ? currency.parseString(data.units) : null
            };
            transactionValues.push(transaction);
        } catch (error) {
            const errorMsg = `MANUAL TRANSACTION IMPORT: Row ${transactionCount} - Could not import transaction ${data.name} - ${error.message}.`;
            transactionErrors.push(errorMsg);
            console.log(errorMsg);
        }
        transactionCount++;
    }

    if (transactionValues.length > 0) {
        for (const value of transactionValues) {
            try {
                await transactionRepo
                    .createQueryBuilder('transaction')
                    .insert()
                    .values(value)
                    .execute();
                importedTransactionCount++;
            } catch (error) {
                console.log(
                    `MANUAL POSITION TRANSACTION IMPORT: Could not import transaction ${value.name}`
                );
                console.log(error);
            }
        }
    }

    return {
        totalPositionCount: positionCount,
        importedPositionCount: importedPositionCount,
        totalTransactionCount: transactionCount,
        importedTransactionCount: importedTransactionCount,
        positionErrors: positionErrors,
        transactionErrors: transactionErrors
    };
}
