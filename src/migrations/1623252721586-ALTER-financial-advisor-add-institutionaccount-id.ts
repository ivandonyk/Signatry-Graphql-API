import {MigrationInterface, QueryRunner} from "typeorm";

export class ALTERFinancialAdvisorAddInstitutionaccountId1623252721586 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE institution_account_financial_advisor (
            "institution_account_id" uuid NOT NULL,
            "financial_advisor_id" uuid NOT NULL,
            CONSTRAINT "FK_InstitutionAccountId" FOREIGN KEY ("institution_account_id") REFERENCES "institution_account"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
            CONSTRAINT "FK_FinancialAdvisorId" FOREIGN KEY ("financial_advisor_id") REFERENCES "financial_advisor"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        )`);
        await queryRunner.query(`ALTER TABLE institution_account ADD COLUMN routing_number character varying`);
        await queryRunner.query(`INSERT INTO gl_account_type (name, label, description) VALUES ('SWEEP', 'Sweep account', 'Sweep account')`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE financial_advisor DROP CONSTRAINT FK_InstitutionAccountId`);
        await queryRunner.query(`ALTER TABLE financial_advisor DROP COLUMN institution_account_id`);
        await queryRunner.query(`ALTER TABLE institution_account DROP COLUMN routing_number`);
        await queryRunner.query(`DROP TABLE institution_account_financial_advisor`);
    }

}
