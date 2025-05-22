import { MigrationInterface, QueryRunner } from 'typeorm';

const table = 'user_profile';
const column = 'user_code';
const sequence = 'userCode';

export class ALTERUserCode1616688470425 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE ${table} ADD ${column} character varying UNIQUE`);
        await queryRunner.query(`CREATE SEQUENCE ${sequence} START WITH 1`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP SEQUENCE ${sequence}`);
        await queryRunner.query(`ALTER TABLE ${table} DROP COLUMN ${column}`);
    }
}
