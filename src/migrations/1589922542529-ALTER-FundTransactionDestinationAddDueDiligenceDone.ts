import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERFundTransactionDestinationAddDueDiligenceDone1589922542529
    implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            'ALTER TABLE "fund_transaction_destination" ADD COLUMN "due_diligence_done" boolean NOT NULL DEFAULT false'
        );
        await queryRunner.query(
            'UPDATE "fund_transaction_destination" set "due_diligence_done" = NOT "is_specific_need"'
        );
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            'ALTER TABLE "fund_transaction_destination" DROP COLUMN "due_diligence_done"'
        );
    }
}
