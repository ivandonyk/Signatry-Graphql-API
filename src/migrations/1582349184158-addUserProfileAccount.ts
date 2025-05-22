import { MigrationInterface, QueryRunner } from 'typeorm';

export class addUserProfileAccount1582349184158 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        // rename plaid_item table to user_profile_account
        await queryRunner.query('ALTER TABLE "plaid_item" RENAME TO "user_profile_account"');
        // add enabled
        await queryRunner.query(
            'ALTER TABLE "user_profile_account" ADD "enabled" boolean NOT NULL DEFAULT true',
            undefined
        );
        // add created_by_id/updated_by_id
        await queryRunner.query(
            'ALTER TABLE "user_profile_account" ADD "created_by_id" uuid',
            undefined
        );
        await queryRunner.query(
            'ALTER TABLE "user_profile_account" ADD "updated_by_id" uuid',
            undefined
        );
        // rename fund_contribution.plaid_item_id -> fund_contribution.user_profile_account_id
        await queryRunner.query(
            'ALTER TABLE "fund_contribution" RENAME COLUMN plaid_item_id TO user_profile_account_id'
        );
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            'ALTER TABLE "fund_contribution" RENAME COLUMN user_profile_account_id TO plaid_item_id'
        );
        await queryRunner.query('ALTER TABLE "user_profile_account" DROP COLUMN "updated_by_id"');
        await queryRunner.query('ALTER TABLE "user_profile_account" DROP COLUMN "created_by_id"');
        await queryRunner.query('ALTER TABLE "user_profile_account" DROP COLUMN "enabled"');
        await queryRunner.query('ALTER TABLE "user_profile_account" RENAME TO "plaid_item"');
    }
}
