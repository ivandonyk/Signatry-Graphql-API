import { MigrationInterface, QueryRunner } from 'typeorm';

export class CREATEFundRelationshipTable1611165575040 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/*sql*/ `
            CREATE TABLE fund_relationship (
                id uuid NOT NULL DEFAULT uuid_generate_v4(),
                name character varying NOT NULL,
                enabled boolean NOT NULL DEFAULT true,
                created_on timestamp NOT NULL DEFAULT current_timestamp,
                created_by uuid NULL,
                updated_on timestamp NOT NULL DEFAULT current_timestamp,
                updated_by uuid NULL,
                version integer NOT NULL DEFAULT 1,
                CONSTRAINT PK_FundRelationshipId PRIMARY KEY (id)
            )
        `);

        await queryRunner.query(/*sql*/ `
            ALTER TABLE fund_user_profile ADD COLUMN fund_relationship_id uuid
        `);

        await queryRunner.query(/*sql */ `
            ALTER TABLE fund_user_profile ADD CONSTRAINT FK_FundRelationshipId FOREIGN KEY (fund_relationship_id) REFERENCES fund_relationship(id) ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(/*sql */ `
            INSERT INTO fund_relationship (name) VALUES ('Fundholder'), ('Grant Advisor'), ('Financial Advisor'), ('Other')
        `);

        await queryRunner.query(/*sql */ `
            CREATE TABLE pending_fund_user (
                id uuid NOT NULL DEFAULT uuid_generate_v4(), 
                email character varying NOT NULL,
                enabled boolean NOT NULL DEFAULT true,
                created_on TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, 
                updated_on TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, 
                version integer NOT NULL DEFAULT 1, 
                fund_relationship_id uuid,
                fund_role_id uuid,
                fund_id uuid NOT NULL, 
                CONSTRAINT PK_PendingFundUserId PRIMARY KEY (id)
            )
        `);

        await queryRunner.query(/*sql */ `
            ALTER TABLE pending_fund_user ADD CONSTRAINT FK_FundRelationshipId_PFU FOREIGN KEY (fund_relationship_id) REFERENCES fund_relationship(id) ON DELETE NO ACTION ON UPDATE NO ACTION
        `);

        await queryRunner.query(/*sql */ `
            ALTER TABLE pending_fund_user ADD CONSTRAINT FK_FundId_PFU FOREIGN KEY (fund_id) REFERENCES fund(id) ON DELETE NO ACTION ON UPDATE NO ACTION
        `);

        await queryRunner.query(/*sql */ `
            ALTER TABLE invitation ADD COLUMN pending_fund_user_id uuid
        `);

        await queryRunner.query(/*sql */ `
            ALTER TABLE invitation ADD CONSTRAINT FK_PFUId_Invitation FOREIGN KEY (pending_fund_user_id) REFERENCES pending_fund_user(id) ON DELETE NO ACTION ON UPDATE NO ACTION
        `);

        const [{ id }] = await queryRunner.query(/*sql */`
            SELECT id FROM fund_relationship WHERE name = 'Fundholder'
        `);

        await queryRunner.query(/*sql */`
            UPDATE fund_user_profile SET fund_relationship_id = '${id}' WHERE fund_relationship_id IS NULL
        `
        );

    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/*sql */ `
            ALTER TABLE fund_user_profile DROP CONSTRAINT FK_FundRelationshipId
        `);

        await queryRunner.query(/*sql*/ `
            ALTER TABLE fund_user_profile DROP COLUMN fund_relationship_id
        `);

        await queryRunner.query(/*sql*/ `
            DROP TABLE fund_relationship
        `);

        await queryRunner.query(/*sql */ `
            ALTER TABLE pending_fund_user DROP CONSTRAINT FK_FundRelationshipId_PFU
        `);

        await queryRunner.query(/*sql */ `
            ALTER TABLE pending_fund_user DROP CONSTRAINT FK_FundId_PFU
        `);

        await queryRunner.query(/*sql */ `
            DROP TABLE pending_fund_user 
        `);
    }
}
