import { MigrationInterface, QueryRunner } from 'typeorm';

export class FundTransactionTables1582688883268 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            `CREATE TABLE "transaction_type" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "name" character varying NOT NULL,
            "description" character varying NULL,
            "enabled" BOOLEAN NOT NULL DEFAULT true,
            "created_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "created_by" uuid NULL,
            "updated_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updated_by" uuid NULL,
            "version" integer NOT NULL DEFAULT 1,
            CONSTRAINT "PK_TransactionTypeId" PRIMARY KEY ("id"))`
        );
        await queryRunner.query(`CREATE TABLE "transaction_status" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "name" character varying NOT NULL,
            "description" character varying NULL,
            "enabled" BOOLEAN NOT NULL DEFAULT true,
            "created_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "created_by" uuid NULL,
            "updated_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updated_by" uuid NULL,
            "version" integer NOT NULL DEFAULT 1,
            CONSTRAINT "PK_TransactionStatusId" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "transaction_detail_status" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "name" character varying NOT NULL,
            "description" character varying NULL,
            "enabled" BOOLEAN NOT NULL DEFAULT true,
            "created_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "created_by" uuid NULL,
            "updated_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updated_by" uuid NULL,
            "version" integer NOT NULL DEFAULT 1,
            CONSTRAINT "PK_TransactionDetailStatusId" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "fund_transaction" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "transaction_type_id" uuid NOT NULL,
            "transactions_date_time" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "amount" FLOAT NOT NULL DEFAULT 0,
            "units" FLOAT NOT NULL DEFAULT 0,
            "transaction_status_id" uuid NOT NULL,
            "enabled" BOOLEAN NOT NULL DEFAULT true,
            "created_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "created_by" uuid NULL,
            "updated_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updated_by" uuid NULL,
            "version" integer NOT NULL DEFAULT 1,
            CONSTRAINT "PK_FundTransactionId" PRIMARY KEY ("id"))`);
        await queryRunner.query(
            'ALTER TABLE "fund_transaction" ADD CONSTRAINT "FK_TransactionType_FundTransaction" FOREIGN KEY ("transaction_type_id") REFERENCES "transaction_type"("id") ON DELETE NO ACTION ON UPDATE NO ACTION'
        );
        await queryRunner.query(
            'ALTER TABLE "fund_transaction" ADD CONSTRAINT "FK_TransactionStatus_FundTransaction" FOREIGN KEY ("transaction_status_id") REFERENCES "transaction_status"("id") ON DELETE NO ACTION ON UPDATE NO ACTION'
        );
        await queryRunner.query(`CREATE TABLE "fund_transaction_detail" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "fund_transaction_id" uuid NOT NULL,
            "fund_investment_id" uuid NOT NULL,
            "transactions_date_time" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "amount" FLOAT NOT NULL DEFAULT 0,
            "units" FLOAT NOT NULL DEFAULT 0,
            "transaction_detail_status_id" uuid NOT NULL,
            "enabled" BOOLEAN NOT NULL DEFAULT true,
            "created_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "created_by" uuid NULL,
            "updated_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updated_by" uuid NULL,
            "version" integer NOT NULL DEFAULT 1,
            CONSTRAINT "PK_FundTransactionDetailId" PRIMARY KEY ("id"))`);
        await queryRunner.query(
            'ALTER TABLE "fund_transaction_detail" ADD CONSTRAINT "FK_FundTransaction_FundTransactionDetail" FOREIGN KEY ("fund_transaction_id") REFERENCES "fund_transaction"("id") ON DELETE NO ACTION ON UPDATE NO ACTION'
        );
        await queryRunner.query(
            'ALTER TABLE "fund_transaction_detail" ADD CONSTRAINT "FK_TransactionDetailStatus_FundTransactionDetail" FOREIGN KEY ("transaction_detail_status_id") REFERENCES "transaction_detail_status"("id") ON DELETE NO ACTION ON UPDATE NO ACTION'
        );
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            'ALTER TABLE "fund_transaction_detail" DROP CONSTRAINT "FK_TransactionDetailStatus_FundTransactionDetail"'
        );
        await queryRunner.query(
            'ALTER TABLE "fund_transaction_detail" DROP CONSTRAINT "FK_FundTransaction_FundTransactionDetail"'
        );
        await queryRunner.query(
            'ALTER TABLE "fund_transaction" DROP CONSTRAINT "FK_TransactionStatus_FundTransaction"'
        );
        await queryRunner.query(
            'ALTER TABLE "fund_transaction" DROP CONSTRAINT "FK_TransactionType_FundTransaction"'
        );
        await queryRunner.query('DROP TABLE "fund_transaction_detail"');
        await queryRunner.query('DROP TABLE "fund_transaction"');
        await queryRunner.query('DROP TABLE "transaction_detail_status"');
        await queryRunner.query('DROP TABLE "transaction_status"');
        await queryRunner.query('DROP TABLE "transaction_type"');
    }
}
