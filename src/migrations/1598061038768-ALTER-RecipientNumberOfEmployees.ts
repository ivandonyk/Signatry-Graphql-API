import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERRecipientNumberOfEmployees1598061038768 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            'ALTER TABLE "recipient" ADD COLUMN "number_of_employees" INTEGER NULL;'
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE "recipient" DROP COLUMN "number_of_employees";');
    }
}
