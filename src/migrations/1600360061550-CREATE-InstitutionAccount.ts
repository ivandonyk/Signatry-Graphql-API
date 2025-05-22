import {MigrationInterface, QueryRunner} from "typeorm";

export class CREATEInstitutionAccount1600360061550 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
        CREATE TABLE "institution_account" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "account_id" character varying NOT NULL,
            "name" character varying NOT NULL,
            "account_number" character varying NOT NULL,
            "market_value" float NOT NULL,
            "last_updated" timestamp NOT NULL,
            "account_type" character varying NOT NULL,
            "financial_profile_id" character varying NOT NULL,
            "enabled" boolean NOT NULL DEFAULT true,
            "created_on" timestamp NOT NULL DEFAULT current_timestamp,
            "updated_on" timestamp NOT NULL DEFAULT current_timestamp,
            "version" integer NOT NULL DEFAULT 1,
            CONSTRAINT "PK_InstitutionAccountID" PRIMARY KEY ("id"),
            CONSTRAINT "UNQ_AccountID" UNIQUE ("account_id")
        )`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "institution_account"`);
    }
}
