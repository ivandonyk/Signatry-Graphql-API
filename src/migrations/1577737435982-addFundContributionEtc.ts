import { MigrationInterface, QueryRunner } from 'typeorm';

export class addFundContributionEtc1577737435982 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            'CREATE TABLE "fund_contribution_investment_pool_allocation" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, "version" integer NOT NULL DEFAULT 1, "amount" double precision NOT NULL, "contribution_id" uuid NOT NULL, "investment_pool_id" uuid NOT NULL, CONSTRAINT "PK_d786e949e4cbad5d3e6a543a5a1" PRIMARY KEY ("id"))',
            undefined
        );
        await queryRunner.query(
            'CREATE TABLE "fund_contribution" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, "version" integer NOT NULL DEFAULT 1, "amount" double precision NOT NULL, "plaid_item_id" uuid NOT NULL, "fund_id" uuid NOT NULL, "stripe_charge_id" character varying NULL, CONSTRAINT "PK_bb24d268b329d2dd8cd8a2d2a7a" PRIMARY KEY ("id"))',
            undefined
        );
        await queryRunner.query(
            'ALTER TABLE "user_profile" ADD "stripe_customer_id" character varying',
            undefined
        );
        await queryRunner.query(
            'ALTER TABLE "fund_contribution_investment_pool_allocation" ADD CONSTRAINT "FK_62105e2e099e5ea56b9e588634d" FOREIGN KEY ("contribution_id") REFERENCES "fund_contribution"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
            undefined
        );
        await queryRunner.query(
            'ALTER TABLE "fund_contribution_investment_pool_allocation" ADD CONSTRAINT "FK_ed63b4dbe8004c9b518d3cdd72b" FOREIGN KEY ("investment_pool_id") REFERENCES "investment_pool"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
            undefined
        );
        await queryRunner.query(
            'ALTER TABLE "fund_contribution" ADD CONSTRAINT "FK_0fc03184184508bbc3e55252989" FOREIGN KEY ("plaid_item_id") REFERENCES "plaid_item"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
            undefined
        );
        await queryRunner.query(
            'ALTER TABLE "fund_contribution" ADD CONSTRAINT "FK_ec50c2d1adb2aeed7df4fe716d2" FOREIGN KEY ("fund_id") REFERENCES "fund"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
            undefined
        );
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            'ALTER TABLE "fund_contribution" DROP CONSTRAINT "FK_ec50c2d1adb2aeed7df4fe716d2"',
            undefined
        );
        await queryRunner.query(
            'ALTER TABLE "fund_contribution" DROP CONSTRAINT "FK_0fc03184184508bbc3e55252989"',
            undefined
        );
        await queryRunner.query(
            'ALTER TABLE "fund_contribution_investment_pool_allocation" DROP CONSTRAINT "FK_ed63b4dbe8004c9b518d3cdd72b"',
            undefined
        );
        await queryRunner.query(
            'ALTER TABLE "fund_contribution_investment_pool_allocation" DROP CONSTRAINT "FK_62105e2e099e5ea56b9e588634d"',
            undefined
        );
        await queryRunner.query(
            'ALTER TABLE "user_profile" DROP COLUMN "stripe_customer_id"',
            undefined
        );
        await queryRunner.query('DROP TABLE "fund_contribution"', undefined);
        await queryRunner.query(
            'DROP TABLE "fund_contribution_investment_pool_allocation"',
            undefined
        );
    }
}
