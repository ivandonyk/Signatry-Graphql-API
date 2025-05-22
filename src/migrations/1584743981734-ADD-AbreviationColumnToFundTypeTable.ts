import { MigrationInterface, QueryRunner } from 'typeorm';

export class ADDAbreviationColumnToFundTypeTable1584743981734 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            'ALTER TABLE "transaction_type" ADD COLUMN "abbreviation" character varying NULL'
        );
        await queryRunner.query(
            "UPDATE transaction_type SET abbreviation = 'G' WHERE name = 'GRANT'"
        );
        await queryRunner.query(
            "UPDATE transaction_type SET abbreviation = 'C' WHERE name = 'CONTRIBUTION'"
        );
        await queryRunner.query(
            "UPDATE transaction_type SET abbreviation = 'F' WHERE name = 'FEE'"
        );
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query('ALTER TABLE "transaction_type" DROP COLUMN "abbreviation"');
    }
}
