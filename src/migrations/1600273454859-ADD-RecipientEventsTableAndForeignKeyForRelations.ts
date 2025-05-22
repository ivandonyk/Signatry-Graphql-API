import { MigrationInterface, QueryRunner } from 'typeorm';

export class ADDRecipientEventsTableAndForeignKeyForRelations1600273454859
    implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/*sql*/ `
            CREATE TABLE IF NOT EXISTS "recipient_event" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "created_by" uuid NOT NULL,
                "updated_by" uuid NOT NULL,
                "created_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updated_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "version" integer NOT NULL DEFAULT 1,
                "recipient_id" uuid NOT NULL,
                "user_profile_id" uuid NOT NULL,
                CONSTRAINT "PK_RecipientEventId" PRIMARY KEY ("id")
            )
        `);

        await queryRunner.query(/*sql*/ `
            ALTER TABLE "recipient_event" ADD CONSTRAINT "FK_Recipient_RecipientEvent" FOREIGN KEY ("recipient_id") REFERENCES "recipient"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);

        await queryRunner.query(/*sql*/ `
            ALTER TABLE "recipient_event" ADD CONSTRAINT "FK_UserProfile_RecipientEvent" FOREIGN KEY ("user_profile_id") REFERENCES "user_profile"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);

        await queryRunner.query(/*sql*/ `
            CREATE TYPE recipient_event_name AS ENUM ('EDITED', 'APPROVED', 'DENIED')
        `);

        await queryRunner.query(/*sql*/ `
            ALTER TABLE "recipient_event" ADD COLUMN name recipient_event_name
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/*sql*/ `
            ALTER TABLE "recipient_event" DROP CONSTRAINT "FK_Recipient_RecipientEvent"
        `);

        await queryRunner.query(/*sql*/ `
            ALTER TABLE "recipient_event" DROP CONSTRAINT "FK_UserProfile_RecipientEvent"
        `);

        await queryRunner.query(/*sql*/ `
            ALTER TABLE "recipient_event" DROP COLUMN "name"
        `);

        await queryRunner.query(/*sql*/ `
            DROP TYPE IF EXISTS recipient_event_name
        `);

        await queryRunner.query(/*sql*/ `
            DROP TABLE "recipient_event"
        `);
    }
}
