import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERGLAccountTypeAddFeeType1598557257479 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            'ALTER TYPE "gl_account_type_name" RENAME TO "_gl_account_type_name"'
        );
        await queryRunner.query(`
            CREATE TYPE "gl_account_type_name" AS ENUM (
                'PRIMARY', 
                'CONTRIBUTION_REVENUE', 
                'POOL_PASSTHROUGH', 
                'INVESTMENT', 
                'GRANT_DISBURSEMENT', 
                'GRANT_RECIPIENT',
                'CREDIT_CARD_FEES'
            )
        `);
        await queryRunner.query('ALTER TABLE "gl_account_type" RENAME COLUMN "name" TO "_name"');
        await queryRunner.query(
            'ALTER TABLE "gl_account_type" ADD COLUMN "name" "gl_account_type_name"'
        );
        await queryRunner.query(
            'UPDATE "gl_account_type" SET "name" = "_name"::text::"gl_account_type_name"'
        );
        await queryRunner.query('ALTER TABLE "gl_account_type" DROP COLUMN "_name"');
        await queryRunner.query('DROP TYPE "_gl_account_type_name"');

        await queryRunner.query(`
            INSERT INTO "gl_account_type" ("name", "label", "description")
            VALUES 
            ('CREDIT_CARD_FEES', 'Credit Card Fee Expense Account', 'Tracks credit card processing expenses.')
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            'DELETE FROM "gl_account_type" WHERE "name" = \'CREDIT_CARD_FEES\''
        );
        await queryRunner.query(
            'ALTER TYPE "gl_account_type_name" RENAME TO "_gl_account_type_name"'
        );
        await queryRunner.query(`
            CREATE TYPE "gl_account_type_name" AS ENUM (
                'PRIMARY', 
                'CONTRIBUTION_REVENUE', 
                'POOL_PASSTHROUGH', 
                'INVESTMENT', 
                'GRANT_DISBURSEMENT', 
                'GRANT_RECIPIENT'
            )
        `);
        await queryRunner.query('ALTER TABLE "gl_account_type" RENAME COLUMN "name" TO "_name"');
        await queryRunner.query(
            'ALTER TABLE "gl_account_type" ADD COLUMN "name" "gl_account_type_name"'
        );
        await queryRunner.query(
            'UPDATE "gl_account_type" SET "name" = "_name"::text::"gl_account_type_name"'
        );
        await queryRunner.query('ALTER TABLE "gl_account_type" DROP COLUMN "_name"');
        await queryRunner.query('DROP TYPE "_gl_account_type_name"');
    }
}
