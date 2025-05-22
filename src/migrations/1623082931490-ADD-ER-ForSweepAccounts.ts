import { MigrationInterface, QueryRunner } from 'typeorm';

export class ADDERForSweepAccounts1623082931490 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/* sql */ `
            ALTER TABLE "institution_account" ADD COLUMN "institution_account_id" uuid;
        `);

        await queryRunner.query(/* sql */ `
            ALTER TABLE "institution_account" ADD COLUMN "is_sweep_account" boolean DEFAULT false;
        `);

        await queryRunner.query(/* sql */ `
            ALTER TABLE "institution_account" ADD CONSTRAINT "FK_IA_ID" FOREIGN KEY ("institution_account_id") REFERENCES "institution_account"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/* sql */ `
            ALTER TABLE "institution_account" DROP CONSTRAINT "FK_IA_ID";
        `);

        await queryRunner.query(/* sql */ `
            ALTER TABLE "institution_account" DROP COLUMN "institution_account_id";
        `);

        await queryRunner.query(/* sql */ `
            ALTER TABLE "institution_account" DROP COLUMN "is_sweep_account";
        `);
    }
}
