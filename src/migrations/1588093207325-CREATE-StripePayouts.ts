import { MigrationInterface, QueryRunner } from 'typeorm';

export class CREATEStripePayouts1588093207325 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            `CREATE TABLE "stripe_payout" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "stripe_id" character varying NOT NULL,
            "statement_code" character varying NOT NULL,
            "status" character varying NOT NULL,
            "amount" FLOAT NOT NULL,
            "created_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updated_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "version" integer NOT NULL DEFAULT 1,
            CONSTRAINT "PK_PayoutId" PRIMARY KEY ("id")
            )`
        );

        await queryRunner.query(
            `CREATE TABLE "stripe_payout_fund_transaction" (
            "stripe_payout_id" uuid NOT NULL,
            "fund_transaction_id" uuid NOT NULL,
            CONSTRAINT "FK_FundTransactionId" FOREIGN KEY ("fund_transaction_id") REFERENCES "fund_transaction"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
            CONSTRAINT "FK_PayoutId" FOREIGN KEY ("stripe_payout_id") REFERENCES "stripe_payout"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
            )`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query('DROP TABLE "stripe_payout_fund_transaction"');
        await queryRunner.query('DROP TABLE "stripe_payout"');
    }
}
