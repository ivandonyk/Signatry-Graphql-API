import {MigrationInterface, QueryRunner} from "typeorm";

export class SEEDRecipientStatusAddDenied1598910424175 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `INSERT INTO "recipient_status" ("name") VALUES ('DENIED')`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `DELETE FROM "recipient_status" WHERE "name" = 'DENIED'`
        ); 
    }

}
