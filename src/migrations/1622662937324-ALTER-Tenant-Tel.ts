import { MigrationInterface, QueryRunner } from 'typeorm';

const tenantId = '00000000-0000-0000-0000-000000000000';

export class ALTERTenantTel1622662937324 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`update tenant set phone='913-310-0279' where id ='${tenantId}'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // no point restoring dummy tel
        return Promise.resolve();
    }
}
