import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERTransactionTypeAndTransactionDestinationTables1584372706322
    implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            'ALTER TABLE "fund_transaction" ADD "transaction_code" character varying NULL',
            undefined
        );

        await queryRunner.query(
            'ALTER TABLE "fund_transaction" ADD CONSTRAINT "UQ_TC" UNIQUE ("transaction_code")',
            undefined
        );
        await queryRunner.query('CREATE SEQUENCE contributionTransactionCode START WITH 1');
        await queryRunner.query('CREATE SEQUENCE grantTransactionCode START WITH 1');
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query('DROP SEQUENCE contributionTransactionCode');
        await queryRunner.query('DROP SEQUENCE grantTransactionCode');
        await queryRunner.query('ALTER TABLE "fund_transaction" DROP CONSTRAINT "UQ_TC"');
        await queryRunner.query('ALTER TABLE "fund_transaction" DROP COLUMN "transaction_code"');
    }
}
