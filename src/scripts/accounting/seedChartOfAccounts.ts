import * as csv from 'fast-csv';
import * as fs from 'fs';
import * as path from 'path';
import {
    FinancialAdvisor,
    Fund,
    FundInvestment,
    GLAccount,
    GLAccountType,
    InstitutionAccount,
    Investment
} from '../../models';
import { GLAccountTypeName } from '../../models/GLAccountType';
import { InvestmentType } from '../../models/Investment';
import { getOrCreateConnection } from '../../typeorm';
import { assignVisualizationColor } from '../../utilities/assignVisualizationColor';

export async function seedChartOfAccounts() {
    const connection = await getOrCreateConnection();

    const headers = {
        fundKey: 'Fund Code',
        institutionAccountNumber: 'Institution Account Number',
        institutionAccountNumberManual: 'Institution Account Number (Manual)',
        sweepParentInstAccountNumber: 'Sweep Account Parent',
        glAccountNumber: 'Intacct Account Number',
        routingNumber: 'Routing Number',
        glAccountTypeName: 'GL Account Type',
        investmentType: 'Investment type',
        displayName: 'Display Name',
        orderNum: 'Order',
        defaultDivestmentPercentage: 'Default Divestment',
        defaultAllocationPercentage: 'Default Investment',
        custodianName: 'Custodian Name',
        advisor1FirstName: 'Advisor Contact #1 First Name',
        advisor1LastName: 'Advisor Contact #1 Last Name',
        advisor1Email: 'Advisor Contact #1 Email Address',
        advisor2FirstName: 'Advisor Contact #2 First Name',
        advisor2LastName: 'Advisor Contact #2 Last Name',
        advisor2Email: 'Advisor Contact #2 Email Address',
        advisor3FirstName: 'Advisor Contact #3 First Name',
        advisor3LastName: 'Advisor Contact #3 Last Name',
        advisor3Email: 'Advisor Contact #3 Email Address',
        advisor4FirstName: 'Administrative Team Contact # 1 First Name',
        advisor4LastName: 'Administrative Team Contact # 1 Last Name',
        advisor4Email: 'Administrative Team Contact # 1 Email Address',
        advisor5FirstName: 'Administrative Team Contact # 2 First Name',
        advisor5LastName: 'Administrative Team Contact # 2 Last Name',
        advisor5Email: 'Administrative Team Contact # 2 Email Address',
        advisor6FirstName: 'Administrative Team Contact # 3 First Name',
        advisor6LastName: 'Administrative Team Contact # 3 Last Name',
        advisor6Email: 'Administrative Team Contact # 3 Email Address',
        advisorInstitution: 'IM Company',
        advisorInstitutionAddress: 'Address',
        advisorInstitutionCity: 'City',
        advisorInstitutionPhone: 'Phone',
        addressLine1: 'Bank Address Line 1',
        addressLine2: 'Bank Address Line 2',
        addressCity: 'Bank City',
        addressState: 'Bank State',
        addressZip: 'Bank Zip',
        displayAccountNumber: 'Display Account Number'
    };

    const filename = 'import-files/accountData.csv';
    const accountData = [];

    console.log('Seeding chart of accounts');
    try {
        await new Promise((resolve, reject) => {
            fs.createReadStream(path.resolve(filename))
                .pipe(csv.parse({ headers: true }))
                .on('error', error => reject(error))
                .on('data', row => {
                    const rowData = {};
                    for (const header in headers) {
                        rowData[header] = row[headers[header]];
                    }
                    accountData.push(rowData);
                })
                .on('end', () => resolve(true));
        });
        console.log(`Successfully imported ${accountData.length} rows of account data`);
    } catch (error) {
        console.log('Error reading CSV');
        console.log(error);
        process.exit(1);
    }
    const systemUserId = '00000000-0000-0000-0000-000000000000';

    const storeFinancialAdvisor = async (
        financialAdvisorRepo,
        firstName: string,
        lastName: string,
        email: string,
        institutionName: string,
        phone: string,
        address: string,
        city: string
    ): Promise<FinancialAdvisor> => {
        return financialAdvisorRepo.save(
            financialAdvisorRepo.create({
                fullName: `${firstName} ${lastName}`,
                email: email,
                institutionName: institutionName,
                phoneNumber: phone,
                addressLine1: address,
                city: city,
                createdBy: systemUserId,
                updatedBy: systemUserId
            })
        );
    };

    await connection.transaction(async manager => {
        // Import any new account data
        //await importEntities();
        //await importGLAccounts();
        //await importInstitutionAccounts(manager);

        const fundRepo = manager.getRepository(Fund);
        const glAccountRepo = manager.getRepository(GLAccount);
        const instAccountRepo = manager.getRepository(InstitutionAccount);
        const investmentRepo = manager.getRepository(Investment);
        const fundInvestmentRepo = manager.getRepository(FundInvestment);
        const financialAdvisorRepo = manager.getRepository(FinancialAdvisor);
        const glAccountTypes = await manager
            .getRepository(GLAccountType)
            .createQueryBuilder()
            .getMany();

        for (const data of accountData) {
            // Insert relationship between GLAccount and GLAccountType
            const glAccount = await glAccountRepo.findOne(
                { accountNumber: data.glAccountNumber },
                { relations: ['accountTypes'] }
            );

            console.log(`Seeding account data for ${data.displayName}`);
            const glAccountType = glAccountTypes.find(
                t => t.name === (data.glAccountTypeName as GLAccountTypeName)
            );
            if (glAccount) {
                glAccount.accountTypes.push(glAccountType);
                await glAccountRepo.save(glAccount);
            }

            // If there's an InstitutionAccount number,
            // insert relationship between InstitutionAccount and GLAccount
            let institutionAccount = await instAccountRepo
                .createQueryBuilder('institutionAccount')
                .where('institutionAccount.accountNumber = :accountNumber', {
                    accountNumber: data.institutionAccountNumber
                })
                .orWhere('institutionAccount.accountNumber = :manualAccountNumber', {
                    manualAccountNumber: data.institutionAccountNumberManual
                })
                .getOne();
            // If it's a manually managed account, create
            if (!institutionAccount && /MANUAL-.*/.test(data.institutionAccountNumber)) {
                console.log(`Creating manual institution account for ${data.displayName}`);
                institutionAccount = await instAccountRepo.save(
                    instAccountRepo.create({
                        name: data.displayName,
                        displayName: data.displayName,
                        accountId: data.institutionAccountNumber,
                        financialProfileId: data.institutionAccountNumber,
                        accountNumber: data.institutionAccountNumberManual,
                        custodianName: data.custodianName,
                        glAccountId: glAccount?.id ?? null,
                        routingNumber:
                            data.routingNumber !== ''
                                ? data.routingNumber.replace(/\D/g, '')
                                : null,
                        marketValue: 0,
                        isSweepAccount: data.sweepParentInstAccountNumber !== '',
                        isManual: true,
                        addressLine1: data.addressLine1,
                        addressLine2: data.addressLine2,
                        addressCity: data.addressCity,
                        addressState: data.addressState,
                        addressZip: data.addressZip,
                        displayAccountNumber: data.displayAccountNumber
                    })
                );
            }
            if (institutionAccount) {
                console.log(`Updating institution account ${institutionAccount.name}`);
                institutionAccount.glAccountId = glAccount?.id ?? null;
                institutionAccount.displayName = data.displayName;
                institutionAccount.custodianName = data.custodianName;
                institutionAccount.routingNumber =
                    data.routingNumber !== '' ? data.routingNumber.replace(/\D/g, '') : null;
                institutionAccount.isManual = /MANUAL-.*/.test(data.institutionAccountNumber);
                institutionAccount.addressLine1 = data.addressLine1;
                institutionAccount.addressLine2 = data.addressLine2;
                institutionAccount.addressCity = data.addressCity;
                institutionAccount.addressState = data.addressState;
                institutionAccount.addressZip = data.addressZip;
                institutionAccount.displayAccountNumber = data.displayAccountNumber;
                if (!institutionAccount.financialAdvisors) {
                    institutionAccount.financialAdvisors = [];
                }
                // Associate advisor data
                if (data.advisor1Email !== '') {
                    let financialAdvisor = await financialAdvisorRepo.findOne({
                        email: data.advisor1Email
                    });
                    if (!financialAdvisor) {
                        financialAdvisor = await storeFinancialAdvisor(
                            financialAdvisorRepo,
                            data.advisor1FirstName,
                            data.advisor1LastName,
                            data.advisor1Email,
                            data.advisorInstitution,
                            data.advisorInstitutionPhone,
                            data.advisorInstitutionAddress,
                            data.advisorInstitutionCity
                        );
                    }
                    console.log(
                        `Attaching financial advisor ${financialAdvisor.fullName} to ${institutionAccount.displayName}`
                    );
                    institutionAccount.financialAdvisors.push(financialAdvisor);
                }
                if (data.advisor2Email !== '') {
                    let financialAdvisor = await financialAdvisorRepo.findOne({
                        email: data.advisor2Email
                    });
                    if (!financialAdvisor) {
                        financialAdvisor = await storeFinancialAdvisor(
                            financialAdvisorRepo,
                            data.advisor2FirstName,
                            data.advisor2LastName,
                            data.advisor2Email,
                            data.advisorInstitution,
                            data.advisorInstitutionPhone,
                            data.advisorInstitutionAddress,
                            data.advisorInstitutionCity
                        );
                    }
                    console.log(
                        `Attaching financial advisor ${financialAdvisor.fullName} to ${institutionAccount.displayName}`
                    );
                    institutionAccount.financialAdvisors.push(financialAdvisor);
                }
                if (data.advisor3Email !== '') {
                    let financialAdvisor = await financialAdvisorRepo.findOne({
                        email: data.advisor3Email
                    });
                    if (!financialAdvisor) {
                        financialAdvisor = await storeFinancialAdvisor(
                            financialAdvisorRepo,
                            data.advisor3FirstName,
                            data.advisor3LastName,
                            data.advisor3Email,
                            data.advisorInstitution,
                            data.advisorInstitutionPhone,
                            data.advisorInstitutionAddress,
                            data.advisorInstitutionCity
                        );
                    }
                    console.log(
                        `Attaching financial advisor ${financialAdvisor.fullName} to ${institutionAccount.displayName}`
                    );
                    institutionAccount.financialAdvisors.push(financialAdvisor);
                }
                if (data.advisor4Email !== '') {
                    let financialAdvisor = await financialAdvisorRepo.findOne({
                        email: data.advisor4Email
                    });
                    if (!financialAdvisor) {
                        financialAdvisor = await storeFinancialAdvisor(
                            financialAdvisorRepo,
                            data.advisor4FirstName,
                            data.advisor4LastName,
                            data.advisor4Email,
                            data.advisorInstitution,
                            data.advisorInstitutionPhone,
                            data.advisorInstitutionAddress,
                            data.advisorInstitutionCity
                        );
                    }
                    console.log(
                        `Attaching financial advisor ${financialAdvisor.fullName} to ${institutionAccount.displayName}`
                    );
                    institutionAccount.financialAdvisors.push(financialAdvisor);
                }
                if (data.advisor5Email !== '') {
                    let financialAdvisor = await financialAdvisorRepo.findOne({
                        email: data.advisor5Email
                    });
                    if (!financialAdvisor) {
                        financialAdvisor = await storeFinancialAdvisor(
                            financialAdvisorRepo,
                            data.advisor5FirstName,
                            data.advisor5LastName,
                            data.advisor5Email,
                            data.advisorInstitution,
                            data.advisorInstitutionPhone,
                            data.advisorInstitutionAddress,
                            data.advisorInstitutionCity
                        );
                    }
                    console.log(
                        `Attaching financial advisor ${financialAdvisor.fullName} to ${institutionAccount.displayName}`
                    );
                    institutionAccount.financialAdvisors.push(financialAdvisor);
                }
                if (data.advisor6Email !== '') {
                    let financialAdvisor = await financialAdvisorRepo.findOne({
                        email: data.advisor6Email
                    });
                    if (!financialAdvisor) {
                        financialAdvisor = await storeFinancialAdvisor(
                            financialAdvisorRepo,
                            data.advisor6FirstName,
                            data.advisor6LastName,
                            data.advisor6Email,
                            data.advisorInstitution,
                            data.advisorInstitutionPhone,
                            data.advisorInstitutionAddress,
                            data.advisorInstitutionCity
                        );
                    }
                    console.log(
                        `Attaching financial advisor ${financialAdvisor.fullName} to ${institutionAccount.displayName}`
                    );
                    institutionAccount.financialAdvisors.push(financialAdvisor);
                }
                await instAccountRepo.save(institutionAccount);
            }

            // fetch Fund and Investment
            let investment: Investment;
            let fund: Fund;

            if (data.investmentType !== '') {
                const investmentQuery = investmentRepo.createQueryBuilder('investment');
                if (glAccount) {
                    investmentQuery.where('investment.glAccountId = :glAccountId', {
                        glAccountId: glAccount.id
                    });
                }
                // Do not attach sweep accounts to investments
                if (institutionAccount && !institutionAccount.isSweepAccount) {
                    investmentQuery.orWhere(
                        'investment.institutionAccountId = :institutionAccountId',
                        { institutionAccountId: institutionAccount.id }
                    );
                }
                investment = await investmentQuery.getOne();
            }

            if (data.fundKey !== '') {
                fund = await fundRepo.findOne({ fundKey: data.fundKey });
            }

            // Update relationship between Investment, InstitutionAccount, and GLAccount
            if (data.investmentType !== '') {
                let offset = 0;
                // don't duplicate colors
                if (!fund) {
                    // get rows with same fundKey and find index
                    const groupedByFund = accountData.filter(row => row.fundKey === data.fundKey);
                    offset = groupedByFund.findIndex(
                        row => row.institutionAccountNumber === data.institutionAccountNumber
                    );
                }
                const visualizationColor = await assignVisualizationColor(
                    manager,
                    fund,
                    data.investmentType !== 'IMA',
                    offset
                );

                if (investment) {
                    investment.glAccountId = glAccount?.id ?? null;
                    investment.institutionAccountId = institutionAccount?.id ?? null;
                    investment.name = data.displayName;
                    investment.defaultAllocationPercentage = data.defaultAllocationPercentage;
                    investment.defaultDivestmentPercentage = data.defaultDivestmentPercentage;
                    investment.orderNum = data.orderNum;
                    investment.visualizationColor = visualizationColor;

                    await investmentRepo.save(investment);
                } else if (institutionAccount) {
                    // Create investment if it doesn't exist and we have an InstitutionAccount for it
                    console.log(`Creating new investment for ${data.displayName}`);
                    investment = await investmentRepo.save(
                        investmentRepo.create({
                            name: data.displayName,
                            glAccountId: glAccount?.id ?? null,
                            institutionAccountId: institutionAccount.id,
                            defaultAllocationPercentage: data.defaultAllocationPercentage,
                            defaultDivestmentPercentage: data.defaultDivestmentPercentage,
                            investmentType: data.investmentType as InvestmentType,
                            orderNum: data.orderNum,
                            visualizationColor: visualizationColor
                        })
                    );
                }
            }

            // Associate funds to AMA investments
            if (!fund) {
                console.log(`Could not find fund for key: ${data.fundKey}`);
            }

            if (fund && investment) {
                const fundInvestment = await fundInvestmentRepo.findOne({
                    fundId: fund.id,
                    investmentId: investment.id
                });
                if (!fundInvestment) {
                    console.log(`Associating IMA for ${fund.name}`);
                    fundInvestmentRepo.save(
                        fundInvestmentRepo.create({
                            fundId: fund.id,
                            investmentId: investment.id,
                            allocationPercentage: data.defaultAllocationPercentage,
                            divestmentPercentage: data.defaultAllocationPercentage
                        })
                    );
                }
            }
        }
        /*
        // Set up default fund investments for existing funds
        console.log('Setting up default investments on funds');
        const poolInvestments = await investmentRepo
            .createQueryBuilder('investment')
            .leftJoinAndSelect('investment.institutionAccount', 'institutionAccount')
            .where('investment.investmentType IN (:...defaultInvestmentTypes)', {
                defaultInvestmentTypes: [
                    InvestmentType.POOL,
                    InvestmentType.CONTRIBUTION_CASH,
                    InvestmentType.GRANT_CASH,
                    InvestmentType.SHARED_STOCK,
                    InvestmentType.SHARED_STOCK_VANGUARD,
                    InvestmentType.SHARED_STOCK_HOLD
                ]
            })
            .getMany();
        const funds = await fundRepo
            .createQueryBuilder('fund')
            .leftJoinAndSelect('fund.investments', 'investments')
            .leftJoinAndSelect('fund.fundType', 'fundType')
            .where('fundType.name = :fundTypeName', {
                fundTypeName: FundTypeName.DONOR_ADVISED_FUND
            })
            .getMany();

        const fundInvestmentInserts = [];
        for (const fund of funds) {
            const existingInvestmentIds = fund.investments.map(fi => fi.investmentId);
            const missingPools = poolInvestments.filter(
                pool => !existingInvestmentIds.includes(pool.id)
            );
            for (const missingPool of missingPools) {
                console.log(`Adding ${missingPool.name} to ${fund.name}`);
                fundInvestmentInserts.push(
                    fundInvestmentRepo.create({
                        fundId: fund.id,
                        investmentId: missingPool.id,
                        allocationPercentage: missingPool.defaultAllocationPercentage,
                        divestmentPercentage: missingPool.defaultDivestmentPercentage
                    })
                );
            }
        }
        if (fundInvestmentInserts.length > 0) {
            await fundInvestmentRepo.save(fundInvestmentInserts);
        }

        // Set up fund sub-ledgers
        const poolLedgerFundType = await manager
            .getRepository(FundType)
            .findOne({ name: FundTypeName.POOL_SUBLEDGER });
        const systemUserId = '00000000-0000-0000-0000-000000000000';
        const accountingFacade = new AccountingFacade();
        for (const pool of poolInvestments) {
            console.log(`Linking subledger fund to investment ${pool.name}`);
            if (pool.subledgerFundId) {
                continue;
            }
            const name = `Subledger for ${pool.name}`;
            let projectId = null;
            const project = await accountingFacade.getProjectByName(name);
            if (project) {
                projectId = project.getProjectId();
            } else {
                projectId = await accountingFacade.createProject(name);
            }
            let fund = await fundRepo.findOne({
                fundCode: `SUBLEDGER-${pool.institutionAccount.accountNumber}`
            });
            if (!fund) {
                fund = await fundRepo.save(
                    fundRepo.create({
                        name: name,
                        fundCode: `SUBLEDGER-${pool.institutionAccount.accountNumber}`,
                        fundKey: `SUBLEDGER-${pool.institutionAccount.accountNumber}`,
                        description: `Subledger for ${pool.name}`,
                        statementByMail: false,
                        statementByPaperless: false,
                        fundTypeId: poolLedgerFundType.id,
                        createdByUserProfileId: systemUserId,
                        primaryAccountHolderId: systemUserId,
                        accountingProjectId: projectId
                    })
                );
            }
            await investmentRepo.update(pool.id, { subledgerFundId: fund.id });
        }

        // Internal interest subledger fund
        console.log('Creating subledger fund for interest');
        const interestFundName = 'Internal Interest Fund';
        const interestFundCode = 'SUBLEDGER-INTEREST';
        let interestProjectId = null;
        const interestProject = await accountingFacade.getProjectByName(interestFundName);
        if (interestProject) {
            interestProjectId = interestProject.getProjectId();
        } else {
            interestProjectId = await accountingFacade.createProject(interestFundName);
        }
        const interestFund = await fundRepo.findOne({ fundCode: interestFundCode });
        if (!interestFund) {
            await fundRepo.save(
                fundRepo.create({
                    name: interestFundName,
                    fundCode: interestFundCode,
                    fundKey: interestFundCode,
                    description: 'Subledger for interest earned in bank accounts',
                    statementByMail: false,
                    statementByPaperless: false,
                    fundTypeId: poolLedgerFundType.id,
                    createdByUserProfileId: systemUserId,
                    primaryAccountHolderId: systemUserId,
                    accountingProjectId: interestProjectId
                })
            );
        }
        // Internal fee subledger fund
        console.log('Creating subledger fund for fees');
        const feeFundName = 'Internal Fee Fund';
        const feeFundCode = 'SUBLEDGER-FEE';
        let feeProjectId = null;
        const feeProject = await accountingFacade.getProjectByName(feeFundName);
        if (feeProject) {
            feeProjectId = feeProject.getProjectId();
        } else {
            feeProjectId = await accountingFacade.createProject(feeFundName);
        }
        const feeFund = await fundRepo.findOne({ fundCode: feeFundCode });
        if (!feeFund) {
            await fundRepo.save(
                fundRepo.create({
                    name: feeFundName,
                    fundCode: feeFundCode,
                    fundKey: feeFundCode,
                    description: 'Subledger for fees charged to bank accounts',
                    statementByMail: false,
                    statementByPaperless: false,
                    fundTypeId: poolLedgerFundType.id,
                    createdByUserProfileId: systemUserId,
                    primaryAccountHolderId: systemUserId,
                    accountingProjectId: feeProjectId
                })
            );
        }
        */
    });

    //await importHoldings();

    //await importRecentTransactions();
    //await seedReconciliations();

    return;
}
