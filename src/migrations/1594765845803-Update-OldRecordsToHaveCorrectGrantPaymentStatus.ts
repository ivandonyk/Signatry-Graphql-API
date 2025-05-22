import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateOldRecordsToHaveCorrectGrantPaymentStatus1594765845803
    implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        const [{ id }] = await queryRunner.query(/*sql*/ `
            SELECT id FROM transaction_status WHERE name = 'READY_FOR_PAYMENT';
        `);

        await queryRunner.query(/* sql */ `
            UPDATE "fund_transaction" SET "grant_payment_status" = 'READY_FOR_PAYMENT' WHERE fund_transaction.transaction_status_id = '${id}'
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const { id } = await queryRunner.query(/*sql*/ `
            SELECT id FROM transaction_status WHERE name = 'READY_FOR_PAYMENT';
        `);

        await queryRunner.query(/* sql */ `
            UPDATE "fund_transaction" SET "grant_payment_status" = 'PENDING' WHERE fund_transaction.transaction_status_id = '${id}'
        `);
    }
}
