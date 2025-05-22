import { MigrationInterface, QueryRunner } from 'typeorm';

export class CREATERecipientFinancialsTable1598050360567 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE "recipient_financials" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "recipient_id" uuid NOT null,
            "most_recent_financials_year" INTEGER NULL,
            "total_revenue" FLOAT NULL,
            "total_assets" FLOAT NULL,
            "total_expenses" FLOAT NULL,
            "irs_filings_link" character varying NULL,
            "full_financial_report_link" character varying NULL,
            "enabled" BOOLEAN NOT NULL DEFAULT true,
            "created_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "created_by" uuid NULL,
            "updated_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updated_by" uuid NULL,
            "version" integer NOT NULL DEFAULT 1,
            CONSTRAINT "PK_RecipentFinancialsId" PRIMARY KEY ("id"))`
        );
        await queryRunner.query(
            'ALTER TABLE "recipient_financials" ADD CONSTRAINT "FK_Recipient_RecipientFinancials" FOREIGN KEY ("recipient_id") REFERENCES "recipient"("id") ON DELETE NO ACTION ON UPDATE NO ACTION'
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('DROP TABLE recipient_financials');
    }
}
