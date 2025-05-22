import { MigrationInterface, QueryRunner } from 'typeorm';

export class ADDFieldsToRecipientChangeFundTransactionDest1594230643084
    implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            'ALTER TABLE "fund_transaction_destination" RENAME TO "fund_transaction_info"'
        );
        await queryRunner.query(
            'ALTER TABLE "fund_transaction_info" ADD "recognition" boolean NOT NULL DEFAULT true'
        );
        await queryRunner.query('ALTER TABLE "recipient" ADD "cause_category" character varying');
        await queryRunner.query('ALTER TABLE "recipient" ADD "code" character varying');
        await queryRunner.query('ALTER TABLE "recipient" ADD "website" character varying');
        await queryRunner.query('ALTER TABLE "recipient" ADD "npo_status" character varying');
        await queryRunner.query('ALTER TABLE "recipient" ADD "ntee_code" character varying');
        await queryRunner.query(
            'ALTER TABLE "recipient" ADD "non_profit_status" boolean NOT NULL DEFAULT false'
        );
        await queryRunner.query(
            'ALTER TABLE "recipient" ADD "ofac" boolean NOT NULL DEFAULT false'
        );
        await queryRunner.query(
            'ALTER TABLE "recipient" ADD "pub78" boolean NOT NULL DEFAULT false'
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE "recipient" DROP COLUMN "cause_category"');
        await queryRunner.query('ALTER TABLE "recipient" DROP COLUMN "code"');
        await queryRunner.query('ALTER TABLE "recipient" DROP COLUMN "website"');
        await queryRunner.query('ALTER TABLE "recipient" DROP COLUMN "npo_status"');
        await queryRunner.query('ALTER TABLE "recipient" DROP COLUMN "ntee_code"');
        await queryRunner.query('ALTER TABLE "recipient" DROP COLUMN "non_profit_status"');
        await queryRunner.query('ALTER TABLE "recipient" DROP COLUMN "ofac"');
        await queryRunner.query('ALTER TABLE "recipient" DROP COLUMN "pub78"');
        await queryRunner.query('ALTER TABLE "fund_transaction_info" DROP COLUMN "recognition"');
        await queryRunner.query(
            'ALTER TABLE "fund_transaction_info" RENAME TO "fund_transaction_destination"'
        );
    }
}
