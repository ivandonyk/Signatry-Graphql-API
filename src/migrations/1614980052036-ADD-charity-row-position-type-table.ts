import { MigrationInterface, QueryRunner, Column, Table } from 'typeorm';

const role = {
    table: 'role',
    name: 'CHARITY',
    description: 'Charity, regular user, no admin privileges'
};
const user = {
    table: 'user_profile',
    column: 'position_type_id'
};
const position = {
    table: 'position_type'
};

const rows = [
    'Customer Success',
    'Sales / Marketing',
    'Relationship Manager',
    'Implementation Specialist',
    'Executive / Super'
]
    .map(row => `('${row}')`)
    .join(',\n');

export class ADDCharityRowPositionTypeTable1614980052036 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `INSERT INTO ${role.table}(name, description) VALUES ('${role.name}', '${role.description}');`
        );
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS ${position.table} (
            "id" uuid default uuid_generate_v4() primary key,
            "name" varchar(255),
            "enabled" BOOLEAN NOT NULL DEFAULT true,
            "created_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "created_by" uuid NULL,
            "updated_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updated_by" uuid NULL,
            "version" integer NOT NULL DEFAULT 1
        );`);
        await queryRunner.query(`INSERT INTO ${position.table} (name) VALUES ${rows}`);
        await queryRunner.query(
            `ALTER TABLE ${user.table} ADD COLUMN ${user.column} uuid constraint ${user.table}_${user.column}_fk references ${position.table};`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DELETE FROM ${role.table} WHERE name = '${role.name}'`);
        await queryRunner.query(`ALTER TABLE ${user.table} DROP COLUMN ${user.column}`);
        await queryRunner.query(`DROP TABLE IF EXISTS ${position.table}`);
    }
}
