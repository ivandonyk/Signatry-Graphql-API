import { MigrationInterface, QueryRunner } from 'typeorm';

const tenantId = '00000000-0000-0000-0000-000000000000';

export class ALTERTenantADDAddress1624485394149 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `update tenant set address_line_one='7171 W 95th ST #501', city_state_zip='Overland Park, Kansas City, KS 66212' where id ='${tenantId}'`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // no point restoring blank data
        return Promise.resolve();
    }
}
