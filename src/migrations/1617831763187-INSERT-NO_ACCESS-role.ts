import {MigrationInterface, QueryRunner} from "typeorm";

export class INSERTNOACCESSRole1617831763187 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`INSERT INTO "fund_role" ("name") VALUES ('No Access')`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DELETE FROM "fund_role" WHERE "name" = 'No Access'`);
    }

}
