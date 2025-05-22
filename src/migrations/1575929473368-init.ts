import { MigrationInterface, QueryRunner } from 'typeorm';

export class init1575929473368 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            'CREATE TABLE "tenant" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, "version" integer NOT NULL DEFAULT 1, "name" character varying NOT NULL, "settings" json NOT NULL, CONSTRAINT "PK_da8c6efd67bb301e810e56ac139" PRIMARY KEY ("id"))',
            undefined
        );
        await queryRunner.query(
            'CREATE TABLE "plaid_item" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, "version" integer NOT NULL DEFAULT 1, "item_id" character varying NOT NULL, "access_token" character varying NOT NULL, "institution_id" character varying NOT NULL, "account_id" character varying, "tenant_id" uuid, "user_profile_id" uuid, CONSTRAINT "PK_74131b4c5292d7f6f1a7ad168e6" PRIMARY KEY ("id"))',
            undefined
        );
        await queryRunner.query(
            'CREATE TABLE "user_profile_phone_number" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, "version" integer NOT NULL DEFAULT 1, "value" character varying NOT NULL, "is_primary" boolean NOT NULL, "city" character varying, "state" character varying, "postal_code" character varying, "user_profile_id" uuid NOT NULL, CONSTRAINT "PK_0dfcdbab6c9c971ff4b57483ac8" PRIMARY KEY ("id"))',
            undefined
        );
        await queryRunner.query(
            'CREATE TABLE "user_profile_email_address" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, "version" integer NOT NULL DEFAULT 1, "value" character varying NOT NULL, "is_primary" boolean NOT NULL, "user_profile_id" uuid NOT NULL, CONSTRAINT "PK_bb1271a118553bb41b9e061db01" PRIMARY KEY ("id"))',
            undefined
        );
        await queryRunner.query(
            'CREATE TABLE "user_profile_street_address" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, "version" integer NOT NULL DEFAULT 1, "line_one" character varying NOT NULL, "line_two" character varying, "city" character varying NOT NULL, "state" character varying NOT NULL, "postal_code" character varying NOT NULL, "country" character varying NOT NULL, "is_primary" boolean NOT NULL, "user_profile_id" uuid NOT NULL, CONSTRAINT "PK_1adb380d4de4afffd4ce6816f60" PRIMARY KEY ("id"))',
            undefined
        );
        await queryRunner.query(
            'CREATE TABLE "user_profile" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, "version" integer NOT NULL DEFAULT 1, "first_name" character varying, "middle_name" character varying, "last_name" character varying, CONSTRAINT "PK_f44d0cd18cfd80b0fed7806c3b7" PRIMARY KEY ("id"))',
            undefined
        );
        await queryRunner.query(
            'CREATE TABLE "app_user" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, "version" integer NOT NULL DEFAULT 1, "sub" character varying NOT NULL, "username" character varying, "phone_number" character varying, "email_address" character varying, "user_profile_id" uuid NOT NULL, CONSTRAINT "PK_22a5c4a3d9b2fb8e4e73fc4ada1" PRIMARY KEY ("id"))',
            undefined
        );
        await queryRunner.query(
            'ALTER TABLE "plaid_item" ADD CONSTRAINT "FK_ea8bc564fd689d39224ff8d7b26" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
            undefined
        );
        await queryRunner.query(
            'ALTER TABLE "plaid_item" ADD CONSTRAINT "FK_ab41915cea33a8cff1381f163ee" FOREIGN KEY ("user_profile_id") REFERENCES "user_profile"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
            undefined
        );
        await queryRunner.query(
            'ALTER TABLE "user_profile_phone_number" ADD CONSTRAINT "FK_332d50f6001a183b7edd6fc2418" FOREIGN KEY ("user_profile_id") REFERENCES "user_profile"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
            undefined
        );
        await queryRunner.query(
            'ALTER TABLE "user_profile_email_address" ADD CONSTRAINT "FK_5b78e6b195e4b09c44fedcbb3ac" FOREIGN KEY ("user_profile_id") REFERENCES "user_profile"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
            undefined
        );
        await queryRunner.query(
            'ALTER TABLE "user_profile_street_address" ADD CONSTRAINT "FK_d8601b07db38f4be5ff4ffa05f2" FOREIGN KEY ("user_profile_id") REFERENCES "user_profile"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
            undefined
        );
        await queryRunner.query(
            'ALTER TABLE "app_user" ADD CONSTRAINT "FK_e21b3692f72251af14219bedbff" FOREIGN KEY ("user_profile_id") REFERENCES "user_profile"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
            undefined
        );
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            'ALTER TABLE "app_user" DROP CONSTRAINT "FK_e21b3692f72251af14219bedbff"',
            undefined
        );
        await queryRunner.query(
            'ALTER TABLE "user_profile_street_address" DROP CONSTRAINT "FK_d8601b07db38f4be5ff4ffa05f2"',
            undefined
        );
        await queryRunner.query(
            'ALTER TABLE "user_profile_email_address" DROP CONSTRAINT "FK_5b78e6b195e4b09c44fedcbb3ac"',
            undefined
        );
        await queryRunner.query(
            'ALTER TABLE "user_profile_phone_number" DROP CONSTRAINT "FK_332d50f6001a183b7edd6fc2418"',
            undefined
        );
        await queryRunner.query(
            'ALTER TABLE "plaid_item" DROP CONSTRAINT "FK_ab41915cea33a8cff1381f163ee"',
            undefined
        );
        await queryRunner.query(
            'ALTER TABLE "plaid_item" DROP CONSTRAINT "FK_ea8bc564fd689d39224ff8d7b26"',
            undefined
        );
        await queryRunner.query('DROP TABLE "app_user"', undefined);
        await queryRunner.query('DROP TABLE "user_profile"', undefined);
        await queryRunner.query('DROP TABLE "user_profile_street_address"', undefined);
        await queryRunner.query('DROP TABLE "user_profile_email_address"', undefined);
        await queryRunner.query('DROP TABLE "user_profile_phone_number"', undefined);
        await queryRunner.query('DROP TABLE "plaid_item"', undefined);
        await queryRunner.query('DROP TABLE "tenant"', undefined);
    }
}
