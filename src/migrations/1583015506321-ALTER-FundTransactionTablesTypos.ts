import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERFundTransactionTablesTypos1583015506321 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            'ALTER TABLE "fund_transaction" RENAME COLUMN "transactions_date_time" TO "transaction_date_time"'
        );
        await queryRunner.query(
            'ALTER TABLE "fund_transaction_detail" RENAME COLUMN "transactions_date_time" TO "transaction_date_time"'
        );
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            'ALTER TABLE "fund_transaction" RENAME COLUMN "transaction_date_time" TO "transactions_date_time"'
        );
        await queryRunner.query(
            'ALTER TABLE "fund_transaction_detail" RENAME COLUMN "transaction_date_time" TO "transactions_date_time"'
        );
    }
}
