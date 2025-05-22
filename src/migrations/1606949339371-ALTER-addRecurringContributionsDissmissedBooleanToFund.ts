import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERAddRecurringContributionsDissmissedBooleanToFund1606949339371
    implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "fund" ADD COLUMN "recurring_contributions_dismissed" boolean NOT NULL DEFAULT false;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "fund" DROP COLUMN "recurring_contributions_dismissed";
        `);
    }
}
