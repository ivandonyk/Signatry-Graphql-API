import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddContactInfoTables1582358293172 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            `CREATE TABLE "fund_contact" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "fund_id" uuid NOT NULL,
            "first_name" character varying NULL,
            "last_name" character varying NULL,
            "prefix" character varying NULL,
            "dob" DATE NULL,
            "is_primary" BOOLEAN NOT NULL DEFAULT true,
            "enabled" BOOLEAN NOT NULL DEFAULT true,
            "created_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "created_by" uuid NULL,
            "updated_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updated_by" uuid NULL,
            "user_profile_id" uuid NULL,
            "version" integer NOT NULL DEFAULT 1,
            CONSTRAINT "PK_FundContactId" PRIMARY KEY ("id"))`
        );
        await queryRunner.query(
            'ALTER TABLE "fund_contact" ADD CONSTRAINT "FK_Fund_FundContact" FOREIGN KEY ("fund_id") REFERENCES "fund"("id") ON DELETE NO ACTION ON UPDATE NO ACTION'
        );
        await queryRunner.query(
            'ALTER TABLE "fund_contact" ADD CONSTRAINT "FK_UserProfile_FundContact" FOREIGN KEY ("user_profile_id") REFERENCES "user_profile"("id") ON DELETE NO ACTION ON UPDATE NO ACTION'
        );
        await queryRunner.query(
            `CREATE TABLE "fund_contact_phone" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "fund_contact_id" uuid NOT null,
            "value" character varying NOT NULL,
            "is_primary" BOOLEAN NOT NULL DEFAULT true,
            "enabled" BOOLEAN NOT NULL DEFAULT true,
            "created_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "created_by" uuid NULL,
            "updated_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updated_by" uuid NULL,
            "version" integer NOT NULL DEFAULT 1,
            CONSTRAINT "PK_FundContactPhoneId" PRIMARY KEY ("id"))`
        );
        await queryRunner.query(
            'ALTER TABLE "fund_contact_phone" ADD CONSTRAINT "FK_FundContact_FundContactPhone" FOREIGN KEY ("fund_contact_id") REFERENCES "fund_contact"("id") ON DELETE NO ACTION ON UPDATE NO ACTION'
        );
        await queryRunner.query(
            `CREATE TABLE "fund_contact_email" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "fund_contact_id" uuid NOT null,
            "value" character varying NOT NULL,
            "is_primary" BOOLEAN NOT NULL DEFAULT true,
            "enabled" BOOLEAN NOT NULL DEFAULT true,
            "created_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "created_by" uuid NULL,
            "updated_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updated_by" uuid NULL,
            "version" integer NOT NULL DEFAULT 1,
            CONSTRAINT "PK_FundContactEmailId" PRIMARY KEY ("id"))`
        );
        await queryRunner.query(
            'ALTER TABLE "fund_contact_email" ADD CONSTRAINT "FK_FundContact_FundContactEmail" FOREIGN KEY ("fund_contact_id") REFERENCES "fund_contact"("id") ON DELETE NO ACTION ON UPDATE NO ACTION'
        );
        await queryRunner.query(
            `CREATE TABLE "fund_contact_address" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "fund_contact_id" uuid NOT null,
            "line_one" character varying NOT NULL,
            "line_two" character varying NULL,
            "line_three" character varying NULL,
            "city" character varying NOT NULL,
            "state" character varying NOT NULL,
            "postal_code" character varying NOT NULL,
            "country" character varying NOT NULL,
            "is_primary" BOOLEAN NOT NULL DEFAULT true,
            "enabled" BOOLEAN NOT NULL DEFAULT true,
            "created_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "created_by" uuid NULL,
            "updated_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updated_by" uuid NULL,
            "version" integer NOT NULL DEFAULT 1,
            CONSTRAINT "PK_FundContactAddressId" PRIMARY KEY ("id"))`
        );
        await queryRunner.query(
            'ALTER TABLE "fund_contact_address" ADD CONSTRAINT "FK_FundContact_FundContactAddress" FOREIGN KEY ("fund_contact_id") REFERENCES "fund_contact"("id") ON DELETE NO ACTION ON UPDATE NO ACTION'
        );
        await queryRunner.query('ALTER TABLE "fund" DROP COLUMN "first_name"');
        await queryRunner.query('ALTER TABLE "fund" DROP COLUMN "last_name"');
        await queryRunner.query('ALTER TABLE "fund" DROP COLUMN "prefix"');
        await queryRunner.query('ALTER TABLE "fund" DROP COLUMN "date_of_birth"');
        await queryRunner.query('ALTER TABLE "fund" DROP COLUMN "address1"');
        await queryRunner.query('ALTER TABLE "fund" DROP COLUMN "address2"');
        await queryRunner.query('ALTER TABLE "fund" DROP COLUMN "city"');
        await queryRunner.query('ALTER TABLE "fund" DROP COLUMN "state"');
        await queryRunner.query('ALTER TABLE "fund" DROP COLUMN "zip"');
        await queryRunner.query('ALTER TABLE "fund" DROP COLUMN "email"');
        await queryRunner.query('ALTER TABLE "fund" DROP COLUMN "phone"');
        await queryRunner.query('ALTER TABLE "fund" DROP COLUMN "phone_ext"');
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query('ALTER TABLE ADD COLUMN "phone_ext" character varying NULL');
        await queryRunner.query('ALTER TABLE ADD COLUMN "phone" character varying NULL', undefined);
        await queryRunner.query('ALTER TABLE ADD COLUMN "email" character varying NULL', undefined);
        await queryRunner.query('ALTER TABLE ADD COLUMN "zip" character varying NULL', undefined);
        await queryRunner.query('ALTER TABLE ADD COLUMN "state" character varying NULL', undefined);
        await queryRunner.query('ALTER TABLE ADD COLUMN "city" character varying NULL', undefined);
        await queryRunner.query('ALTER TABLE ADD COLUMN "address2" character varying NULL');
        await queryRunner.query(
            'ALTER TABLE ADD COLUMN "address1" character varying NULL',
            undefined
        );
        await queryRunner.query('ALTER TABLE ADD COLUMN "date_of_birth" character varying NULL');
        await queryRunner.query('ALTER TABLE ADD COLUMN "prefix" character varying NULL');
        await queryRunner.query(
            'ALTER TABLE ADD COLUMN "last_name" character varying NOT NULL',
            undefined
        );
        await queryRunner.query(
            'ALTER TABLE ADD COLUMN "first_name" character varying NOT NULL',
            undefined
        );
        await queryRunner.query(
            'ALTER TABLE "fund_contact_address" DROP CONSTRAINT "FK_FundContact_FundContactAddress"'
        );
        await queryRunner.query('DROP TABLE "fund_contact_address"');
        await queryRunner.query(
            'ALTER TABLE "fund_contact_email" DROP CONSTRAINT "FK_FundContact_FundContactEmail"'
        );
        await queryRunner.query('DROP TABLE "fund_contact_email"');
        await queryRunner.query(
            'ALTER TABLE "fund_contact_phone" DROP CONSTRAINT "FK_FundContact_FundContactPhone"'
        );
        await queryRunner.query('DROP TABLE "fund_contact_phone"');
        await queryRunner.query('ALTER TABLE "fund_contact" DROP CONSTRAINT "FK_Fund_FundContact"');
        await queryRunner.query('DROP TABLE "fund_contact"');
    }
}
