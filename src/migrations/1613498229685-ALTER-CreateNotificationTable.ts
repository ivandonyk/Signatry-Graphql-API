import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERCreateNotificationTable1613498229685 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/* sql */ `
            CREATE TYPE notification_type AS ENUM (
                'FUND_CREATED',
                'FUND_EDITED',
                'FUND_DELETED',
                'FUND_ROLE_ADDED_REMOVED',
                'FUND_SUCCESSOR_ADDED_REMOVED',
                'CONTRIBUTION_CREATED',
                'CONTRIBUTION_POSTED',
                'CONTRIBUTION_CLEARED',
                'CONTRIBUTION_EDITED',
                'CONTRIBUTION_STOCK_GIFT_RECEIVED',
                'GRANT_ONE_TIME_REQUEST',
                'GRANT_RECURRING_REQUEST',
                'GRANT_PAID',
                'GRANT_EDITED',
                'GRANT_CANCELLED',
                'GRANT_ON_HOLD',
                'GRANT_INSUFFICIENT_FUNDS',
                'TRANSACTION_FUND_TO_FUND_TRANSFER_REQUESTED',
                'TRANSACTION_FUND_TO_FUND_TRANSFER_COMPLETED',
                'INVESTMENT_REALLOCATION_REQUESTED',
                'INVESTMENT_REALLOCATION_COMPELTED',
                'MONEY_MANAGER_ADVISOR_CONFIRMATION_OF_FUNDS_SENT',
                'MONEY_MANAGER_ADVISOR_REQUEST_FOR_FUNDS_TRANSFER'
            );
        `);

        await queryRunner.query(/* sql */ `
            CREATE TABLE IF NOT EXISTS notification
            (
                id uuid default uuid_generate_v4() constraint notifications_pk primary key,
                name varchar(255) not null,
                enabled boolean not null,
                notification_type notification_type not null,
                created_on timestamp default CURRENT_TIMESTAMP not null,
                updated_on timestamp default CURRENT_TIMESTAMP not null
            );
        `);

        await queryRunner.query(/* sql */ `
        INSERT INTO notification
            (name, notification_type, enabled, created_on, updated_on)
        values
            ('Fund - Created',                                     'FUND_CREATED', true, now(), now()),
            ('Fund - Edited',                                      'FUND_EDITED', true, now(), now()),
            ('Fund - Deleted',                                     'FUND_DELETED', true, now(), now()),
            ('Fund - Role(s) Added/Removed',                       'FUND_ROLE_ADDED_REMOVED', true, now(), now()),
            ('Fund - Successor(s) Added/Removed',                  'FUND_SUCCESSOR_ADDED_REMOVED', true, now(), now()),
            ('Contribution - Created',                             'CONTRIBUTION_CREATED', true, now(), now()),
            ('Contribution - Posted',                              'CONTRIBUTION_POSTED', true, now(), now()),
            ('Contribution - Cleared',                             'CONTRIBUTION_CLEARED', true, now(), now()),
            ('Contribution - Edited',                              'CONTRIBUTION_EDITED', true, now(), now()),
            ('Contribution - Stock Gift Received',                 'CONTRIBUTION_STOCK_GIFT_RECEIVED', true, now(), now()),
            ('Grant - One-Time Request',                           'GRANT_ONE_TIME_REQUEST', true, now(), now()),
            ('Grant - Recurring Request',                          'GRANT_RECURRING_REQUEST', true, now(), now()),
            ('Grant - Paid',                                       'GRANT_PAID', true, now(), now()),
            ('Grant - Edited',                                     'GRANT_EDITED', true, now(), now()),
            ('Grant - Cancelled',                                  'GRANT_CANCELLED', true, now(), now()),
            ('Grant - On Hold',                                    'GRANT_ON_HOLD', true, now(), now()),
            ('Grant - Insufficient Funds',                         'GRANT_INSUFFICIENT_FUNDS', true, now(), now()),
            ('Transaction - Fund-to-Fund Transfer Request',        'TRANSACTION_FUND_TO_FUND_TRANSFER_REQUESTED', true, now(), now()),
            ('Transaction - Fund-to-Fund Transfer Completed',      'TRANSACTION_FUND_TO_FUND_TRANSFER_COMPLETED', true, now(), now()),
            ('Investment - Reallocation Requested',                'INVESTMENT_REALLOCATION_REQUESTED', true, now(), now()),
            ('Investment - Reallocation Completed', 'INVESTMENT_REALLOCATION_COMPELTED', true, now(), now()),
            ('Money Manager - Advisor Confirmation of Funds Sent', 'MONEY_MANAGER_ADVISOR_CONFIRMATION_OF_FUNDS_SENT', true, now(), now()),
            ('Money Manager - Advisor Request for Funds Transfer', 'MONEY_MANAGER_ADVISOR_REQUEST_FOR_FUNDS_TRANSFER', true, now(), now());
        `);

        await queryRunner.query(/* sql */ `
        create table user_profile_notification
            (
	            id uuid default uuid_generate_v4() constraint user_profile_notification_pk primary key,
	            enabled boolean not null,
	            user_profile_id uuid not null constraint user_profile_notification_user_profile_id_fk references user_profile,
	            notification_id uuid not null constraint user_profile_notification_notifications_id_fk references notification,
	            created_on timestamp default CURRENT_TIMESTAMP not null,
	            updated_on timestamp default CURRENT_TIMESTAMP not null
            );
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('DROP TABLE IF EXISTS user_profile_notification');
        await queryRunner.query('DROP TABLE IF EXISTS notification');
        await queryRunner.query('DROP TYPE IF EXISTS notification_type');
    }
}
