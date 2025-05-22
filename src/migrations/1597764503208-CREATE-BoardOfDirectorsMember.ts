import { MigrationInterface, QueryRunner } from 'typeorm';

export class CREATEBoardOfDirectorsMember1597764503208 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE "recipient_board_of_directors_member" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "recipient_id" uuid NOT null,
            "name" character varying NULL,
            "title" character varying NULL,
            "company" character varying NULL,
            "is_primary" BOOLEAN NOT NULL DEFAULT false,
            "enabled" BOOLEAN NOT NULL DEFAULT true,
            "created_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "created_by" uuid NULL,
            "updated_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updated_by" uuid NULL,
            "version" integer NOT NULL DEFAULT 1,
            CONSTRAINT "PK_RecipientBoardOfDirectorsId" PRIMARY KEY ("id"))`
        );
        await queryRunner.query(
            'ALTER TABLE "recipient_board_of_directors_member" ADD CONSTRAINT "FK_Recipient_RecipientBoardOfDirectorsMember" FOREIGN KEY ("recipient_id") REFERENCES "recipient"("id") ON DELETE NO ACTION ON UPDATE NO ACTION'
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('DROP TABLE recipient_board_of_directors_member');
    }
}
