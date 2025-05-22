import {MigrationInterface, QueryRunner} from "typeorm";

export class CREATETransactionDetailType1603471107070 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
        CREATE TYPE "transaction_detail_type_name" AS ENUM (
            'CONTRIBUTION_CASH',
            'GRANT_CASH',
            'FEE',
            'INVESTMENT',
            'DIVESTMENT'
            )`);

        await queryRunner.query(`
        CREATE TABLE "transaction_detail_type" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "name" transaction_detail_type_name NOT NULL,
            "description" character varying NOT NULL,
            "enabled" boolean NOT NULL DEFAULT true,
            "created_on" timestamp NOT NULL DEFAULT current_timestamp,
            "created_by" uuid NULL,
            "updated_on" timestamp NOT NULL DEFAULT current_timestamp,
            "updated_by" uuid NULL,
            "version" integer NOT NULL DEFAULT 1,
            CONSTRAINT "PK_TransactionDetailTypeId" PRIMARY KEY ("id")
        )`);

        await queryRunner.query(`
        INSERT INTO "transaction_detail_type" ("name", "description") VALUES
        ('CONTRIBUTION_CASH', 'The cash value of a contribution after fees.'),
        ('GRANT_CASH', 'The cash value of a grant.'),
        ('FEE', 'Service fee.'),
        ('INVESTMENT', 'Funds moved into an investment account for a contribution.'),
        ('DIVESTMENT', 'Funds moved out of an investment account for a grant')
        `);

        await queryRunner.query(`ALTER TABLE "fund_transaction_detail" ADD COLUMN "transaction_detail_type_id" uuid`);
        await queryRunner.query(`ALTER TABLE "fund_transaction_detail" ADD CONSTRAINT "FK_TransactionDetailTypeId" FOREIGN KEY ("transaction_detail_type_id") REFERENCES "transaction_detail_type"("id")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "transaction_detail_type"`);
        await queryRunner.query(`DROP TYPE "transaction_detail_type_name"`);
    }
}
