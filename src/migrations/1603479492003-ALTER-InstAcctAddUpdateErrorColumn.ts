import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERInstAcctAddUpdateErrorColumn1603479492003 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            'ALTER TABLE "institution_account" ADD COLUMN "update_error" BOOLEAN NOT NULL DEFAULT false;'
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE "institution_account" DROP COLUMN "update_error";');
    }
}
