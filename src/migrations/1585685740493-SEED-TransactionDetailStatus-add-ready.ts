import { MigrationInterface, QueryRunner } from 'typeorm';

export class SEEDTransactionDetailStatusAddReady1585685740493 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            'INSERT INTO "transaction_detail_status" ("name") VALUES (\'READY_FOR_DIVESTMENT\'), (\'READY_FOR_INVESTMENT\')'
        );
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            'DELETE FROM "transaction_detail_status" WHERE name = (\'READY_FOR_INVESTMENT\')'
        );
        await queryRunner.query(
            'DELETE FROM "transaction_detail_status" WHERE name = (\'READY_FOR_DIVESTMENT\')'
        );
    }
}
