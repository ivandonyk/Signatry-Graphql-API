import { MigrationInterface, QueryRunner } from 'typeorm';

export class FundTransactionDestinationRecipient1582835673434 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            'ALTER TABLE "fund_transaction_destination" ADD COLUMN "recipient_id" UUID NOT NULL'
        );

        await queryRunner.query(`
            ALTER TABLE "fund_transaction_destination"
            ADD CONSTRAINT "FK_Recipient_FundTransactionDestination"
            FOREIGN KEY ("recipient_id")
            REFERENCES "recipient"("id")
            ON DELETE NO ACTION
            ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            'ALTER TABLE "fund_transaction_destination" DROP COLUMN "recipient_id"'
        );
    }
}
