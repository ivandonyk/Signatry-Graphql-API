import { MigrationInterface, QueryRunner } from 'typeorm';

export class SEEDAddFinancialAdvisorToRoleTable1604353122663 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            "INSERT INTO role(name, description) VALUES ('Financial Advisor', 'An external Financial Advisor, for use with IMAs')"
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('DELETE FROM "role" WHERE role.name IN (\'Financial Advisor\')');
    }
}
