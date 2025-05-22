import { MigrationInterface, QueryRunner } from 'typeorm';

export class SEEDSequenceAddFeeTransactionCode1589926982905 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query('CREATE SEQUENCE feeTransactionCode START WITH 1');
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query('DROP SEQUENCE feeTransactionCode');
    }
}
