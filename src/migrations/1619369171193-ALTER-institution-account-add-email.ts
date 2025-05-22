import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERInstitutionAccountAddEmail1619369171193 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            'ALTER TABLE institution_account ADD COLUMN email character varying'
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE institution_account DROP COLUMN email');
    }
}
