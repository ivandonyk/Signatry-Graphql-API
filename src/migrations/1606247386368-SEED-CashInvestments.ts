import { MigrationInterface, QueryRunner } from 'typeorm';

export class SEEDCashInvestments1606247386368 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TYPE "investment_type" 
            RENAME TO "_investment_type"
        `);
        await queryRunner.query(`
            ALTER TABLE "investment" 
            RENAME COLUMN "investment_type" TO "_investment_type"
        `);

        await queryRunner.query(`
        CREATE TYPE "investment_type" AS ENUM (
        'IMA',
        'POOL',
        'GRANT_CASH',
        'CONTRIBUTION_CASH'
        )`);

        await queryRunner.query(`
        ALTER TABLE "investment" ADD COLUMN "investment_type" "investment_type"
        `);

        await queryRunner.query(`
        UPDATE "investment" SET "investment_type" = "_investment_type"::text::"investment_type"
        `);

        await queryRunner.query(`
        INSERT INTO "investment" (
        "name",
        "investment_type",
        "default_allocation_percentage",
        "description",
        "order_num"
        ) VALUES (
        'Grant Cash',
        'GRANT_CASH',
        0,
        'Account from which grant funds are disbursed',
        5
        ), (
        'Contribution Cash',
        'CONTRIBUTION_CASH',
        0,
        'Account into which contributed funds are received',
        6
        )
        `);

        await queryRunner.query(`
        ALTER TABLE "investment" DROP COLUMN "_investment_type"
        `);

        await queryRunner.query('DROP TYPE "_investment_type"');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
        DELETE FROM "investment" 
        WHERE "investment_type" IN ('GRANT_CASH', 'CONTRIBUTION_CASH')
        `);

        await queryRunner.query(`
            ALTER TYPE "investment_type" 
            RENAME TO "_investment_type"
        `);
        await queryRunner.query(`
            ALTER TABLE "investment" 
            RENAME COLUMN "investment_type" TO "_investment_type"
        `);

        await queryRunner.query(`
        CREATE TYPE "investment_type" AS ENUM (
        'IMA',
        'POOL'
        )`);

        await queryRunner.query(`
        ALTER TABLE "investment" ADD COLUMN "investment_type" "investment_type"
        `);

        await queryRunner.query(`
        UPDATE "investment" SET "investment_type" = "_investment_type"
        `);

        await queryRunner.query(`
        ALTER TABLE "investment" DROP COLUMN "_investment_type"
        `);

        await queryRunner.query('DROP TYPE "_investment_type"');
    }
}
