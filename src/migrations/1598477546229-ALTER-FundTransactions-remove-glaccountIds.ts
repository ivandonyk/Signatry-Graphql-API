import {MigrationInterface, QueryRunner} from "typeorm";

export class ALTERFundTransactionsRemoveGlaccountIds1598477546229 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "fund_transaction" DROP CONSTRAINT "FK_Credit_GLAccount_Id"`);
        await queryRunner.query(`ALTER TABLE "fund_transaction" DROP CONSTRAINT "FK_Debit_GLAccount_Id"`);
        await queryRunner.query(`ALTER TABLE "fund_transaction" DROP CONSTRAINT "FK_Entity_Id"`);
        await queryRunner.query(`ALTER TABLE "fund_transaction" DROP COLUMN "credit_gl_account_id"`);
        await queryRunner.query(`ALTER TABLE "fund_transaction" DROP COLUMN "debit_gl_account_id"`);
        await queryRunner.query(`ALTER TABLE "fund_transaction" DROP COLUMN "location_entity_id"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "fund_transaction" ADD COLUMN "credit_gl_account_id" uuid`);
        await queryRunner.query(`ALTER TABLE "fund_transaction" ADD COLUMN "debit_gl_account_id" uuid`);
        await queryRunner.query(`ALTER TABLE "fund_transaction" ADD COLUMN "ledger_id" character varying`);
        await queryRunner.query(
            `ALTER TABLE "fund_transaction" ADD CONSTRAINT "FK_Credit_GLAccount_Id" FOREIGN KEY ("credit_gl_account_id") REFERENCES "gl_account"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `ALTER TABLE "fund_transaction" ADD CONSTRAINT "FK_Debit_GLAccount_Id" FOREIGN KEY ("debit_gl_account_id") REFERENCES "gl_account"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `ALTER TABLE "fund_transaction" ADD CONSTRAINT "FK_Entity_Id" FOREIGN KEY ("location_entity_id") REFERENCES "location_entity"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
        );
    }

}
