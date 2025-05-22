import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERInstitutionAccountAddDisplayName1602088247364 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            'ALTER TABLE "institution_account" ADD COLUMN "display_name" character varying NULL;'
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE "institution_account" DROP COLUMN "display_name";');
    }
}
