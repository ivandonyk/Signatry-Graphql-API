import {MigrationInterface, QueryRunner} from "typeorm";

export class SEEDMoreFundTypes1623342029123 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            INSERT INTO fund_type (name, description, order_num) 
            VALUES ('Charity Fund', 'Charity fund', 1),
                ('Designated Fund', 'Designated fund', 1),
                ('Special Purpose Fund', 'Special purpose fund', 1)
            `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DELETE FROM fund_type WHERE name = 'Charity fund' OR name = 'Designated fund' OR name = 'Special purpose fund'`);
    }

}
