import { MigrationInterface, QueryRunner } from 'typeorm';

const table = 'fund_transaction_detail';
const column = 'transaction_code';
const sequence = 'fundTransactionCode';

export class SEEDSequenceAddTransactionId1614792177659 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE ${table} ADD ${column} character varying UNIQUE`);
        await queryRunner.query(`CREATE SEQUENCE ${sequence} START WITH 1`);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`DROP SEQUENCE ${sequence}`);
        await queryRunner.query(`ALTER TABLE ${table} DROP COLUMN ${column}`);
    }
}
