import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERAddJSONAppRemindersToUserProfile1605216999223 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        const defaultValue = {
            recurringContributions: false
        };

        await queryRunner.query(`
            ALTER TABLE "user_profile" ADD COLUMN "app_reminders" jsonb NOT NULL DEFAULT '${JSON.stringify(
                defaultValue
            )}'::jsonb;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "user_profile" DROP COLUMN "app_reminders";
        `);
    }
}
