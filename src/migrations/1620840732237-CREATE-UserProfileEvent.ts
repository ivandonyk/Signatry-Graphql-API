import { MigrationInterface, QueryRunner } from 'typeorm';

export class CREATEUserProfileEvent1620840732237 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/*sql*/ `
            CREATE TYPE user_profile_event_name AS ENUM ('NOTIFICATION')
        `);

        await queryRunner.query(
            `CREATE TABLE "user_profile_event" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "name" user_profile_event_name NOT NULL,
            "user_profile_id" uuid NOT NULL,
            "version" integer NOT NULL DEFAULT 1,
            "updated_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updated_by" uuid NULL,
            "created_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "created_by" uuid NULL)`
        );
        await queryRunner.query(
            'CREATE INDEX user_profile_idx ON user_profile_event (user_profile_id)'
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('DROP TABLE "user_profile_event"');

        await queryRunner.query(`
            DROP TYPE IF EXISTS user_profile_event_name
        `);
    }
}
