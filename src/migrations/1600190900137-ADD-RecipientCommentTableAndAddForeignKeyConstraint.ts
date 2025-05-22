import { MigrationInterface, QueryRunner } from 'typeorm';

export class ADDRecipientCommentTableAndAddForeignKeyConstraint1600190900137
    implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/*sql*/ `
            CREATE TABLE IF NOT EXISTS "recipient_comment" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "created_by" uuid NOT NULL, 
                "updated_by" uuid NOT NULL, 
                "created_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, 
                "updated_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, 
                "version" integer NOT NULL DEFAULT 1,
                "comment" character varying NOT NULL, 
                "recipient_id" uuid NOT NULL,
                CONSTRAINT "PK_RecipientComment" PRIMARY KEY ("id")
            )
            
        `);
        await queryRunner.query(/*sql*/ `
            ALTER TABLE "recipient_comment" ADD CONSTRAINT "FK_RecipientCommentId" FOREIGN KEY ("recipient_id") REFERENCES "recipient"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/*sql*/ `
        ALTER TABLE "recipient_comment" DROP CONSTRAINT "FK_RecipientCommentId"
    `);
        await queryRunner.query(/*sql*/ `
       DROP TABLE IF EXISTS "recipient_comment"
   `);
    }
}
