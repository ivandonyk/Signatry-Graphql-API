import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class ALTERADDAdministrationStartDateTOInstitutionAccount1623194832931
    implements MigrationInterface {
    table = 'institution_account';
    column = new TableColumn({
        name: 'administration_start_date',
        type: 'date',
        isNullable: true
    });

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.addColumn(this.table, this.column);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumn(this.table, this.column);
    }
}
