import { MigrationInterface, QueryRunner } from 'typeorm';

export class updateUserProfileAddressEmailPhone1582302578875 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        // add enabled columns
        await queryRunner.query(
            'ALTER TABLE "user_profile_email_address" ADD "enabled" boolean NOT NULL DEFAULT true'
        );
        await queryRunner.query(
            'ALTER TABLE "user_profile_street_address" ADD "enabled" boolean NOT NULL DEFAULT true'
        );
        await queryRunner.query(
            'ALTER TABLE "user_profile_phone_number" ADD "enabled" boolean NOT NULL DEFAULT true'
        );
        // add created_by/updated_by columns
        await queryRunner.query(
            'ALTER TABLE "user_profile_email_address" ADD "created_by_id" uuid'
        );
        await queryRunner.query(
            'ALTER TABLE "user_profile_email_address" ADD "updated_by_id" uuid'
        );
        await queryRunner.query(
            'ALTER TABLE "user_profile_street_address" ADD "created_by_id" uuid'
        );
        await queryRunner.query(
            'ALTER TABLE "user_profile_street_address" ADD "updated_by_id" uuid'
        );
        await queryRunner.query('ALTER TABLE "user_profile_phone_number" ADD "created_by_id" uuid');
        await queryRunner.query('ALTER TABLE "user_profile_phone_number" ADD "updated_by_id" uuid');
        // add line_three column to user_profile_address
        await queryRunner.query(
            'ALTER TABLE "user_profile_street_address" ADD "line_three" character varying'
        );
        // drop type_id from user_profile_phone_number
        await queryRunner.query('ALTER TABLE "user_profile_phone_number" DROP COLUMN "type_id"');
        // drop phone_number_type table
        await queryRunner.query('DROP TABLE "phone_number_type"');
        // rename tables
        await queryRunner.query(
            'ALTER TABLE "user_profile_email_address" RENAME TO "user_profile_email"'
        );
        await queryRunner.query(
            'ALTER TABLE "user_profile_street_address" RENAME TO "user_profile_address"'
        );
        await queryRunner.query(
            'ALTER TABLE "user_profile_phone_number" RENAME TO "user_profile_phone"'
        );
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            'ALTER TABLE "user_profile_email" RENAME TO "user_profile_email_address"'
        );
        await queryRunner.query(
            'ALTER TABLE "user_profile_address" RENAME TO "user_profile_street_address"'
        );
        await queryRunner.query(
            'ALTER TABLE "user_profile_phone" RENAME TO "user_profile_phone_number"'
        );
        await queryRunner.query(
            'CREATE TABLE "phone_number_type" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, "version" integer NOT NULL DEFAULT 1, "name" character varying NOT NULL, CONSTRAINT "PK_09375e87a5e34ebb3823fa83701" PRIMARY KEY ("id"))'
        );
        const ids = await queryRunner.query(
            "INSERT INTO \"phone_number_type\" (name) VALUES ('Home'), ('Mobile'), ('Work') RETURNING id"
        );
        await queryRunner.query('ALTER TABLE "user_profile_phone_number" ADD "type_id" uuid');
        await queryRunner.query(
            'ALTER TABLE "user_profile_phone_number" ADD CONSTRAINT "FK_b8d8381b8fac8e7abfd554611f9" FOREIGN KEY ("type_id") REFERENCES "phone_number_type"("id") ON DELETE NO ACTION ON UPDATE NO ACTION'
        );
        await queryRunner.query(
            `UPDATE "user_profile_phone_number" SET "type_id" = '${ids[1].id}'`
        );
        await queryRunner.query(
            'ALTER TABLE "user_profile_phone_number" ALTER COLUMN "type_id" SET NOT NULL'
        );
        await queryRunner.query(
            'ALTER TABLE "user_profile_email_address" DROP COLUMN "created_by_id"'
        );
        await queryRunner.query(
            'ALTER TABLE "user_profile_email_address" DROP COLUMN "updated_by_id"'
        );
        await queryRunner.query(
            'ALTER TABLE "user_profile_street_address" DROP COLUMN "created_by_id"'
        );
        await queryRunner.query(
            'ALTER TABLE "user_profile_street_address" DROP COLUMN "updated_by_id"'
        );
        await queryRunner.query(
            'ALTER TABLE "user_profile_phone_number" DROP COLUMN "created_by_id"'
        );
        await queryRunner.query(
            'ALTER TABLE "user_profile_phone_number" DROP COLUMN "updated_by_id"'
        );
        await queryRunner.query(
            'ALTER TABLE "user_profile_street_address" DROP COLUMN "line_three"'
        );
        await queryRunner.query('ALTER TABLE "user_profile_email_address" DROP COLUMN "enabled"');
        await queryRunner.query('ALTER TABLE "user_profile_street_address" DROP COLUMN "enabled"');
        await queryRunner.query('ALTER TABLE "user_profile_phone_number" DROP COLUMN "enabled"');
    }
}
