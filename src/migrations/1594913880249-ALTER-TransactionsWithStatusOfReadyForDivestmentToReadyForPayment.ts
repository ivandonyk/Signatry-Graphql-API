import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERTransactionsWithStatusOfReadyForDivestmentToReadyForPayment1594913880249
    implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        const [{ id: paymentId }] = await queryRunner.query(/*sql*/ `
            SELECT id FROM transaction_status WHERE name = 'READY_FOR_PAYMENT';
        `);

        const [{ id: divestmentId }] = await queryRunner.query(/*sql*/ `
            SELECT id FROM transaction_status WHERE name = 'READY_FOR_DIVESTMENT';
        `);

        await queryRunner.query(/* sql */ `
            UPDATE "fund_transaction" SET "transaction_status_id" = '${paymentId}' WHERE fund_transaction.transaction_status_id = '${divestmentId}'
      `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const [{ id: paymentId }] = await queryRunner.query(/*sql*/ `
            SELECT id FROM transaction_status WHERE name = 'READY_FOR_PAYMENT';
        `);

        const [{ id: divestmentId }] = await queryRunner.query(/*sql*/ `
            SELECT id FROM transaction_status WHERE name = 'READY_FOR_DIVESTMENT';
        `);

        await queryRunner.query(/* sql */ `
            UPDATE "fund_transaction" SET "transaction_status_id" = '${divestmentId}' WHERE fund_transaction.transaction_status_id = '${paymentId}'
        `);
    }
}
