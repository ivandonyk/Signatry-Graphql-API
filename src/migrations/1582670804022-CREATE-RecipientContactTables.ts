import { MigrationInterface, QueryRunner } from 'typeorm';

export class CREATERecipientContactTables1582670804022 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            `CREATE TABLE "recipient_contact" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "recipient_id" uuid NOT NULL,
            "first_name" character varying NULL,
            "last_name" character varying NULL,
            "user_profile_id" uuid NULL,
            "is_primary" BOOLEAN NOT NULL DEFAULT true,
            "enabled" BOOLEAN NOT NULL DEFAULT true,
            "created_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "created_by" uuid NULL,
            "updated_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updated_by" uuid NULL,
            "version" integer NOT NULL DEFAULT 1,
            CONSTRAINT "PK_RecipientContactId" PRIMARY KEY ("id"))`
        );
        await queryRunner.query(
            'ALTER TABLE "recipient_contact" ADD CONSTRAINT "FK_Recipient_RecipientContact" FOREIGN KEY ("recipient_id") REFERENCES "recipient"("id") ON DELETE NO ACTION ON UPDATE NO ACTION'
        );
        await queryRunner.query(
            'ALTER TABLE "recipient_contact" ADD CONSTRAINT "FK_UserProfile_RecipientContact" FOREIGN KEY ("user_profile_id") REFERENCES "user_profile"("id") ON DELETE NO ACTION ON UPDATE NO ACTION'
        );
        await queryRunner.query(
            `CREATE TABLE "recipient_contact_phone" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "recipient_contact_id" uuid NOT null,
            "value" character varying NOT NULL,
            "is_primary" BOOLEAN NOT NULL DEFAULT true,
            "enabled" BOOLEAN NOT NULL DEFAULT true,
            "created_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "created_by" uuid NULL,
            "updated_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updated_by" uuid NULL,
            "version" integer NOT NULL DEFAULT 1,
            CONSTRAINT "PK_RecipientContactPhoneId" PRIMARY KEY ("id"))`
        );
        await queryRunner.query(
            'ALTER TABLE "recipient_contact_phone" ADD CONSTRAINT "FK_RecipientContact_RecipientContactPhone" FOREIGN KEY ("recipient_contact_id") REFERENCES "recipient_contact"("id") ON DELETE NO ACTION ON UPDATE NO ACTION'
        );
        await queryRunner.query(
            `CREATE TABLE "recipient_contact_email" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "recipient_contact_id" uuid NOT null,
            "value" character varying NOT NULL,
            "is_primary" BOOLEAN NOT NULL DEFAULT true,
            "enabled" BOOLEAN NOT NULL DEFAULT true,
            "created_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "created_by" uuid NULL,
            "updated_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updated_by" uuid NULL,
            "version" integer NOT NULL DEFAULT 1,
            CONSTRAINT "PK_RecipientContactEmailId" PRIMARY KEY ("id"))`
        );
        await queryRunner.query(
            'ALTER TABLE "recipient_contact_email" ADD CONSTRAINT "FK_RecipientContact_RecipientContactEmail" FOREIGN KEY ("recipient_contact_id") REFERENCES "recipient_contact"("id") ON DELETE NO ACTION ON UPDATE NO ACTION'
        );
        await queryRunner.query(
            `CREATE TABLE "recipient_contact_address" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "recipient_contact_id" uuid NOT null,
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
            CONSTRAINT "PK_RecipientContactAddressId" PRIMARY KEY ("id"))`
        );
        await queryRunner.query(
            'ALTER TABLE "recipient_contact_address" ADD CONSTRAINT "FK_RecipientContact_RecipientContactAddress" FOREIGN KEY ("recipient_contact_id") REFERENCES "recipient_contact"("id") ON DELETE NO ACTION ON UPDATE NO ACTION'
        );
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query('DROP TABLE recipient_contact_address');
        await queryRunner.query('DROP TABLE recipient_contact_email');
        await queryRunner.query('DROP TABLE recipient_contact_phone');
        await queryRunner.query('DROP TABLE recipient_contact');
    }
}
