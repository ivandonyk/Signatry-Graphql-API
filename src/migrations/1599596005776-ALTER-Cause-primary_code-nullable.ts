import {MigrationInterface, QueryRunner} from "typeorm";

export class ALTERCausePrimaryCodeNullable1599596005776 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        queryRunner.query(`ALTER TABLE "cause" ALTER COLUMN "primary_code" DROP NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        queryRunner.query(`ALTER TABLE "cause" ALTER COLUMN "primary_code" SET NOT NULL`);
    }
}
