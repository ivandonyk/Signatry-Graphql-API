import {MigrationInterface, QueryRunner} from "typeorm";

export class ALTERInvestmentAddFundId1622666774538 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE investment ADD COLUMN subledger_fund_id uuid`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE investment DROP COLUMN subledger_fund_id`);
    }

}
