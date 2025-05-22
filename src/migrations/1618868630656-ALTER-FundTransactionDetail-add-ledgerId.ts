import {MigrationInterface, QueryRunner} from "typeorm";

export class ALTERFundTransactionDetailAddLedgerId1618868630656 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE fund_transaction_detail ADD COLUMN ledger_id character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE fund_transaction_detail DROP COLUMN ledger_id`);
    }

}
