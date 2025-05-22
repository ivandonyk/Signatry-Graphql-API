import { MigrationInterface, QueryRunner } from 'typeorm';

export class addInvestmentPool1576906243178 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            `CREATE TABLE "investment_pool" ("id" uuid NOT NULL DEFAULT uuid_generate_v4()
            , "created_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            , "updated_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            , "version" integer NOT NULL DEFAULT 1
            , "name" character varying NOT NULL
            , "default_allocation_percentage" double precision NOT NULL
            , "ordinal" integer NOT NULL
            , CONSTRAINT "PK_b993d1061770fb158ec2b1d06f1" PRIMARY KEY ("id"))`,
            undefined
        );
        await queryRunner.query(`INSERT INTO "investment_pool" (name, default_allocation_percentage, ordinal)
            VALUES ('Money Market', .5, 0)
            , ('Capital Preservation Model', .3, 1)
            , ('Conservative Income', .2, 2)`);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query('DROP TABLE "investment_pool"', undefined);
    }
}
