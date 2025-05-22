import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class ALTERADDDodTOUserProfile1623189541975 implements MigrationInterface {
    table = 'user_profile';
    column = new TableColumn({
        name: 'dod',
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
