import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERFundAddFundKey1588108552586 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query('ALTER TABLE "fund" ADD COLUMN "fund_key" character varying');

        // populate fund_key for existing funds
        await queryRunner.query(/*sql*/ `
            UPDATE fund
            SET fund_key = result.user_name || result.index
            FROM (
                SELECT
                    fund.id,
                    UPPER(LEFT(TRIM(user_profile.last_name), 5)) AS user_name,
                    RANK() OVER (
                        PARTITION BY LEFT(TRIM(user_profile.last_name), 5)
                        ORDER BY fund.created_on ASC
                    ) AS index
                FROM fund
                LEFT JOIN user_profile on fund.created_by_user_profile_id = user_profile.id
            ) result
            WHERE result.id = fund.id
        `);

        await queryRunner.query('ALTER TABLE "fund" ALTER COLUMN fund_key SET NOT NULL;');
        await queryRunner.query('ALTER TABLE "fund" ADD CONSTRAINT "UNQ_FK" UNIQUE ("fund_key")');
        // make first/last name non-nullable
        await queryRunner.query('ALTER TABLE "user_profile" ALTER COLUMN first_name SET NOT NULL');
        await queryRunner.query('ALTER TABLE "user_profile" ALTER COLUMN last_name SET NOT NULL');
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query('ALTER TABLE "fund" DROP CONSTRAINT "UNQ_FK"');
        await queryRunner.query('ALTER TABLE "fund" DROP COLUMN "fund_key"');
    }
}
