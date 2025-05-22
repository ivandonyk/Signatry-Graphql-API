import { MigrationInterface, QueryRunner } from 'typeorm';

export class ADDFinancialAdvisorTable1601324173429 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/*sql*/ `
         CREATE TABLE IF NOT EXISTS "financial_advisor" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "created_by" uuid NOT NULL,
            "updated_by" uuid NOT NULL,
            "created_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updated_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "version" integer NOT NULL DEFAULT 1,
            "full_name" character varying,
            "addressLineOne" character varying,
            "addressLineTwo" character varying,
            "city" character varying,
            "state" character varying,
            "postal_code" character varying,
            "office_name" character varying,
            "insitution_name" character varying,
            "email" character varying,
            "phone_number" character varying,
            CONSTRAINT "PK_FinancialAdvisorKey" PRIMARY KEY ("id")
        )
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/*sql*/ `
            DROP TABLE IF EXISTS "financial_advisor" 
        `);
    }
}
