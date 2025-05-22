import {MigrationInterface, QueryRunner} from "typeorm";

export class ALTERHoldingTablesPayableReceivableColumns1632170887366 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE "pool_investment_holding" ADD COLUMN "payable" double precision');
        await queryRunner.query('ALTER TABLE "pool_investment_holding" ADD COLUMN "receivable" double precision');
        await queryRunner.query('ALTER TABLE "holding" ADD COLUMN "payable" double precision');
        await queryRunner.query('ALTER TABLE "holding" ADD COLUMN "receivable" double precision');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER "pool_investment_holding" DROP COLUMN "payable"');
        await queryRunner.query('ALTER "pool_investment_holding" DROP COLUMN "receivable"');
        await queryRunner.query('ALTER "holding" DROP COLUMN "payable"');
        await queryRunner.query('ALTER "holding" DROP COLUMN "receivable"');
    }

}
