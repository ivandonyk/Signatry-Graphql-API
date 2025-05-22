import { MigrationInterface, QueryRunner } from 'typeorm';

export class CREATEGLAccountReconcile1607970455394 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
        CREATE TABLE "gl_account_reconcile" (
          "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
          "gl_account_id" uuid NOT NULL,
          "date_reconciled" timestamp,
          "date_previous_reconciled" timestamp,
          "balance_open" float NOT NULL,
          "balance_close" float,
          "reconciled_by" uuid NULL,
          "created_on" timestamp NOT NULL DEFAULT current_timestamp,
          "created_by" uuid NULL,
          "updated_on" timestamp NOT NULL DEFAULT current_timestamp,
          "updated_by" uuid NULL,
          CONSTRAINT "PK_GlAccountReconcileId" PRIMARY KEY ("id"),
          CONSTRAINT "FK_GlAccountId" FOREIGN KEY ("gl_account_id") REFERENCES "gl_account"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
      )`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS "gl_account_reconcile"`);
    }
}
