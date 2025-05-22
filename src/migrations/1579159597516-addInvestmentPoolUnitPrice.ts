import { MigrationInterface, QueryRunner } from 'typeorm';

export class addInvestmentPoolUnitPrice1579159597516 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            'CREATE TABLE "investment_pool_unit_price" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, "version" integer NOT NULL DEFAULT 1, "price" double precision NOT NULL, "investment_pool_id" uuid NOT NULL, CONSTRAINT "PK_eeb46de6126f018cbddeaf9456d" PRIMARY KEY ("id"))',
            undefined
        );
        await queryRunner.query(
            'ALTER TABLE "investment_pool_unit_price" ADD CONSTRAINT "FK_2b68b37abc38e2e1229aa43dff9" FOREIGN KEY ("investment_pool_id") REFERENCES "investment_pool"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
            undefined
        );
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            'ALTER TABLE "investment_pool_unit_price" DROP CONSTRAINT "FK_2b68b37abc38e2e1229aa43dff9"',
            undefined
        );
        await queryRunner.query('DROP TABLE "investment_pool_unit_price"', undefined);
    }
}
