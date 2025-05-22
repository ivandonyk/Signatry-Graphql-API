import {MigrationInterface, QueryRunner} from "typeorm";

export class ALTERTransactionDetailStatusAddComplete1603820675593 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`INSERT INTO "transaction_detail_status" ("name", "description") VALUES ('COMPLETE', 'Transaction is fully processed.')`);
        await queryRunner.query(`UPDATE "transaction_detail_status" SET "name" = 'PENDING_RECONCILIATION' WHERE name = 'PENDING_BANK_RECONCILIATION'`);
        await queryRunner.query(`INSERT INTO "transaction_status" ("name", "description") VALUES ('COMPLETE', 'Transaction is fully processed.')`);
        await queryRunner.query(`UPDATE "transaction_status" SET "name" = 'PENDING_RECONCILIATION' WHERE name = 'PENDING_BANK_RECONCILIATION'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`UPDATE "transaction_detail_status" SET "name" = 'PENDING_BANK_RECONCILIATION' WHERE name = 'PENDING_RECONCILIATION'`);
        await queryRunner.query(`DELETE FROM "transaction_detail_status" WHERE "name" = 'COMPLETE'`);
        await queryRunner.query(`UPDATE "transaction_status" SET "name" = 'PENDING_BANK_RECONCILIATION' WHERE name = 'PENDING_RECONCILIATION'`);
        await queryRunner.query(`DELETE FROM "transaction_status" WHERE "name" = 'COMPLETE'`);
    }
}
