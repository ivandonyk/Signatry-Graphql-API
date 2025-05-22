import { MigrationInterface, QueryRunner } from 'typeorm';

export class addFundInvestmentPoolAllocation1576907789682 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            'CREATE TABLE "fund_investment_pool_allocation" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, "version" integer NOT NULL DEFAULT 1, "percentage" double precision NOT NULL, "fund_id" uuid NOT NULL, "investment_pool_id" uuid NOT NULL, CONSTRAINT "PK_c2d600a9b8b381e968291866327" PRIMARY KEY ("id"))',
            undefined
        );
        await queryRunner.query(
            'ALTER TABLE "fund_investment_pool_allocation" ADD CONSTRAINT "FK_5d60731984ce70c3dee12aaa517" FOREIGN KEY ("fund_id") REFERENCES "fund"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
            undefined
        );
        await queryRunner.query(
            'ALTER TABLE "fund_investment_pool_allocation" ADD CONSTRAINT "FK_d1d6709b47b26f4f0260a6557a0" FOREIGN KEY ("investment_pool_id") REFERENCES "investment_pool"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
            undefined
        );
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            'ALTER TABLE "fund_investment_pool_allocation" DROP CONSTRAINT "FK_d1d6709b47b26f4f0260a6557a0"',
            undefined
        );
        await queryRunner.query(
            'ALTER TABLE "fund_investment_pool_allocation" DROP CONSTRAINT "FK_5d60731984ce70c3dee12aaa517"',
            undefined
        );
        await queryRunner.query('DROP TABLE "fund_investment_pool_allocation"', undefined);
    }
}
