import {MigrationInterface, QueryRunner} from "typeorm";

export class ALTERWebhookEventAddSource1617223142018 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "webhook_event_source" AS ENUM ('STRIPE', 'IDONATE')`);
        await queryRunner.query(`ALTER TABLE "webhook_event" ADD COLUMN "source" webhook_event_source`);
        await queryRunner.query(`UPDATE "webhook_event" SET "source" = 'STRIPE'`);
        await queryRunner.query(`ALTER TABLE "webhook_event" ALTER COLUMN "source" SET NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "webhook_event" DROP COLUMN "source"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "webhook_event_source"`);
    }

}
