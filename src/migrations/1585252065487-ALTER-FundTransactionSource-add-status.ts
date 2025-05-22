import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERFundTransactionSourceAddStatus1585252065487 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            "CREATE TYPE fund_transaction_source_status AS ENUM ('PENDING', 'POSTED', 'INSUFFICIENT_FUNDS', 'RETURNED_BY_BANK', 'FAILED', 'CANCELED')"
        );
        await queryRunner.query(
            "ALTER TABLE fund_transaction_source ADD COLUMN status fund_transaction_source_status default 'PENDING'"
        );
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query('ALTER TABLE fund_transaction_source DROP COLUMN "status"');
        await queryRunner.query('DROP TYPE IF EXISTS fund_transaction_source_status');
    }
}
