import { MigrationInterface, QueryRunner } from 'typeorm';

export class SEEDRecipientTables1582984081208 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            'INSERT INTO "recipient_status" ("name") VALUES (\'PENDING\'), (\'APPROVED\')'
        );
        await queryRunner.query('ALTER TABLE "fund_transaction_destination" DROP COLUMN "need"');
        await queryRunner.query(
            'ALTER TABLE "fund_transaction_destination" ADD COLUMN "is_specific_need" BOOLEAN NOT NULL DEFAULT true'
        );
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query('DELETE FROM "recipient_status"');
        await queryRunner.query(
            'ALTER TABLE "fund_transaction_destination" DROP COLUMN "is_specific_need"'
        );
        await queryRunner.query(
            'ALTER TABLE "fund_transaction_destination" ADD COLUMN "need" character varying'
        );
    }
}
