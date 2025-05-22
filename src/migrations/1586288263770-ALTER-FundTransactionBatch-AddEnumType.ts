import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERFundTransactionBatchAddEnumType1586288263770 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            "CREATE TYPE fund_transaction_batch_type AS ENUM ('INVESTMENT', 'DIVESTMENT')"
        );
        await queryRunner.query(
            "ALTER TABLE fund_transaction_batch ADD COLUMN type fund_transaction_batch_type default 'INVESTMENT'"
        );
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query('ALTER TABLE fund_transaction_batch DROP COLUMN "type"');
        await queryRunner.query('DROP TYPE IF EXISTS fund_transaction_batch_type');
    }
}
