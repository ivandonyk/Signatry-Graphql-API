import { MigrationInterface, QueryRunner } from 'typeorm';

export class CREATERecipient1582670302386 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            `CREATE TABLE "recipient" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "name" character varying NOT NULL,
            "description" character varying NULL,
            "ein" character varying NOT NULL,
            "recipient_status_id" uuid NOT NULL,
            "enabled" BOOLEAN NOT NULL DEFAULT true,
            "updated_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updated_by" uuid NULL,
            "created_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "created_by" uuid NULL,
            "version" integer NOT NULL DEFAULT 1,
            CONSTRAINT "PK_RecipientId" PRIMARY KEY ("id"))`
        );

        await queryRunner.query(
            'ALTER TABLE "recipient" ADD CONSTRAINT "FK_RecipientStatus_Recipient" FOREIGN KEY ("recipient_status_id") REFERENCES "recipient_status"("id") ON DELETE NO ACTION ON UPDATE NO ACTION'
        );
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query('DROP TABLE "recipient"');
    }
}
