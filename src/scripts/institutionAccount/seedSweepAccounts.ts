import { getOrCreateConnection } from '../../typeorm';
import { InstitutionAccount } from '../../models';

(async () => {
    const connection = await getOrCreateConnection({ logging: true });

    const iaRepo = connection.getRepository(InstitutionAccount);
    const existingGrantGoLive = await connection.manager.findOne(InstitutionAccount, {
        accountNumber: '1737451'
    });

    let grantGoLiveId;
    if (!existingGrantGoLive) {
        // CREATE go live grant account and GET id
        const { id: goLiveId } = await iaRepo.save(
            iaRepo.create({
                accountId: 'MANUAL-7451',
                accountNumber: '1737451',
                name: 'Grant Account (Go Live)',
                marketValue: 0,
                custodianName: 'National Bank of Indianapolis',
                financialProfileId: 'MANUAL-7451',
                email: 'qa.spiredigital@gmail.com',
                accountType: 'BANKING_DEPOSIT',
                displayName: 'Grant Account (Go Live)'
            })
        );
        grantGoLiveId = goLiveId;
    }

    // GET contribution account id
    const [{ id: contributionAccountId }] = await connection.query(/*sql */ `
      SELECT id FROM "institution_account" WHERE "account_number" like '%3188'
    `);
    // GET grant test account id
    const [{ id: grantTestSweepId }] = await connection.query(/*sql */ `
        SELECT id FROM "institution_account" WHERE "account_number" like '%1901'
      `);
    // GET money market account id
    const [{ id: moneyMarketAccountId }] = await connection.query(/*sql */ `
      SELECT id FROM "institution_account" WHERE "account_number" like '%3503'
    `);

    const grantSweepGoLive = await connection.manager.findOne(InstitutionAccount, {
        accountNumber: '8008311'
    });

    const moneyMarketSweep = await connection.manager.findOne(InstitutionAccount, {
        accountNumber: '203305602'
    });

    const liveId = existingGrantGoLive ? existingGrantGoLive.id : grantGoLiveId;

    if (!grantSweepGoLive) {
        // CREATE go live grant sweep account with institutionAccountId
        await iaRepo.save(
            iaRepo.create({
                accountId: 'MANUAL-8311',
                accountNumber: '8008311',
                name: 'Grant Sweep Account (Go Live)',
                marketValue: 0,
                custodianName: 'National Bank of Indianapolis',
                financialProfileId: 'MANUAL-8311',
                accountType: 'BANKING_DEPOSIT',
                email: 'qa.spiredigital@gmail.com',
                institutionAccountId: liveId,
                isSweepAccount: true,
                displayName: 'Grant Sweep Account (Go Live)'
            })
        );
    } else {
        // UPDATE contribution account to have relation to sweep accoutn
        await connection.query(/*sql */ `
          UPDATE "institution_account" SET institution_account_id = '${liveId}', is_sweep_account = true WHERE "account_number" like '%8311'
        `);
    }

    if (!moneyMarketSweep) {
        // CREATE money market sweep account
        await iaRepo.save(
            iaRepo.create({
                accountId: 'MANUAL-5602',
                accountNumber: '203305602',
                name: 'Money Market Sweep',
                marketValue: 0,
                custodianName: 'National Bank of Indianapolis',
                financialProfileId: 'MANUAL-5602',
                accountType: 'BANKING_DEPOSIT',
                email: 'qa.spiredigital@gmail.com',
                institutionAccountId: moneyMarketAccountId,
                isSweepAccount: true,
                displayName: 'Money Market Sweep'
            })
        );
    } else {
        // UPDATE contribution account to have relation to sweep accoutn
        await connection.query(/*sql */ `
          UPDATE "institution_account" SET institution_account_id = '${moneyMarketAccountId}', is_sweep_account = true WHERE "account_number" like '%5602'
        `);
    }

    // UPDATE contribution account to have relation to sweep accoutn
    await connection.query(/*sql */ `
      UPDATE "institution_account" SET institution_account_id = '${contributionAccountId}', is_sweep_account = true WHERE "account_number" like '%7213'
    `);

    // UPDATE grant test account to have relation to sweep accoutn
    await connection.query(/*sql */ `
      UPDATE "institution_account" SET institution_account_id = '${grantTestSweepId}', is_sweep_account = true WHERE "account_number" like '%7353'
    `);

    process.exit(0);
})();
