import { MigrationInterface, QueryRunner } from 'typeorm';

export class CREATERolePermissionTable1587148633541 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            `CREATE TABLE "role_permission" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "role_id" uuid NOT NULL,
            "permission_id" uuid NOT NULL,
            "created_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "created_by" uuid NULL,
            "updated_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updated_by" uuid NULL,
            "version" integer NOT NULL DEFAULT 1,
            CONSTRAINT "PK_RolePermissionId" PRIMARY KEY ("id"))`
        );
        await queryRunner.query(
            'ALTER TABLE "role_permission" ADD CONSTRAINT "FK_Role_RolePermission" FOREIGN KEY ("role_id") REFERENCES "role"("id") ON DELETE NO ACTION ON UPDATE NO ACTION'
        );
        await queryRunner.query(
            'ALTER TABLE "role_permission" ADD CONSTRAINT "FK_Permission_RolePermission" FOREIGN KEY ("permission_id") REFERENCES "permission"("id") ON DELETE NO ACTION ON UPDATE NO ACTION'
        );
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            'ALTER TABLE "role_permission" DROP CONSTRAINT "FK_Role_RolePermission"'
        );
        await queryRunner.query(
            'ALTER TABLE "role_permission" DROP CONSTRAINT "FK_Permission_RolePermission"'
        );
        await queryRunner.query('DROP TABLE "role_permission"');
    }
}
