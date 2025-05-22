import { MigrationInterface, QueryRunner } from 'typeorm';

export class ADDTransactionStatusTypeReadyForDivestment1585149842580 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            'INSERT INTO "transaction_status" ("name") VALUES (\'READY FOR DIVESTMENT\')'
        );
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            'DELETE FROM "transaction_status" WHERE name = (\'READY FOR DIVESTMENT\')'
        );
    }
}
