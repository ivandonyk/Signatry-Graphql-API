import { MigrationInterface, QueryRunner } from 'typeorm';

export class dropOldFundAndGrantTables1584117584020 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            'DROP TABLE "fund_contribution_investment_pool_allocation"',
            undefined
        );
        await queryRunner.query('DROP TABLE "fund_contribution"', undefined);
        await queryRunner.query('DROP TABLE "grant_recommendation"', undefined);
        await queryRunner.query('DROP TABLE "grant_recipient"', undefined);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            'CREATE TABLE "grant_recommendation" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, "version" integer NOT NULL DEFAULT 1, "fund_id" uuid NOT NULL, "grant_recipient_id" uuid NOT NULL, "amount" double precision NOT NULL, "is_for_specific_need" boolean NOT NULL, "specific_need_description" character varying, "personal_note" character varying, "created_by_user_profile_id" uuid NOT NULL, CONSTRAINT "PK_e605ed9edb8f93321ddd72a3fc3" PRIMARY KEY ("id"))',
            undefined
        );

        await queryRunner.query(
            'CREATE TABLE "grant_recipient" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, "version" integer NOT NULL DEFAULT 1, "name" character varying NOT NULL, "employer_identification_number" character varying, "contact_name" character varying, "contact_phone_number" character varying, "address" character varying, "city" character varying NOT NULL, "state" character varying NOT NULL, "postal_code" character varying, CONSTRAINT "PK_2d77d4ea31e25fed686f16c05f3" PRIMARY KEY ("id"))',
            undefined
        );
        await queryRunner.query(
            'CREATE TABLE "fund_contribution" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, "version" integer NOT NULL DEFAULT 1, "amount" double precision NOT NULL, "created_by_user_profile_id" uuid NOT NULL, "fund_id" uuid NOT NULL, "stripe_charge_id" character varying NULL, "user_profile_account_id" uuid NOT NULL, CONSTRAINT "PK_bb24d268b329d2dd8cd8a2d2a7a" PRIMARY KEY ("id"))',
            undefined
        );
        await queryRunner.query(
            'CREATE TABLE "fund_contribution_investment_pool_allocation" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, "version" integer NOT NULL DEFAULT 1, "amount" double precision NOT NULL, "contribution_id" uuid NOT NULL, "investment_pool_id" uuid NOT NULL, CONSTRAINT "PK_d786e949e4cbad5d3e6a543a5a1" PRIMARY KEY ("id"))',
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

        await queryRunner.query(
            'ALTER TABLE "fund_contribution" ADD CONSTRAINT "FK_0fc03184184508bbc3e55252989" FOREIGN KEY ("user_profile_account_id") REFERENCES "user_profile_account"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
            undefined
        );
        await queryRunner.query(
            'ALTER TABLE "fund_contribution" ADD CONSTRAINT "FK_ec50c2d1adb2aeed7df4fe716d2" FOREIGN KEY ("fund_id") REFERENCES "fund"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
            undefined
        );
        await queryRunner.query(
            'ALTER TABLE "fund_contribution_investment_pool_allocation" ADD CONSTRAINT "FK_62105e2e099e5ea56b9e588634d" FOREIGN KEY ("contribution_id") REFERENCES "fund_contribution"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
            undefined
        );
        await queryRunner.query(
            'ALTER TABLE "fund_contribution_investment_pool_allocation" ADD CONSTRAINT "FK_ed63b4dbe8004c9b518d3cdd72b" FOREIGN KEY ("investment_pool_id") REFERENCES "investment"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
            undefined
        );
    }
}
