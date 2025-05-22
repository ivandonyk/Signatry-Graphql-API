import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERRoleRenameUserToDonor1602274080454 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/*sql*/ `
            UPDATE role SET name = 'Donor' WHERE name = 'User';
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/*sql*/ `
            UPDATE role SET name = 'User' WHERE name = 'Donor';
        `);
    }
}
