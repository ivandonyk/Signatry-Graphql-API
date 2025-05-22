import { getOrCreateConnection } from '../../typeorm';

(async () => {
    const connection = await getOrCreateConnection({ logging: true });
    const queryRunner = connection.createQueryRunner();

    // 1) Insert batches from institution_account_transactions
    await queryRunner.query(`INSERT INTO "batch" (amount, description, status, source_glaccount_id, destination_glaccount_id, payment_type, source_info, destination_info, batch_code, created_on)
    SELECT iat.amount, concat('batch description - ' , iat.transaction_type), 'PENDING', ia.gl_account_id, ia.gl_account_id, 'DEPOSIT', '{"type":"test"}', '{"type":"test"}', '1234567', iat.created_on 
    FROM institution_account_transaction iat 
    INNER JOIN institution_account ia ON ia.id = iat.institution_account_id
    WHERE iat.gl_account_reconciliation_id IS NULL`);

    // 2) Insert 2nd batches from institution_account_transactions
    await queryRunner.query(`INSERT INTO "batch" (amount, description, status, source_glaccount_id, destination_glaccount_id, payment_type, source_info, destination_info, batch_code, created_on)
    SELECT iat.amount, concat('batch description - ' , iat.transaction_type), 'PENDING', ia.gl_account_id, ia.gl_account_id, 'CHECK', '{"type":"test"}', '{"type":"test"}', '7654321', iat.posted_on 
    FROM institution_account_transaction iat 
    INNER JOIN institution_account ia ON ia.id = iat.institution_account_id
    WHERE iat.gl_account_reconciliation_id IS NULL
    AND posted_on IS NOT NULL`);

    // 3) update hardcoded fields in reconciliations
    await queryRunner.query(
        'UPDATE gl_account_reconciliation SET unreconciled_count = 0, unreconciled_amount = 0, change = 0'
    );

    process.exit(0);
})();
