import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERFundtransactionAddGrantPaymentStatusDivestmentStatus1591028549382
    implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            "CREATE TYPE fund_transaction_divestment_status AS ENUM ('PENDING', 'DIVESTED')"
        );
        await queryRunner.query(
            "CREATE TYPE fund_transaction_grant_payment_status AS ENUM ('PENDING')"
        );
        await queryRunner.query(
            "ALTER TABLE fund_transaction ADD COLUMN divestment_status fund_transaction_divestment_status default 'PENDING'"
        );
        await queryRunner.query(
            "ALTER TABLE fund_transaction ADD COLUMN grant_payment_status fund_transaction_grant_payment_status default 'PENDING'"
        );
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query('ALTER TABLE fund_transaction DROP COLUMN "divestment_status"');
        await queryRunner.query('ALTER TABLE fund_transaction DROP COLUMN "grant_payment_status"');
        await queryRunner.query('DROP TYPE IF EXISTS fund_transaction_divestment_status');
        await queryRunner.query('DROP TYPE IF EXISTS fund_transaction_grant_payment_status');
    }
}
