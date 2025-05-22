import {MigrationInterface, QueryRunner} from "typeorm";

export class ALTERRecipientAddAccountingVendorId1620846017630 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE recipient ADD COLUMN accounting_vendor_id character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE recipient DROP COLUMN accounting_vendor_id`);
    }

}
