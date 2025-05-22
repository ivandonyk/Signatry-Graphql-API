import { MigrationInterface, QueryRunner } from 'typeorm';

export class addGrantRecommendation1578643991257 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            'CREATE TABLE "grant_recipient" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, "version" integer NOT NULL DEFAULT 1, "name" character varying NOT NULL, "employer_identification_number" character varying, "contact_name" character varying, "contact_phone_number" character varying, "address" character varying, "city" character varying NOT NULL, "state" character varying NOT NULL, "postal_code" character varying, CONSTRAINT "PK_2d77d4ea31e25fed686f16c05f3" PRIMARY KEY ("id"))',
            undefined
        );
        await queryRunner.query(
            'CREATE TABLE "grant_recommendation" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, "version" integer NOT NULL DEFAULT 1, "fund_id" uuid NOT NULL, "grant_recipient_id" uuid NOT NULL, "amount" double precision NOT NULL, "is_for_specific_need" boolean NOT NULL, "specific_need_description" character varying, "personal_note" character varying, "created_by_user_profile_id" uuid NOT NULL, CONSTRAINT "PK_e605ed9edb8f93321ddd72a3fc3" PRIMARY KEY ("id"))',
            undefined
        );
        await queryRunner.query(
            'ALTER TABLE "grant_recommendation" ADD CONSTRAINT "FK_3dd591653dd0421cb90992de0b7" FOREIGN KEY ("fund_id") REFERENCES "fund"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
            undefined
        );
        await queryRunner.query(
            'ALTER TABLE "grant_recommendation" ADD CONSTRAINT "FK_fbedd54d55ad219ea9603ee3b85" FOREIGN KEY ("grant_recipient_id") REFERENCES "grant_recipient"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
            undefined
        );
        await queryRunner.query(
            'ALTER TABLE "grant_recommendation" ADD CONSTRAINT "FK_59cb82df79b6cb012d434a3b0cc" FOREIGN KEY ("created_by_user_profile_id") REFERENCES "user_profile"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
            undefined
        );
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            'ALTER TABLE "grant_recommendation" DROP CONSTRAINT "FK_59cb82df79b6cb012d434a3b0cc"',
            undefined
        );
        await queryRunner.query(
            'ALTER TABLE "grant_recommendation" DROP CONSTRAINT "FK_fbedd54d55ad219ea9603ee3b85"',
            undefined
        );
        await queryRunner.query(
            'ALTER TABLE "grant_recommendation" DROP CONSTRAINT "FK_3dd591653dd0421cb90992de0b7"',
            undefined
        );
        await queryRunner.query('DROP TABLE "grant_recommendation"', undefined);
        await queryRunner.query('DROP TABLE "grant_recipient"', undefined);
    }
}
