import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class ALTERADDGenderTempTOUserProfile1623191399797 implements MigrationInterface {
    table = 'user_profile';
    column = new TableColumn({
        name: 'gender_temp',
        type: 'character varying',
        isNullable: true
    });

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.addColumn(this.table, this.column);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumn(this.table, this.column);
    }
}
