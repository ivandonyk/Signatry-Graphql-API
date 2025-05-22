import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERFundTransactionBatchAddEnumStatus1586531442065 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            "CREATE TYPE fund_transaction_batch_status AS ENUM ('PENDING', 'COMPLETE')"
        );
        await queryRunner.query(
            "ALTER TABLE fund_transaction_batch ADD COLUMN status fund_transaction_batch_status default 'PENDING'"
        );
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query('ALTER TABLE fund_transaction_batch DROP COLUMN "status"');
        await queryRunner.query('DROP TYPE IF EXISTS fund_transaction_batch_status');
    }
}
