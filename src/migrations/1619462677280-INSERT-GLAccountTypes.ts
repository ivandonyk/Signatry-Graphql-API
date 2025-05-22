import {MigrationInterface, QueryRunner} from "typeorm";

export class INSERTGLAccountTypes1619462677280 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`INSERT INTO gl_account_type (name, label, description) 
            VALUES ('SHARED_STOCK', 'Shared Stock', 'Brokerage account that receives stock contributions'), 
            ('CONTRIBUTION_REVENUE_NONCASH', 'Contribution Revenue (Non-cash)', 'Revenue account for stock contributions')`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }

}
