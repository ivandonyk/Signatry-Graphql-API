import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERRemoveAppRemindersFromUserProfile1606947569979 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "user_profile" DROP COLUMN "app_reminders";
        `);
    }
    public async down(queryRunner: QueryRunner): Promise<void> {
        const defaultValue = {
            recurringContributions: false
        };

        await queryRunner.query(`
            ALTER TABLE "user_profile" ADD COLUMN "app_reminders" jsonb NOT NULL DEFAULT '${JSON.stringify(
                defaultValue
            )}'::jsonb;
        `);
    }
}
