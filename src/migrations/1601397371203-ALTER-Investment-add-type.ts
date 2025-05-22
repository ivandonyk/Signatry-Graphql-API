import {MigrationInterface, QueryRunner} from "typeorm";

export class ALTERInvestmentAddType1601397371203 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "investment_type" AS ENUM ('POOL', 'IMA')`);
        await queryRunner.query(`ALTER TABLE "investment" ADD COLUMN "investment_type" investment_type`);

    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "investment" DROP COLUMN "investment_type"`)
        await queryRunner.query(`DROP TYPE IF EXISTS "investment_type"`);
    }

}
