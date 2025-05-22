import { MigrationInterface, QueryRunner } from 'typeorm';

export class SEEDRoleTable1586801998383 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            "INSERT INTO role(name, description) VALUES ('Admin', 'Refers to the highest level of permissions on the site. They can designate permissions and have access to all functionality on the site')"
        );
        await queryRunner.query(
            "INSERT INTO role(name, description) VALUES ('Staff', 'Describes an internal user that have access to functionality designated by an admin user')"
        );
        await queryRunner.query(
            "INSERT INTO role(name, description) VALUES ('User', 'Most basic permisions level')"
        );
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query('DELETE FROM role');
    }
}
