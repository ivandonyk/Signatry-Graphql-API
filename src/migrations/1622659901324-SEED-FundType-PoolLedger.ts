import {MigrationInterface, QueryRunner} from "typeorm";

export class SEEDFundTypePoolLedger1622659901324 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`UPDATE fund_type SET description = 'Donor advised fund' WHERE name = 'Donor Advised Fund'`);
        await queryRunner.query(`INSERT INTO fund_type (name, description, order_num) VALUES ('Pool Subledger', 'Sub-ledger fund for pool accounting', 1)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`UPDATE fund_type SET name = 'Donor Advised Fund', description = 'Donor advised fund' WHERE name = 'DONOR_ADVISED_FUND'`);
        await queryRunner.query(`DELETE FROM fund_type WHERE name = 'Pool Subledger'`);
    }

}
