import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERGuidestarSealEnumAddBasic1599603201998 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TYPE "guidestar_seal" RENAME TO "_guidestar_seal"');
        await queryRunner.query(`
            CREATE TYPE "guidestar_seal" AS ENUM (
                'Basic', 
                'Bronze', 
                'Silver', 
                'Gold', 
                'Platinum'
            )
        `);
        await queryRunner.query(
            'ALTER TABLE "recipient" RENAME COLUMN "guidestar_seal" TO "_guidestar_seal"'
        );
        await queryRunner.query(
            'ALTER TABLE "recipient" ADD COLUMN "guidestar_seal" "guidestar_seal"'
        );
        await queryRunner.query(
            'UPDATE "recipient" SET "guidestar_seal" = "_guidestar_seal"::text::"guidestar_seal"'
        );
        await queryRunner.query('ALTER TABLE "recipient" DROP COLUMN "_guidestar_seal"');
        await queryRunner.query('DROP TYPE "_guidestar_seal"');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TYPE "guidestar_seal" RENAME TO "_guidestar_seal"');
        await queryRunner.query(`
            CREATE TYPE "guidestar_seal" AS ENUM (
                'Bronze', 
                'Silver', 
                'Gold', 
                'Platinum'
            )
        `);
        await queryRunner.query(
            'ALTER TABLE "recipient" RENAME COLUMN "guidestar_seal" TO "_guidestar_seal"'
        );
        await queryRunner.query(
            'ALTER TABLE "recipient" ADD COLUMN "guidestar_seal" "guidestar_seal"'
        );
        await queryRunner.query(
            'UPDATE "recipient" SET "guidestar_seal" = "_guidestar_seal"::text::"guidestar_seal"'
        );
        await queryRunner.query('ALTER TABLE "recipient" DROP COLUMN "_guidestar_seal"');
        await queryRunner.query('DROP TYPE "_guidestar_seal"');
    }
}
