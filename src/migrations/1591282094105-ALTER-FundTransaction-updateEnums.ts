import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERFundTransactionUpdateEnums1591282094105 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            "CREATE TYPE transaction_divestment_status AS ENUM ('PENDING', 'DIVESTED', 'READY_FOR_DIVESTMENT')"
        );
        await queryRunner.query(
            "CREATE TYPE transaction_grant_payment_status AS ENUM ('PENDING', 'READY_FOR_PAYMENT', 'PAYMENT_SENT')"
        );

        await queryRunner.query(/*sql*/ `
            ALTER TABLE fund_transaction ALTER COLUMN divestment_status DROP DEFAULT   
        `);

        await queryRunner.query(/*sql*/ `
            ALTER TABLE fund_transaction ALTER COLUMN grant_payment_status DROP DEFAULT   
        `);

        await queryRunner.query(
            'ALTER TABLE fund_transaction ALTER COLUMN divestment_status SET DATA TYPE transaction_divestment_status USING divestment_status::text::transaction_divestment_status'
        );
        await queryRunner.query(
            'ALTER TABLE fund_transaction ALTER COLUMN grant_payment_status SET DATA TYPE transaction_grant_payment_status USING grant_payment_status::text::transaction_grant_payment_status'
        );

        await queryRunner.query(/*sql*/ `
            ALTER TABLE fund_transaction ALTER COLUMN divestment_status SET DEFAULT 'PENDING'
        `);

        await queryRunner.query(/*sql*/ `
            ALTER TABLE fund_transaction ALTER COLUMN grant_payment_status SET DEFAULT 'PENDING'
        `);

        await queryRunner.query('DROP TYPE IF EXISTS fund_transaction_grant_payment_status');
        await queryRunner.query('DROP TYPE IF EXISTS fund_transaction_divestment_status');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            "CREATE TYPE fund_transaction_divestment_status AS ENUM ('PENDING', 'DIVESTED')"
        );
        await queryRunner.query(
            "CREATE TYPE fund_transaction_grant_payment_status AS ENUM ('PENDING')"
        );

        await queryRunner.query(/*sql*/ `
            ALTER TABLE fund_transaction ALTER COLUMN divestment_status DROP DEFAULT   
        `);

        await queryRunner.query(/*sql*/ `
            ALTER TABLE fund_transaction ALTER COLUMN grant_payment_status DROP DEFAULT   
        `);

        await queryRunner.query(
            'ALTER TABLE fund_transaction ALTER COLUMN divestment_status SET DATA TYPE fund_transaction_divestment_status USING divestment_status::text::fund_transaction_divestment_status'
        );
        await queryRunner.query(
            'ALTER TABLE fund_transaction ALTER COLUMN grant_payment_status SET DATA TYPE fund_transaction_grant_payment_status USING grant_payment_status::text::fund_transaction_grant_payment_status'
        );

        await queryRunner.query(/*sql*/ `
            ALTER TABLE fund_transaction ALTER COLUMN divestment_status SET DEFAULT 'PENDING'
        `);

        await queryRunner.query(/*sql*/ `
            ALTER TABLE fund_transaction ALTER COLUMN grant_payment_status SET DEFAULT 'PENDING'
        `);

        await queryRunner.query('DROP TYPE IF EXISTS transaction_grant_payment_status');
        await queryRunner.query('DROP TYPE IF EXISTS transaction_divestment_status');
    }
}
