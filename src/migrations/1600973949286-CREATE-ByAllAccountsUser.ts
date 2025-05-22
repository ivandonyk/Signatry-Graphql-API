import {MigrationInterface, QueryRunner} from "typeorm";

export class CREATEByAllAccountsUser1600973949286 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
        CREATE TABLE "byallaccounts_user" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "user_id" character varying NOT NULL,
            "login_name" character varying NOT NULL,
            "login_pass" character varying NOT NULL,
            "first_name" character varying NOT NULL,
            "last_name" character varying NOT NULL,
            "email" character varying NOT NULL,
            "financial_profile_id" character varying,
            "tenant_id" uuid NOT NULL,
            CONSTRAINT "PK_ByAllAccountUserID" PRIMARY KEY ("id"),
            CONSTRAINT "FK_TenantId" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        )`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "byallaccounts_user"`);
    }
}
