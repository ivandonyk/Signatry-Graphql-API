import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERUpdateBatchComments1611355131038 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/* sql */ `
            ALTER TABLE "batch" DROP COLUMN "comments";
        `);

        await queryRunner.query(/* sql */ `
            CREATE TABLE "batch_comment" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(), 
                "created_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, 
                "updated_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, 
                "created_by" uuid NULL, 
                "updated_by" uuid NULL,
                "batch_id" uuid NOT NULL,
                "version" integer NOT NULL DEFAULT 1,
                "enabled" boolean NOT NULL DEFAULT true,
                "comment_text" text NOT NULL,
                CONSTRAINT "PK_BatchCommentId" PRIMARY KEY ("id")
            );
        `);

        await queryRunner.query(/* sql */ `
            ALTER TABLE "batch_comment" ADD CONSTRAINT "FK_Batch_ID" FOREIGN KEY ("batch_id") REFERENCES "batch"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/* sql */ `
            ALTER TABLE "batch_comment" DROP CONSTRAINT "FK_Batch_ID";
        `);

        await queryRunner.query(/* sql */ `
            DROP TABLE "batch_comment"
        `);

        await queryRunner.query(/* sql */ `
            ALTER TABLE "batch" ADD COLUMN "comments" json;
        `);
    }
}
