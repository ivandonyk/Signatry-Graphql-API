import { MigrationInterface, QueryRunner } from 'typeorm';

export class ADDInvitationTable1586977276533 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`
            CREATE TABLE "invitation" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(), 
            "role_id" uuid NOT NULL, 
            "code" uuid NOT NULL DEFAULT uuid_generate_v4(), 
            "created_by" uuid NOT NULL, 
            "updated_by" uuid NOT NULL, 
            "created_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, 
            "updated_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, 
            "enabled" boolean NOT NULL DEFAULT true, 
            CONSTRAINT "PK-invitation" PRIMARY KEY ("id"))
        `);
        await queryRunner.query(`
            ALTER TABLE "invitation" ADD CONSTRAINT "FK-roleIdInvitationTable" FOREIGN KEY ("role_id") REFERENCES "role"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`
            DROP TABLE "invitation" 
        `);
    }
}
