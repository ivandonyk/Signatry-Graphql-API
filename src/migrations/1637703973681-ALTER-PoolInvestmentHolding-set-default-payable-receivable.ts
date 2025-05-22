import {MigrationInterface, QueryRunner} from "typeorm";

export class ALTERPoolInvestmentHoldingSetDefaultPayableReceivable1637703973681 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`UPDATE pool_investment_holding SET payable = 0 WHERE payable IS NULL`);
        await queryRunner.query(`UPDATE pool_investment_holding SET receivable = 0 WHERE receivable IS NULL`);
        await queryRunner.query(`ALTER TABLE pool_investment_holding ALTER COLUMN payable SET DEFAULT 0`);
        await queryRunner.query(`ALTER TABLE pool_investment_holding ALTER COLUMN receivable SET DEFAULT 0`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }

}
