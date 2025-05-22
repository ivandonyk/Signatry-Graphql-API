import { MigrationInterface, QueryRunner } from 'typeorm';

export class EmailQueue1637594559069 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE "email_queue" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "to" character varying NOT NULL,
                "from" character varying NOT NULL,
                "subject" character varying NULL,
                "body_text" character varying NULL,
                "body_html" character varying NULL,
                "team_notified_on" TIMESTAMP NULL,
                "sent_on" TIMESTAMP NULL,
                "created_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updated_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT "PK_3a84c9726f1a8938cbdda9d1b9f" PRIMARY KEY ("id"))
            `,
            undefined
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('DROP TABLE "email_queue"', undefined);
    }
}
