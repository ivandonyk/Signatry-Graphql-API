import { MigrationInterface, QueryRunner } from 'typeorm';

export class SEEDRecipientCodeIntoRecipient1597873824409 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER SEQUENCE recipientCode RESTART WITH 1;');
        const recipients = await queryRunner.query(
            'SELECT * FROM recipient ORDER BY created_on ASC;'
        );
        await Promise.all(
            recipients.map(async recipient => {
                const value = await queryRunner.query("SELECT nextval('recipientCode')");
                return await queryRunner.query(
                    `UPDATE "recipient" SET recipient_code='${value[0].nextval
                        .toString()
                        .padStart(4, 0)}' WHERE id='${recipient.id}'`
                );
            })
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('UPDATE "recipient" SET recipient_code=NULL;');
    }
}
