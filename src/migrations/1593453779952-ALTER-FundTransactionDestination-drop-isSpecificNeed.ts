import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERFundTransactionDestinationDropIsSpecificNeed1593453779952
    implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            'ALTER TABLE "fund_transaction_destination" DROP COLUMN "is_specific_need"'
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            'ALTER TABLE "fund_transaction_destination" ADD COLUMN "is_specific_need" BOOLEAN NOT NULL DEFAULT true'
        );
    }
}
