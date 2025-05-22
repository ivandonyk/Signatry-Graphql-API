import {MigrationInterface, QueryRunner} from "typeorm";

export class ALTERRecipientContactAddIsGrantContact1623444644047 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE recipient_contact ADD COLUMN is_grant_contact BOOLEAN NOT NULL DEFAULT false`);
        await queryRunner.query(`UPDATE recipient_contact SET is_grant_contact = true WHERE is_primary = true`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE recipient_contact DROP COLUMN is_grant_contact`);
    }

}
