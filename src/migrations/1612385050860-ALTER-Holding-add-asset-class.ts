import {MigrationInterface, QueryRunner} from "typeorm";

export class ALTERHoldingAddAssetClass1612385050860 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "security" DROP COLUMN "asset_class"`);
        await queryRunner.query(`ALTER TABLE "security" DROP COLUMN "asset_subclass"`);
        await queryRunner.query(`ALTER TABLE "holding" ADD COLUMN "asset_class" character varying`);
        await queryRunner.query(`ALTER TABLE "holding" ADD COLUMN "asset_subclass" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "holding" DROP COLUMN "asset_class"`);
        await queryRunner.query(`ALTER TABLE "holding" DROP COLUMN "asset_subclass"`);
        await queryRunner.query(`ALTER TABLE "security" ADD COLUMN "asset_class" character varying`);
        await queryRunner.query(`ALTER TABLE "security" ADD COLUMN "asset_subclass" character varying`);
    }

}
