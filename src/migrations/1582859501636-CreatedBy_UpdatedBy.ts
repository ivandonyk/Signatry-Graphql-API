import { MigrationInterface, QueryRunner } from 'typeorm';

const tables = [
    'app_user',
    'investment',
    'investment_unit_price_history',
    'tenant',
    'tenant_account',
    'user_profile',
    'user_profile_account',
    'user_profile_address',
    'user_profile_email',
    'user_profile_phone'
];

export class CreatedByUpdatedBy1582859501636 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        // rename created_by_id -> created_by
        await Promise.all(
            tables.map(table => {
                return queryRunner.query(
                    `ALTER TABLE ${table} RENAME COLUMN "created_by_id" TO "created_by"`
                );
            })
        );
        // rename updated_by_id -> updated_by
        await Promise.all(
            tables.map(table => {
                return queryRunner.query(
                    `ALTER TABLE ${table} RENAME COLUMN "updated_by_id" TO "updated_by"`
                );
            })
        );
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await Promise.all(
            tables.map(table => {
                return queryRunner.query(
                    `ALTER TABLE ${table} RENAME COLUMN "created_by" TO "created_by_id"`
                );
            })
        );
        await Promise.all(
            tables.map(table => {
                return queryRunner.query(
                    `ALTER TABLE ${table} RENAME COLUMN "updated_by" TO "updated_by_id"`
                );
            })
        );
    }
}
