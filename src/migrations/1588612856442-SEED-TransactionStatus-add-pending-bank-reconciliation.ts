import { MigrationInterface, QueryRunner } from 'typeorm';

export class SEEDTransactionStatusAddPendingBankReconciliation1588612856442
    implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            `INSERT INTO "transaction_status" ("name", "description", "enabled")
            VALUES ('PENDING_BANK_RECONCILIATION', 'Funds paid out of payment processor', true)`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            'DELETE FROM "transaction_status" WHERE "name" = \'PENDING_BANK_RECONCILIATION\''
        );
    }
}
