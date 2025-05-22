import { MigrationInterface, QueryRunner } from 'typeorm';

export class addTenantAccount1582044565370 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            'CREATE TABLE "tenant_account" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, "version" integer NOT NULL DEFAULT 1, "enabled" boolean NOT NULL DEFAULT true, "access_token" character varying NOT NULL, "account_id" character varying, "institution_id" character varying NOT NULL, "item_id" character varying NOT NULL, "tenant_id" uuid NOT NULL, "created_by_id" uuid, "updated_by_id" uuid, CONSTRAINT "PK_d2a3ef4033097b91c9097e8413a" PRIMARY KEY ("id"))',
            undefined
        );
        await queryRunner.query(
            'ALTER TABLE "tenant_account" ADD CONSTRAINT "FK_Tenant_TenantAccount" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
            undefined
        );
        await queryRunner.query(
            'ALTER TABLE "plaid_item" DROP CONSTRAINT "FK_ea8bc564fd689d39224ff8d7b26"',
            undefined
        );
        await queryRunner.query('ALTER TABLE "plaid_item" DROP COLUMN "tenant_id"', undefined);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            'ALTER TABLE "tenant_account" DROP CONSTRAINT "FK_Tenant_TenantAccount"',
            undefined
        );
        await queryRunner.query('DROP TABLE "tenant_account"', undefined);
        await queryRunner.query('ALTER TABLE "plaid_item" ADD "tenant_id" uuid', undefined);
        await queryRunner.query(
            'ALTER TABLE "plaid_item" ADD CONSTRAINT "FK_ea8bc564fd689d39224ff8d7b26" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
            undefined
        );
    }
}
