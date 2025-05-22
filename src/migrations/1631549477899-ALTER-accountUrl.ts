import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class ALTERAccountUrl1631549477899 implements MigrationInterface {
    name?: string;
    private iaTable = 'institution_account';
    private faTable = 'financial_advisor';

    private urlColumn = new TableColumn({
        name: 'url',
        type: 'character varying',
        isNullable: true
    });
    private instructionColumn = new TableColumn({
        name: 'receives_instructions',
        type: 'boolean',
        isNullable: false,
        default: true
    });

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.addColumn(this.iaTable, this.urlColumn);
        await queryRunner.addColumn(this.faTable, this.instructionColumn);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumn(this.iaTable, this.urlColumn);
        await queryRunner.dropColumn(this.faTable, this.instructionColumn);
    }
}
