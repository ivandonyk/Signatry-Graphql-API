import { MigrationInterface, QueryRunner } from 'typeorm';

export class CREATERecipientNoteTable1582682696738 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            `CREATE TABLE "recipient_note" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "recipient_id" uuid NOT NULL,
            "note" character varying NOT NULL,
            "note_date_time" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "enabled" BOOLEAN NOT NULL DEFAULT true,
            "created_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "created_by" uuid NULL,
            "updated_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updated_by" uuid NULL,
            "version" integer NOT NULL DEFAULT 1,
            CONSTRAINT "PK_RecipientNoteId" PRIMARY KEY ("id"))`
        );
        await queryRunner.query(
            'ALTER TABLE "recipient_note" ADD CONSTRAINT "FK_Recipient_RecipientNote" FOREIGN KEY ("recipient_id") REFERENCES "recipient"("id") ON DELETE NO ACTION ON UPDATE NO ACTION'
        );
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query('DROP TABLE recipient_note');
    }
}
