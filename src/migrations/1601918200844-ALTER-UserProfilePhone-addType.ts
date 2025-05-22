import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERUserProfilePhoneAddType1601918200844 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/*sql*/ `
            CREATE TYPE "user_profile_phone_type" AS ENUM (
                'Home', 
                'Work', 
                'Mobile'
            )
        `);

        await queryRunner.query(/*sql*/ `
            ALTER TABLE user_profile_phone ADD COLUMN "type" user_profile_phone_type default 'Mobile'
        `);

        await queryRunner.query(/*sql*/ `
            UPDATE user_profile_phone
            SET type = 'Work'
            FROM (
                SELECT
                user_profile_phone.id,
                RANK() OVER (PARTITION BY user_profile_phone.user_profile_id ORDER BY user_profile_phone.created_on DESC) as rank
                FROM user_profile_phone
            ) results
            WHERE results.id = user_profile_phone.id
            AND results.rank = 2;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/*sql*/ `
            ALTER TABLE user_profile_phone DROP COLUMN "type"
        `);

        await queryRunner.query(/*sql*/ `
            DROP TYPE "user_profile_phone_type"
        `);
    }
}
