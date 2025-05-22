import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERInvestmentsAddGLAccountId1596824567462 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        queryRunner.query(`ALTER TABLE "investment" ADD COLUMN "gl_account_id" uuid`);
        queryRunner.query(
            `ALTER TABLE "investment" ADD CONSTRAINT "FK_GLAccountId" FOREIGN KEY ("gl_account_id") REFERENCES "gl_account"("id")`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        queryRunner.query(`ALTER TABLE "investment" DROP CONTSTRAINT "FK_GLAccountId"`);
        queryRunner.query(`ALTER TABLE "investment" DROP COLUMN "gl_account_id"`);
    }
}
