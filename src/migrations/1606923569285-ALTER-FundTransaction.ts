import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERFundTransaction1606923569285 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            'ALTER TABLE fund_transaction ADD COLUMN contributed_on TIMESTAMP NULL'
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "fund_transaction" DROP COLUMN "contributed_on"`);
    }
}
