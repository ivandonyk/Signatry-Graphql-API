import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERFundTransactionDropGrantStatuses1605048259464 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('DROP VIEW IF EXISTS "grants"');
        await queryRunner.query(
            'ALTER TABLE "fund_transaction" DROP COLUMN "grant_payment_status"'
        );
        await queryRunner.query('ALTER TABLE "fund_transaction" DROP COLUMN "divestment_status"');
        await queryRunner.query('DROP TYPE "transaction_grant_payment_status"');
        await queryRunner.query('DROP TYPE "transaction_divestment_status"');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            "CREATE TYPE transaction_divestment_status AS ENUM ('PENDING', 'DIVESTED', 'READY_FOR_DIVESTMENT')"
        );
        await queryRunner.query(
            "CREATE TYPE transaction_grant_payment_status AS ENUM ('PENDING', 'READY_FOR_PAYMENT', 'PAYMENT_SENT')"
        );
        await queryRunner.query(
            'ALTER TABLE "fund_transaction" ADD COLUMN "grant_payment_status" transaction_grant_payment_status DEFAULT \'PENDING\''
        );
        await queryRunner.query(
            'ALTER TABLE "fund_transaction" ADD COLUMN "divestment_status" transaction_divestment_status DEFAULT \'PENDING\''
        );
    }
}
