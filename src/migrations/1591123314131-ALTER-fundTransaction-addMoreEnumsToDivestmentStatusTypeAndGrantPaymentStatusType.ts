import { MigrationInterface, QueryRunner } from 'typeorm';

// Old values
// divestment- PENDING, DIVESTED
// grant payment- PENDING

export class ALTERFundTransactionAddMoreEnumsToDivestmentStatusTypeAndGrantPaymentStatusType1591123314131
    implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            'ALTER TYPE fund_transaction_divestment_status RENAME TO fund_transaction_divestment_status_old'
        );
        await queryRunner.query(
            "CREATE TYPE fund_transaction_divestment_status AS ENUM ('PENDING', 'DIVESTED', 'READY_FOR_DIVESTMENT')"
        );
        await queryRunner.query(
            'ALTER TABLE fund_transaction RENAME COLUMN divestment_status TO divestment_status_old'
        );
        await queryRunner.query(
            "ALTER TABLE fund_transaction ADD COLUMN divestment_status fund_transaction_divestment_status NOT NULL DEFAULT 'PENDING'"
        );
        await queryRunner.query(
            'UPDATE fund_transaction SET divestment_status = divestment_status_old::text::fund_transaction_divestment_status'
        );
        await queryRunner.query('ALTER TABLE fund_transaction DROP COLUMN divestment_status_old');
        await queryRunner.query('DROP TYPE fund_transaction_divestment_status_old');

        await queryRunner.query(
            'ALTER TYPE fund_transaction_grant_payment_status RENAME TO fund_transaction_grant_payment_status_old'
        );
        await queryRunner.query(
            "CREATE TYPE fund_transaction_grant_payment_status AS ENUM ('PENDING', 'SCHEDULED', 'READY_FOR_PAYMENT', 'SENT', 'CLEARED')"
        );
        await queryRunner.query(
            'ALTER TABLE fund_transaction RENAME COLUMN grant_payment_status TO grant_payment_status_old'
        );
        await queryRunner.query(
            "ALTER TABLE fund_transaction ADD COLUMN grant_payment_status fund_transaction_grant_payment_status NOT NULL DEFAULT 'PENDING'"
        );
        await queryRunner.query(
            'UPDATE fund_transaction SET grant_payment_status = grant_payment_status_old::text::fund_transaction_grant_payment_status'
        );
        await queryRunner.query(
            'ALTER TABLE fund_transaction DROP COLUMN grant_payment_status_old'
        );
        await queryRunner.query('DROP TYPE fund_transaction_grant_payment_status_old');
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            'ALTER TYPE fund_transaction_divestment_status RENAME TO fund_transaction_divestment_status_old'
        );
        await queryRunner.query(
            "CREATE TYPE fund_transaction_divestment_status AS ENUM ('PENDING', 'DIVESTED')"
        );
        await queryRunner.query(
            'ALTER TABLE fund_transaction RENAME COLUMN divestment_status TO divestment_status_old'
        );
        await queryRunner.query(
            "ALTER TABLE fund_transaction ADD COLUMN divestment_status fund_transaction_divestment_status NOT NULL DEFAULT 'PENDING'"
        );
        await queryRunner.query(
            'UPDATE fund_transaction SET divestment_status = divestment_status_old::text::fund_transaction_divestment_status'
        );
        await queryRunner.query('ALTER TABLE fund_transaction DROP COLUMN divestment_status_old');
        await queryRunner.query('DROP TYPE fund_transaction_divestment_status_old');

        await queryRunner.query(
            'ALTER TYPE fund_transaction_grant_payment_status RENAME TO fund_transaction_grant_payment_status_old'
        );
        await queryRunner.query(
            "CREATE TYPE fund_transaction_grant_payment_status AS ENUM ('PENDING')"
        );
        await queryRunner.query(
            'ALTER TABLE fund_transaction RENAME COLUMN grant_payment_status TO grant_payment_status_old'
        );
        await queryRunner.query(
            "ALTER TABLE fund_transaction ADD COLUMN grant_payment_status fund_transaction_grant_payment_status NOT NULL DEFAULT 'PENDING'"
        );
        await queryRunner.query(
            'UPDATE fund_transaction SET grant_payment_status = grant_payment_status_old::text::fund_transaction_grant_payment_status'
        );
        await queryRunner.query(
            'ALTER TABLE fund_transaction DROP COLUMN grant_payment_status_old'
        );
        await queryRunner.query('DROP TYPE fund_transaction_grant_payment_status_old');
    }
}
