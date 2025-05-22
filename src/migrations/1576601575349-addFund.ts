import { MigrationInterface, QueryRunner } from 'typeorm';

export class addFund1576601575349 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            'CREATE TABLE "fund_type" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, "version" integer NOT NULL DEFAULT 1, "name" character varying NOT NULL, "description" character varying NOT NULL, "order_number" integer NOT NULL, "is_enabled" boolean NOT NULL, CONSTRAINT "PK_3a84c9726f1a8938cbdda9d1b9e" PRIMARY KEY ("id"))',
            undefined
        );
        await queryRunner.query(
            'CREATE TABLE "fund" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, "version" integer NOT NULL DEFAULT 1, "name" character varying NOT NULL, "description" character varying NOT NULL, "first_name" character varying NOT NULL, "last_name" character varying NOT NULL, "prefix" character varying NOT NULL, "date_of_birth" character varying NOT NULL, "address1" character varying NOT NULL, "address2" character varying NOT NULL, "city" character varying NOT NULL, "state" character varying NOT NULL, "zip" character varying NOT NULL, "email" character varying NOT NULL, "phone" character varying NOT NULL, "phone_ext" character varying NOT NULL, "statement_recipient" character varying NOT NULL, "statement_by_mail" boolean NOT NULL, "statement_by_paperless" boolean NOT NULL, "is_enabled" boolean NOT NULL, "type_id" uuid NOT NULL, "created_by_user_profile_id" uuid NOT NULL, CONSTRAINT "PK_b3ac6e413e6e449bb499db1ccbc" PRIMARY KEY ("id"))',
            undefined
        );
        await queryRunner.query(
            'CREATE TABLE "fund_user_profile" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, "version" integer NOT NULL DEFAULT 1, "user_id" uuid NOT NULL, "fund_id" uuid NOT NULL, CONSTRAINT "PK_e204aecfef450c61c0d20ea3f51" PRIMARY KEY ("id"))',
            undefined
        );
        await queryRunner.query(
            'ALTER TABLE "fund" ADD CONSTRAINT "FK_3a84c9726f1a8938cbdda9d1b9e" FOREIGN KEY ("type_id") REFERENCES "fund_type"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
            undefined
        );
        await queryRunner.query(
            'ALTER TABLE "fund" ADD CONSTRAINT "FK_ab943ddd332fbf20beeb320ae69" FOREIGN KEY ("created_by_user_profile_id") REFERENCES "user_profile"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
            undefined
        );
        await queryRunner.query(
            'ALTER TABLE "fund_user_profile" ADD CONSTRAINT "FK_0233a4d086224a671236c7de8af" FOREIGN KEY ("user_id") REFERENCES "user_profile"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
            undefined
        );
        await queryRunner.query(
            'ALTER TABLE "fund_user_profile" ADD CONSTRAINT "FK_7534dcab8e03647f33a3d79c8c8" FOREIGN KEY ("fund_id") REFERENCES "fund"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
            undefined
        );
        await queryRunner.query(
            "INSERT INTO \"fund_type\" (name,description,order_number,is_enabled) VALUES ('Donor Advised Fund','',0,true)"
        );
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            'ALTER TABLE "fund_user_profile" DROP CONSTRAINT "FK_7534dcab8e03647f33a3d79c8c8"',
            undefined
        );
        await queryRunner.query(
            'ALTER TABLE "fund_user_profile" DROP CONSTRAINT "FK_0233a4d086224a671236c7de8af"',
            undefined
        );
        await queryRunner.query(
            'ALTER TABLE "fund" DROP CONSTRAINT "FK_ab943ddd332fbf20beeb320ae69"',
            undefined
        );
        await queryRunner.query(
            'ALTER TABLE "fund" DROP CONSTRAINT "FK_3a84c9726f1a8938cbdda9d1b9e"',
            undefined
        );
        await queryRunner.query('DROP TABLE "fund_user_profile"', undefined);
        await queryRunner.query('DROP TABLE "fund"', undefined);
        await queryRunner.query('DROP TABLE "fund_type"', undefined);
    }
}
