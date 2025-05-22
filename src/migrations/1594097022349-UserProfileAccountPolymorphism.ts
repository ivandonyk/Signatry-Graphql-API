import { MigrationInterface, QueryRunner } from 'typeorm';

export class UserProfileAccountPolymorphism1594097022349 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            'ALTER TABLE "user_profile_account" ADD COLUMN IF NOT EXISTS "payment_method_id" VARCHAR'
        );
        await queryRunner.query(
            "CREATE TYPE user_profile_account_type AS ENUM ('BANK_ACCOUNT', 'CREDIT_CARD')"
        );
        await queryRunner.query(
            "ALTER TABLE user_profile_account ADD COLUMN IF NOT EXISTS account_type user_profile_account_type DEFAULT 'BANK_ACCOUNT'"
        );
        await queryRunner.query(
            'ALTER TABLE "user_profile_account" ALTER COLUMN item_id DROP NOT NULL;'
        );
        await queryRunner.query(
            'ALTER TABLE "user_profile_account" ALTER COLUMN access_token DROP NOT NULL;'
        );
        await queryRunner.query(
            'ALTER TABLE "user_profile_account" ALTER COLUMN institution_id DROP NOT NULL;'
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            'ALTER TABLE "user_profile_account" DROP COLUMN IF EXISTS "payment_method_id"'
        );
        await queryRunner.query(
            'ALTER TABLE user_profile_account DROP COLUMN IF EXISTS "account_type"'
        );
        await queryRunner.query('DROP TYPE user_profile_account_type');
        await queryRunner.query(
            'ALTER TABLE "user_profile_account" ALTER COLUMN item_id SET NOT NULL;'
        );
        await queryRunner.query(
            'ALTER TABLE "user_profile_account" ALTER COLUMN access_token SET NOT NULL;'
        );
        await queryRunner.query(
            'ALTER TABLE "user_profile_account" ALTER COLUMN institution_id SET NOT NULL;'
        );
    }
}
