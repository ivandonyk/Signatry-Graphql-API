import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class ALTERAddWasMigratedToUserProfile1622583659943 implements MigrationInterface {
    table = 'user_profile';
    column = new TableColumn({
        name: 'was_migrated',
        type: 'boolean',
        isNullable: true,
        default: false
    });

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.addColumn(this.table, this.column);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumn(this.table, this.column);
    }
}
