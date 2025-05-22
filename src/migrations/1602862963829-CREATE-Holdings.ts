import {MigrationInterface, QueryRunner} from "typeorm";

export class CREATEHoldings1602862963829 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "security" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "security_id" character varying NOT NULL,
            "name" character varying NOT NULL,
            "ticker_symbol" character varying,
            "cusip" character varying,
            "asset_class" character varying NOT NULL DEFAULT 'OTHER',
            "asset_subclass" character varying,
            "security_type" character varying NOT NULL, 
            "enabled" boolean NOT NULL DEFAULT true,
            "created_on" timestamp NOT NULL DEFAULT current_timestamp,
            "created_by" uuid NULL,
            "updated_on" timestamp NOT NULL DEFAULT current_timestamp,
            "updated_by" uuid NULL,
            "version" integer NOT NULL DEFAULT 1,
            CONSTRAINT "PK_SecurityId" PRIMARY KEY ("id"),
            CONSTRAINT "UNQ_BAASecurityId" UNIQUE ("security_id")
            )`);
        await queryRunner.query(`
            CREATE TABLE "holding" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "holding_id" character varying NOT NULL,
            "name" character varying NOT NULL,
            "date" timestamp NOT NULL,
            "units" float NOT NULL,
            "market_value" float NOT NULL,
            "unit_price" float NOT NULL,
            "security_id" uuid,
            "institution_account_id" uuid,
            "enabled" boolean NOT NULL DEFAULT true,
            "created_on" timestamp NOT NULL DEFAULT current_timestamp,
            "created_by" uuid NULL,
            "updated_on" timestamp NOT NULL DEFAULT current_timestamp,
            "updated_by" uuid NULL,
            "version" integer NOT NULL DEFAULT 1,
            CONSTRAINT "PK_HoldingId" PRIMARY KEY ("id"),
            CONSTRAINT "FK_SecurityId" FOREIGN KEY ("security_id") REFERENCES "security"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
            CONSTRAINT "FK_InstitutionAccountId" FOREIGN KEY ("institution_account_id") REFERENCES "institution_account"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
            )`);
        await queryRunner.query(`
            CREATE TABLE "pool_investment_holding" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "units" float NOT NULL,
            "date" timestamp NOT NULL,
            "unit_price" float NOT NULL,
            "market_value" float NOT NULL,
            "fund_investment_id" uuid,
            "enabled" boolean NOT NULL DEFAULT true,
            "created_on" timestamp NOT NULL DEFAULT current_timestamp,
            "created_by" uuid NULL,
            "updated_on" timestamp NOT NULL DEFAULT current_timestamp,
            "updated_by" uuid NULL,
            "version" integer NOT NULL DEFAULT 1,
            CONSTRAINT "PK_PoolInvestmentHoldingId" PRIMARY KEY ("id"),
            CONSTRAINT "FK_FundInvestmentId" FOREIGN KEY ("fund_investment_id") REFERENCES "fund_investment"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
            )`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "pool_investment_holding"`);
        await queryRunner.query(`DROP TABLE "holding"`);
        await queryRunner.query(`DROP TABLE "security"`);
    }

}
