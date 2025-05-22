import {MigrationInterface, QueryRunner} from "typeorm";

export class ALTERInstitutionAccountTransactionAddManualProvider1623528597039 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE institution_account_transaction ADD COLUMN _provider character varying NOT NULL DEFAULT 'BAA'`);
        await queryRunner.query(`UPDATE institution_account_transaction SET _provider = provider::text`);
        await queryRunner.query(`ALTER TABLE institution_account_transaction DROP COLUMN provider`);
        await queryRunner.query(`ALTER TABLE institution_account_transaction RENAME COLUMN _provider TO provider`);

        await queryRunner.query(`ALTER TABLE holding ADD COLUMN _provider character varying NOT NULL DEFAULT 'BAA'`);
        await queryRunner.query(`UPDATE holding SET _provider = provider::text`);
        await queryRunner.query(`ALTER TABLE holding DROP COLUMN provider`);
        await queryRunner.query(`ALTER TABLE holding RENAME COLUMN _provider TO provider`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE institution_account_transaction ADD COLUMN _provider account_provider NOT NULL DEFAULT 'BAA'`);
        await queryRunner.query(`UPDATE institution_account_transaction SET _provider = provider::account_provider`);
        await queryRunner.query(`ALTER TABLE institution_account_transaction DROP COLUMN provider`);
        await queryRunner.query(`ALTER TABLE institution_account_transaction RENAME COLUMN _provider TO provider`);

        await queryRunner.query(`ALTER TABLE holding ADD COLUMN _provider account_provider NOT NULL DEFAULT 'BAA'`);
        await queryRunner.query(`UPDATE holding SET _provider = provider::account_provider`);
        await queryRunner.query(`ALTER TABLE holding DROP COLUMN provider`);
        await queryRunner.query(`ALTER TABLE holding RENAME COLUMN _provider TO provider`);
    }

}
