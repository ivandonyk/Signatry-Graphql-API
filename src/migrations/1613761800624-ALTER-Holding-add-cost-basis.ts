import {MigrationInterface, QueryRunner} from "typeorm";

export class ALTERHoldingAddCostBasis1613761800624 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // This migration was deployed prematurely by accident and did not alter database
        // See 615073744650-ALTER-Holding-add-cost-basis.ts 
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }

}
