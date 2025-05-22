import { MigrationInterface, QueryRunner } from 'typeorm';

const tenantId = '00000000-0000-0000-0000-000000000000';

export class ALTERTenantUpdateAddress1624547903779 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `update tenant set city_state_zip='Overland Park, KS 66212' where id ='${tenantId}'`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // no point restoring blank data
        return Promise.resolve();
    }
}
