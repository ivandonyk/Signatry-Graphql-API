import { MigrationInterface, QueryRunner } from 'typeorm';

export class updateAppUserAndProfile1582228461859 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        // add app_user_id column to user_profile table (no constraints yet)
        await queryRunner.query('ALTER TABLE user_profile ADD "app_user_id" uuid');
        // add dob to user_profile table
        await queryRunner.query('ALTER TABLE "user_profile" ADD "dob" character varying');
        // add enabled column to user_profile and app_user tables
        await queryRunner.query(
            'ALTER TABLE "user_profile" ADD "enabled" boolean NOT NULL DEFAULT true'
        );
        await queryRunner.query(
            'ALTER TABLE "app_user" ADD "enabled" boolean NOT NULL DEFAULT true'
        );
        // add created_by_id/updated_by_id to user_profile table
        await queryRunner.query('ALTER TABLE "user_profile" ADD "created_by_id" uuid');
        await queryRunner.query('ALTER TABLE "user_profile" ADD "updated_by_id" uuid');
        // add created_by_id/updated_by_id to app_user table
        await queryRunner.query('ALTER TABLE "app_user" ADD "created_by_id" uuid');
        await queryRunner.query('ALTER TABLE "app_user" ADD "updated_by_id" uuid');
        // map user_profile_ids to app_user_ids
        const idMap = await queryRunner.query(
            'SELECT id AS app_user_id, user_profile_id FROM app_user;'
        );
        // populate app_user_id on each user_profile row
        await Promise.all(
            idMap.map((item: any) =>
                queryRunner.query(
                    `UPDATE user_profile SET app_user_id = '${item.app_user_id}' WHERE user_profile.id = '${item.user_profile_id}'`
                )
            )
        );
        // add user_profile.app_user_id constraint
        await queryRunner.query(
            'ALTER TABLE "user_profile" ADD CONSTRAINT "FK_AppUser_UserProfile" FOREIGN KEY ("app_user_id") REFERENCES "app_user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION'
        );
        // drop old app_user.user_profile_id constraint
        await queryRunner.query(
            'ALTER TABLE "app_user" DROP CONSTRAINT "FK_e21b3692f72251af14219bedbff"'
        );
        // drop app_user.user_profile_id column
        await queryRunner.query('ALTER TABLE "app_user" DROP COLUMN "user_profile_id"');
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        const idMap = await queryRunner.query(
            'SELECT id AS user_profile_id, app_user_id FROM user_profile WHERE app_user_id IS NOT NULL;'
        );
        await queryRunner.query(
            'ALTER TABLE "user_profile" DROP CONSTRAINT "FK_AppUser_UserProfile"'
        );
        await queryRunner.query('ALTER TABLE "user_profile" DROP COLUMN app_user_id');
        await queryRunner.query('ALTER TABLE "app_user" ADD "user_profile_id" uuid');
        await queryRunner.query('ALTER TABLE "user_profile" DROP COLUMN dob');
        await queryRunner.query('ALTER TABLE "user_profile" DROP COLUMN enabled');
        await queryRunner.query('ALTER TABLE "app_user" DROP COLUMN enabled');
        await queryRunner.query('ALTER TABLE "user_profile" DROP COLUMN "created_by_id"');
        await queryRunner.query('ALTER TABLE "user_profile" DROP COLUMN "updated_by_id"');
        await queryRunner.query('ALTER TABLE "app_user" DROP COLUMN "created_by_id"');
        await queryRunner.query('ALTER TABLE "app_user" DROP COLUMN "updated_by_id"');
        await Promise.all(
            idMap.map((item: any) =>
                queryRunner.query(
                    `UPDATE app_user SET user_profile_id = '${item.user_profile_id}' WHERE app_user.id = '${item.app_user_id}'`
                )
            )
        );
        await queryRunner.query(
            'ALTER TABLE "app_user" ADD CONSTRAINT "FK_e21b3692f72251af14219bedbff" FOREIGN KEY ("user_profile_id") REFERENCES "user_profile"("id") ON DELETE NO ACTION ON UPDATE NO ACTION'
        );
    }
}
