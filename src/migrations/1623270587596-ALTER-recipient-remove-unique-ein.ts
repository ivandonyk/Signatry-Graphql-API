import {MigrationInterface, QueryRunner} from "typeorm";

export class ALTERRecipientRemoveUniqueEin1623270587596 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE recipient DROP CONSTRAINT "UQ_EIN"');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE recipient ADD CONSTRAINT "UQ_EIN" UNIQUE(ein)');
    }

}
