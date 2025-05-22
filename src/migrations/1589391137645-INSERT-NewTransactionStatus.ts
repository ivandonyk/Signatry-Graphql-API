import { MigrationInterface, QueryRunner } from 'typeorm';

export class INSERTNewTransactionStatus1589391137645 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            'INSERT INTO "transaction_status" ("name") VALUES (\'DUE_DILIGENCE_AND_VETTING\')'
        );
        await queryRunner.query(
            'INSERT INTO "transaction_detail_status" ("name") VALUES (\'DUE_DILIGENCE_AND_VETTING\')'
        );
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            'DELETE FROM "transaction_status" WHERE name = (\'DUE_DILIGENCE_AND_VETTING\')'
        );
        await queryRunner.query(
            'DELETE FROM "transaction_detail_status" WHERE name = (\'DUE_DILIGENCE_AND_VETTING\')'
        );
    }
}
