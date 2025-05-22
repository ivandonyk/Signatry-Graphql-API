import { MigrationInterface, QueryRunner } from 'typeorm';

export class RoleTables1582836299183 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            `CREATE TABLE "role" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "name" character varying NOT NULL,
            "description" character varying NOT NULL,
            "enabled" BOOLEAN NOT NULL DEFAULT true,
            "created_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "created_by" uuid NULL,
            "updated_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updated_by" uuid NULL,
            "version" integer NOT NULL DEFAULT 1,
            CONSTRAINT "PK_RoleId" PRIMARY KEY ("id"))`
        );
        await queryRunner.query(`
            CREATE TABLE "user_profile_role" (
                "role_id" uuid NOT NULL,
                "user_profile_id" uuid NOT NULL
            )
        `);
        await queryRunner.query(`
            ALTER TABLE "user_profile_role"
            ADD CONSTRAINT "FK_Role_UserProfileRole"
            FOREIGN KEY ("role_id")
            REFERENCES "role"("id")
            ON DELETE NO ACTION
            ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "user_profile_role"
            ADD CONSTRAINT "FK_UserProfile_UserProfileRole"
            FOREIGN KEY ("user_profile_id")
            REFERENCES "user_profile"("id")
            ON DELETE NO ACTION
            ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query('DROP TABLE user_profile_role');
        await queryRunner.query('DROP TABLE role');
    }
}
