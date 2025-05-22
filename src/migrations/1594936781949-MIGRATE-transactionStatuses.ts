import { MigrationInterface, QueryRunner } from 'typeorm';

export class MIGRATETransactionStatuses1594936781949 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // clear old notes
        await queryRunner.query(/*sql*/ `
            DELETE FROM transaction_status_note
        `);

        /**
         * Migrate old fund_transaction_detail records
         */

        await queryRunner.query(/*sql*/ `
            INSERT INTO "transaction_detail_status" ("name") VALUES (\'DIVESTED\')
        `);

        const [{ id: divestedId }] = await queryRunner.query(/*sql*/ `
            SELECT id FROM transaction_detail_status WHERE name = 'DIVESTED';
        `);

        const [{ id: investedId }] = await queryRunner.query(/*sql*/ `
            SELECT id FROM transaction_detail_status WHERE name = 'INVESTED';
        `);

        const [{ id: dueDiligenceId }] = await queryRunner.query(/*sql*/ `
            SELECT id FROM transaction_detail_status WHERE name = 'DUE_DILIGENCE_AND_VETTING';
        `);

        const [{ id: readyForPaymentId }] = await queryRunner.query(/*sql*/ `
            SELECT id FROM transaction_detail_status WHERE name = 'READY_FOR_PAYMENT';
        `);

        const [{ id: readyForInvestmentId }] = await queryRunner.query(/*sql*/ `
            SELECT id FROM transaction_detail_status WHERE name = 'READY_FOR_INVESTMENT';
        `);

        const [{ id: readyForDivestmentId }] = await queryRunner.query(/*sql*/ `
            SELECT id FROM transaction_detail_status WHERE name = 'READY_FOR_DIVESTMENT';
        `);

        // READY_FOR_DIVESTMENT -> DIVESTED
        await queryRunner.query(/*sql*/ `
            UPDATE fund_transaction_detail
            SET transaction_detail_status_id = '${divestedId}'
            WHERE transaction_detail_status_id = '${readyForDivestmentId}'
        `);

        // DUE_DILIGENCE_AND_VETTING -> DIVESTED
        await queryRunner.query(/*sql*/ `
            UPDATE fund_transaction_detail
            SET transaction_detail_status_id = '${divestedId}'
            WHERE transaction_detail_status_id = '${dueDiligenceId}'
        `);

        // READY_FOR_PAYMENT -> DIVESTED
        await queryRunner.query(/*sql*/ `
            UPDATE fund_transaction_detail
            SET transaction_detail_status_id = '${divestedId}'
            WHERE transaction_detail_status_id = '${readyForPaymentId}'
        `);

        // READY_FOR_INVESTMENT -> INVESTED
        await queryRunner.query(/*sql*/ `
            UPDATE fund_transaction_detail
            SET transaction_detail_status_id = '${investedId}'
            WHERE transaction_detail_status_id = '${readyForInvestmentId}'
        `);

        /**
         * Delete unused records from transaction_detail_status
         */

        await queryRunner.query(/*sql*/ `
            DELETE FROM transaction_detail_status
            WHERE name = 'READY_FOR_DIVESTMENT'
            OR name = 'SPECIAL_APPROVAL'
            OR name = 'FINANCIAL_REVIEW'
        `);

        /**
         * Migrate fund_transaction.divestment_status PENDING -> DIVESTED
         * where status = READY_FOR_PAYMENT
         */

        await queryRunner.query(/*sql*/ `
            UPDATE fund_transaction
            SET divestment_status = 'DIVESTED'
            FROM (
                SELECT id FROM transaction_status WHERE name = 'READY_FOR_PAYMENT'
            ) status
            WHERE transaction_status_id = status.id
            AND divestment_status = 'PENDING'
        `);

        /**
         * Migrate fund_transaction.grant_payment_status PENDING -> READY_FOR_PAYMENT
         * where status = READY_FOR_PAYMENT
         */

        await queryRunner.query(/*sql*/ `
            UPDATE fund_transaction
            SET grant_payment_status = 'READY_FOR_PAYMENT'
            FROM (
                SELECT id FROM transaction_status WHERE name = 'READY_FOR_PAYMENT'
            ) status
            WHERE transaction_status_id = status.id
            AND grant_payment_status = 'PENDING'
        `);

        /**
         * Migrate fund_transaction.final_review -> TRUE
         * where status = READY_FOR_PAYMENT
         */

        await queryRunner.query(/*sql*/ `
            UPDATE fund_transaction
            SET final_review = true
            FROM (
                SELECT id FROM transaction_status WHERE name = 'READY_FOR_PAYMENT'
            ) status
            WHERE transaction_status_id = status.id
        `);

        /**
         * Migrate fund_transaction.available_balance_approved -> TRUE
         * where status = READY_FOR_PAYMENT
         */

        await queryRunner.query(/*sql*/ `
            UPDATE fund_transaction
            SET available_balance_approved = true
            FROM (
                SELECT id FROM transaction_status WHERE name = 'READY_FOR_PAYMENT'
            ) status
            WHERE transaction_status_id = status.id
        `);

        /**
         * Migrate recipient.is_vetted -> TRUE for all existing recipients
         */

        await queryRunner.query(/*sql*/ `
            UPDATE recipient SET is_vetted = true
        `);

        /**
         * Migrate fund_transaction_info.purpose_notes_approved -> TRUE
         * for all existing records
         */

        await queryRunner.query(/*sql*/ `
            UPDATE fund_transaction_info SET purpose_notes_approved = true
        `);

        /**
         * Migrate fund_transaction.transaction_status PAYMENT_SENT -> PROCESSED
         */

        const [{ id: paymentSentId }] = await queryRunner.query(/*sql*/ `
            SELECT id FROM transaction_status WHERE name = 'PAYMENT_SENT';
        `);

        const [{ id: processedId }] = await queryRunner.query(/*sql*/ `
            SELECT id FROM transaction_status WHERE name = 'PROCESSED';
        `);

        await queryRunner.query(/*sql*/ `
            UPDATE fund_transaction
            SET transaction_status_id = '${processedId}'
            WHERE transaction_status_id = '${paymentSentId}'
        `);

        /**
         * Delete unused records from transaction_status
         */

        await queryRunner.query(/*sql*/ `
            DELETE FROM transaction_status
            WHERE name = 'READY_FOR_DIVESTMENT'
            OR name = 'SPECIAL_APPROVAL'
            OR name = 'FINANCIAL_REVIEW'
            OR name = 'PAYMENT_SENT'
        `);

        /**
         * Trigger balance updates
         */

        await queryRunner.query(/*sql*/ `
            UPDATE fund_transaction_detail SET id = id;
        `);

        await queryRunner.query(/*sql*/ `
            UPDATE fund_transaction SET id = id;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            "INSERT INTO \"transaction_status\" (\"name\") VALUES ('READY_FOR_DIVESTMENT'), ('SPECIAL_APPROVAL'), ('FINANCIAL_REVIEW'), ('READY_FOR_PAYMENT')"
        );

        await queryRunner.query(
            "INSERT INTO \"transaction_detail_status\" (\"name\") VALUES ('READY_FOR_DIVESTMENT'), ('SPECIAL_APPROVAL'), ('FINANCIAL_REVIEW')"
        );

        await queryRunner.query("DELETE FROM transaction_detail_status WHERE name = 'DIVESTED'");
    }
}
