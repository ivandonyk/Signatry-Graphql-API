import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERAddPaymentTypeToFundTransactionDetail1612291936656 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/* sql */ `
            CREATE TYPE "transaction_detail_payment_type" AS ENUM (
                'CASH',
                'CHECK',
                'ACH',
                'WIRE',
                '_SYSTEM_GENERATED'
            )
        `);
        await queryRunner.query(/* sql */ `
            ALTER TABLE "fund_transaction_detail" ADD COLUMN "payment_type" transaction_detail_payment_type NOT NULL DEFAULT '_SYSTEM_GENERATED'
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/* sql */ `
            ALTER TABLE "fund_transaction_detail" DROP COLUMN "payment_type"
        `);
        await queryRunner.query(/* sql */ `
            DROP TYPE "transaction_detail_payment_type"
        `);
    }
}
