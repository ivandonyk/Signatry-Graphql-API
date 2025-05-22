import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERFundTransactionInfoNullableFields1596153161039 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            'ALTER TABLE "fund_transaction_info" ALTER COLUMN "purpose_notes" DROP NOT NULL;'
        );
        await queryRunner.query(
            'ALTER TABLE "fund_transaction_info" ALTER COLUMN "special_instructions" DROP NOT NULL;'
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            'ALTER TABLE "fund_transaction_info" ALTER COLUMN "purpose_notes" SET NOT NULL;'
        );
        await queryRunner.query(
            'ALTER TABLE "fund_transaction_info" ALTER COLUMN "special_instructions" SET NOT NULL;'
        );
    }
}
