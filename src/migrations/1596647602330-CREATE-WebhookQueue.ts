import { MigrationInterface, QueryRunner } from 'typeorm';

export class CREATEWebhookQueue1596647602330 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        queryRunner.query(`
            CREATE TABLE "webhook_event" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "event_type" character varying NOT NULL,
                "event_created_at" TIMESTAMP NOT NULL,
                "event_data" json NOT NULL,
                "created_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updated_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "version" integer NOT NULL DEFAULT 1
            )
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        queryRunner.query(`DROP TABLE "webhook_event"`);
    }
}
