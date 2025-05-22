import { getOrCreateConnection } from '../../typeorm';

(async () => {
    const connection = await getOrCreateConnection({ logging: true });
    const queryRunner = connection.createQueryRunner();

    // 1) need to update gl_account_id in institution_account where account_number matches with account_id in institution_account
    await queryRunner.query(`UPDATE institution_account ia 
    SET gl_account_id = (SELECT ga.id FROM gl_account ga WHERE ga.account_number = ia.account_id)`);

    // 2) Create new gl_account based on the account id that exist in institution_account
    await queryRunner.query(`INSERT INTO gl_account(tenant_id, account_number, title)
    SELECT '00000000-0000-0000-0000-000000000000', ia.account_id, ia."name" FROM investment i
    INNER JOIN institution_account ia ON ia.id = i.institution_account_id
    WHERE ia.gl_account_id IS NULL`);

    // 3) update institution_account again because we have new rows now.
    await queryRunner.query(`UPDATE institution_account ia 
    SET gl_account_id = (SELECT ga.id FROM gl_account ga WHERE ga.account_number = ia.account_id)`);

    // 4) update  gl_account_id column in investment table
    await queryRunner.query(`UPDATE investment i
    SET gl_account_id = (SELECT gl_account_id FROM institution_account ia WHERE ia.id = i.institution_account_id)`);

    // 5) insert new gl_account reconciliation
    await queryRunner.query(`INSERT INTO gl_account_reconciliation (gl_account_id, date_previous_reconciled, balance_open)
    SELECT DISTINCT i.gl_account_id, i.created_on, ia.market_value
    FROM investment i
    INNER JOIN institution_account ia ON i.institution_account_id = ia.id
    WHERE i.gl_account_id IS NOT NULL
    AND i.gl_account_id NOT IN (SELECT DISTINCT gl_account_id FROM gl_account_reconciliation)`);

    // 6) set dummy values for unreconciled_count and unreconciled_amount only for account number that are even
    await queryRunner.query(`UPDATE gl_account_reconciliation 
    SET unreconciled_count = floor(random()*(8-1+1))+1, unreconciled_amount = floor(random()*(5000-100+1))+100
    WHERE unreconciled_count = 0 AND gl_account_id IN (SELECT gl.id FROM gl_account gl WHERE CAST(gl.account_number as INTEGER) % 2 = 0)`);

    // 7) update change based on balance_open and unreconciled_amount values
    await queryRunner.query(`UPDATE gl_account_reconciliation
    SET change = unreconciled_amount * 100 / (CASE WHEN balance_open = 0 THEN 1 ELSE balance_open END)
    where unreconciled_amount != 0 AND change = 0`);
})();
