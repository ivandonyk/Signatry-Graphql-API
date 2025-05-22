import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERDatabaseAddFuzzystrmatchExtension1628087946812 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        queryRunner.query('CREATE EXTENSION fuzzystrmatch;');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        queryRunner.query('DROP EXTENSION fuzzystrmatch;');
    }
}
