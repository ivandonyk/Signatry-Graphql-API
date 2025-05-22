import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDbTransactionLogTable1639597332757 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            `CREATE TABLE "db_transaction_log" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "created_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "created_by" character varying NULL,
            "db_transaction_id" uuid NOT NULL,
            "descriptor" character varying NULL,
            "state" character varying NOT NULL,
            "first_error" character varying NULL,
            CONSTRAINT "PK_DbTransactionLog" PRIMARY KEY ("id")
            )`
        );

        await queryRunner.query(
            'CREATE INDEX IDX_DbTransactionLog_DbTransactionId ON db_transaction_log (db_transaction_id)'
        );
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query('DROP TABLE "db_transaction_log"');
    }
}
