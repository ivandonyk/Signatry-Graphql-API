import { MigrationInterface, QueryRunner } from 'typeorm';

export class FundSourceDestination1582751787069 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            `CREATE TABLE "fund_transaction_source" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "fund_transaction_id" uuid NOT NULL,
            "is_manual" BOOLEAN NOT NULL DEFAULT false,
            "user_profile_account_id" uuid NULL,
            "customer_id" character varying NOT NULL,
            "charge_id" character varying NOT NULL,
            "enabled" BOOLEAN NOT NULL DEFAULT true,
            "created_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "created_by" uuid NULL,
            "updated_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updated_by" uuid NULL,
            "version" integer NOT NULL DEFAULT 1,
            CONSTRAINT "PK_FundTransactionSourceId" PRIMARY KEY ("id"))`
        );
        await queryRunner.query(
            'ALTER TABLE "fund_transaction_source" ADD CONSTRAINT "FK_FundTransaction_FundTransactionSource" FOREIGN KEY ("fund_transaction_id") REFERENCES "fund_transaction"("id") ON DELETE NO ACTION ON UPDATE NO ACTION'
        );
        await queryRunner.query(
            `CREATE TABLE "fund_transaction_destination" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "fund_transaction_id" uuid NOT NULL,
            "need" character varying NULL,
            "need_description" character varying NULL,
            "note" character varying NULL,
            "enabled" BOOLEAN NOT NULL DEFAULT true,
            "created_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "created_by" uuid NULL,
            "updated_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updated_by" uuid NULL,
            "version" integer NOT NULL DEFAULT 1,
            CONSTRAINT "PK_FundTransactionDestinationId" PRIMARY KEY ("id"))`
        );
        await queryRunner.query(
            'ALTER TABLE "fund_transaction_destination" ADD CONSTRAINT "FK_FundTransaction_FundTransactionDestination" FOREIGN KEY ("fund_transaction_id") REFERENCES "fund_transaction"("id") ON DELETE NO ACTION ON UPDATE NO ACTION'
        );
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            'ALTER TABLE "fund_transaction_destination" DROP CONSTRAINT "FK_FundTransaction_FundTransactionDestination"'
        );
        await queryRunner.query(
            'ALTER TABLE "fund_transaction_source" DROP CONSTRAINT "FK_FundTransaction_FundTransactionSource"'
        );
        await queryRunner.query('DROP TABLE "fund_transaction_source"');
        await queryRunner.query('DROP TABLE "fund_transaction_destination"');
    }
}
