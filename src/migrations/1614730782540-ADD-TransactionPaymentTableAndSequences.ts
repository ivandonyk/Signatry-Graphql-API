import { MigrationInterface, QueryRunner } from 'typeorm';

export class ADDTransactionPaymentTableAndSequences1614730782540 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('CREATE SEQUENCE achFileNumber');
        await queryRunner.query('CREATE SEQUENCE checkFileNumber');
        await queryRunner.query('CREATE SEQUENCE wireFileNumber');

        const [tenantSettings] = await queryRunner.query(
            'SELECT "app_setting" FROM "tenant" LIMIT 1;'
        );
        tenantSettings.app_setting.checkNumber = 1000;
        tenantSettings.app_setting.wireNumber = 1000;
        tenantSettings.app_setting.achNumber = 1000;

        await queryRunner.query(
            `UPDATE "tenant" SET "app_setting" = '${JSON.stringify(tenantSettings.app_setting)}';`
        );

        await queryRunner.query(/*sql */ `
        CREATE TABLE "transaction_payment" (
          "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
          "date" timestamp,
          "type" character varying,
          "count" integer,
          "amount" float,
          "source_account" character varying,
          "file_name" character varying,
          "complete" boolean,
          "created_on" timestamp NOT NULL DEFAULT current_timestamp,
          "created_by" uuid NULL,
          "updated_on" timestamp NOT NULL DEFAULT current_timestamp,
          "updated_by" uuid NULL,
          "version" integer NOT NULL DEFAULT 1,
          "enabled" boolean NOT NULL DEFAULT true,
          CONSTRAINT "PK_payment_files" PRIMARY KEY ("id"))
        `);

        await queryRunner.query(/*sql */ `
            UPDATE "recipient" SET "payment_type" = 'Check'
        `);

        await queryRunner.query(/*sql */ `
            ALTER TABLE fund_transaction ADD COLUMN IF NOT EXISTS "transaction_payment_id" character varying;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('DROP SEQUENCE achFileNumber');
        await queryRunner.query('DROP SEQUENCE checkFileNumber');
        await queryRunner.query('DROP SEQUENCE wireFileNumber');

        const [tenantSettings] = await queryRunner.query(
            'SELECT "app_setting" FROM "tenant" LIMIT 1;'
        );
        tenantSettings.app_setting.checkNumber = null;
        await queryRunner.query(
            `UPDATE "tenant" SET "app_setting" = '${JSON.stringify(tenantSettings.app_setting)}';`
        );

        await queryRunner.query(/*sql */ `
            DROP TABLE "transaction_payment" 
        `);
    }
}
