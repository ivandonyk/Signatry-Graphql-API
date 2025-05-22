import {MigrationInterface, QueryRunner} from "typeorm";

export class CREATEInstitutionAccountTransaction1607967678913 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
        CREATE TABLE "institution_account_transaction" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "transaction_id" character varying NOT NULL UNIQUE,
            "institution_account_id" uuid NOT NULL,
            "holding_id" uuid,
            "transaction_type" character varying NOT NULL,
            "amount" float NOT NULL,
            "posted_on" timestamp,
            "units" float,
            "unit_price" float,
            "name" character varying,
            "fee_amount" float,
            "created_on" timestamp NOT NULL DEFAULT current_timestamp,
            "created_by" uuid NULL,
            "updated_on" timestamp NOT NULL DEFAULT current_timestamp,
            "updated_by" uuid NULL,
            "version" integer NOT NULL DEFAULT 1,
            "enabled" boolean NOT NULL DEFAULT true,
            CONSTRAINT "PK_InstitutionAccountTransactionId" PRIMARY KEY ("id"),
            CONSTRAINT "FK_HoldingId" FOREIGN KEY ("holding_id") REFERENCES "holding"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
            CONSTRAINT "FK_InstitutionAccountId" FOREIGN KEY ("institution_account_id") REFERENCES "institution_account"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        )`);

        await queryRunner.query(`ALTER TABLE "batch" ADD COLUMN "enabled" boolean NOT NULL DEFAULT true`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "institution_account_transaction"`);
        await queryRunner.query(`ALTER TABLE "batch" DROP COLUMN "enabled"`);
    }
}
