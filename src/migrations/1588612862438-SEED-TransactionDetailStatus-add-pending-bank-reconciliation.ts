import { MigrationInterface, QueryRunner } from 'typeorm';

export class SEEDTransactionDetailStatusAddPendingBankReconciliation1588612862438
    implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            `INSERT INTO "transaction_detail_status" ("name", "description", "enabled")
            VALUES ('PENDING_BANK_RECONCILIATION', 'Funds paid out of payment processor', true)`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            'DELETE FROM "transaction_detail_status" WHERE "name" = \'PENDING_BANK_RECONCILIATION\''
        );
    }
}
