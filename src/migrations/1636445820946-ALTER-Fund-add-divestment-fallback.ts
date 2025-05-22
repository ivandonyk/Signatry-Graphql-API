import {MigrationInterface, QueryRunner} from "typeorm";

export class ALTERFundAddDivestmentFallback1636445820946 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE fund ADD COLUMN divestment_fallback boolean NOT NULL DEFAULT true;');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE fund DROP COLUMN divestment_fallback;');
    }

}
