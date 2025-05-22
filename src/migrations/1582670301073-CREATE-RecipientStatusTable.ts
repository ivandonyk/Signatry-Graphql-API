import { MigrationInterface, QueryRunner } from 'typeorm';

export class CREATERecipientStatusTable1582670301073 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            `CREATE TABLE "recipient_status" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "name" character varying NULL,
            "description" character varying NULL,
            "enabled" BOOLEAN NOT NULL DEFAULT true,
            "updated_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updated_by" uuid NULL,
            "created_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "created_by" uuid NULL,
            "version" integer NOT NULL DEFAULT 1,
            CONSTRAINT "PK_RecipientStatusId" PRIMARY KEY ("id"))`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query('DROP TABLE recipient_status');
    }
}
