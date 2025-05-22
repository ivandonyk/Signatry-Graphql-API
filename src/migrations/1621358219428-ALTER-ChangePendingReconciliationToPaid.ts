import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERChangePendingReconciliationToPaid1621358219428 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // add approved, paid
        await queryRunner.query(/*sql*/ `
            INSERT INTO transaction_status ("name", "description") VALUES ('APPROVED', 'For when divestment child transactions get created'), ('PAID', 'Staff pays grant');
        `);

        // update pending_rec to paid
        const [{ id: pendingReconciliationId }] = await queryRunner.query(/* sql */ `
            SELECT id FROM transaction_status WHERE name = 'PENDING_RECONCILIATION';
        `);

        const [{ id: paidId }] = await queryRunner.query(/* sql */ `
            SELECT id FROM transaction_status WHERE name = 'PAID';
        `);

        await queryRunner.query(/* sql */ `
            UPDATE fund_transaction SET transaction_status_id = '${paidId}' WHERE transaction_status_id = '${pendingReconciliationId}';
        `);

        // update ready_for_payemnt to approved
        const [{ id: readyForPaymentId }] = await queryRunner.query(/* sql */ `
            SELECT id FROM transaction_status WHERE name = 'READY_FOR_PAYMENT';
        `);

        const [{ id: approvedId }] = await queryRunner.query(/* sql */ `
            SELECT id FROM transaction_status WHERE name = 'APPROVED';
        `);

        await queryRunner.query(/* sql */ `
            UPDATE fund_transaction SET transaction_status_id = '${approvedId}' WHERE transaction_status_id = '${readyForPaymentId}';
        `);

        await queryRunner.query(/* sql */ `
            UPDATE fund_transaction_comment SET transaction_status_id = '${approvedId}' WHERE transaction_status_id = '${readyForPaymentId}';
        `);

        // get rid of ready_for_payment

        await queryRunner.query(/*sql*/ `
            DELETE FROM transaction_status WHERE name IN ('READY_FOR_PAYMENT');
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // revert paid to pending rec
        const [{ id: pendingReconciliationId }] = await queryRunner.query(/* sql */ `
            SELECT id FROM transaction_status WHERE name = 'PENDING_RECONCILIATION';
        `);

        const [{ id: paidId }] = await queryRunner.query(/* sql */ `
            SELECT id FROM transaction_status WHERE name = 'PAID';
        `);

        await queryRunner.query(/* sql */ `
            UPDATE fund_transaction SET transaction_status_id = '${pendingReconciliationId}' WHERE transaction_status_id = '${paidId}'
        `);

        // revert approved to ready for payment
        const [{ id: readyForPaymentId }] = await queryRunner.query(/*sql*/ `
            INSERT INTO transaction_status ("name", "description") VALUES ('READY_FOR_PAYMENT', 'Grant is ready to be paid') RETURNING id;
        `);

        const [{ id: approvedId }] = await queryRunner.query(/* sql */ `
            SELECT id FROM transaction_status WHERE name = 'APPROVED';
        `);

        await queryRunner.query(/* sql */ `
            UPDATE fund_transaction SET transaction_status_id = '${readyForPaymentId}' WHERE transaction_status_id = '${approvedId}';
        `);

        await queryRunner.query(/* sql */ `
            UPDATE fund_transaction_comment SET transaction_status_id = '${readyForPaymentId}' WHERE transaction_status_id = '${approvedId}';
        `);

        // remove approved, paid
        await queryRunner.query(/*sql*/ `
            DELETE FROM transaction_status WHERE name IN ('APPROVED', 'PAID');
        `);
    }
}
