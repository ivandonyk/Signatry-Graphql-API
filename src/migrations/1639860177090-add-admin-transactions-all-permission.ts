import {MigrationInterface, QueryRunner} from "typeorm";


/** 
    See https://giveinteractive.atlassian.net/browse/GD-94 for more context.

    In this migration:
    - Add a new permission type `ADMIN_TRANSACTIONS_ALL`
    - Grant `ADMIN_TRANSACTIONS_ALL` `FULL` to the `STAFF_BASIC` role
    - Grant `ADMIN_TRANSACTIONS_ALL` `FULL` to _all_ roles that had `READ` or `FULL` access to `ADMIN_INVESTMENTS`
    - Update `ADMIN_TRANSACTIONS_ALL` from `NONE` to `FULL` for STAFF_PLUS
    - Grant `ADMIN_TRANSACTIONS_ALL` `NONE` to all remaining roles
*/
export class addAdminTransactionsAllPermission1639860177090 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/* sql */ `
            do
            $$
                declare
                    v_staff_basic_role role;
                begin
                    -- See https://giveinteractive.atlassian.net/browse/GD-94 for more on why this change to permissions

                    -- Add a new permission type ADMIN_TRANSACTIONS_ALL
                    alter type permission_access_type rename to _permission_access_type;
                    create type permission_access_type as enum (
                        'USER_DEFAULTS',
                        'ADMIN_FUNDS',
                        'ADMIN_IMA_MANAGEMENT',
                        'ADMIN_INVESTMENT_POOLS',
                        'ADMIN_CONTRIBUTIONS',
                        'ADMIN_CONTRIBUTIONS_NEW',
                        'ADMIN_BATCHES',
                        'ADMIN_RECIPIENTS',
                        'ADMIN_GRANTS',
                        'ADMIN_GRANTS_NEW',
                        'ADMIN_GRANTS_DUE_DILIGENCE',
                        'ADMIN_GRANTS_REVIEW',
                        'ADMIN_GRANTS_PAYMENTS',
                        'ADMIN_GRANTS_ALL',
                        'ADMIN_GRANTS_SPECIAL_APPROVAL',
                        'ADMIN_GRANT_FINALIZE',
                        'ADMIN_USER_MANAGEMENT',
                        'ADMIN_INVESTMENTS',
                        'ADMIN_DIVESTMENTS',
                        'ADMIN_BANK_ACCOUNTS',
                        'ADMIN_RECONCILIATION',
                        'ADMIN_CONTENT_MANAGEMENT',
                        'ADMIN_TRANSACTIONS_ALL',
                        'FUND_CREATE',
                        'CHARITY_GRANT_NOW_CTA',
                        'CHARITY_FAVORITES',
                        'CHARITY_CREATE',
                        'CHARITY_SEARCH',
                        'CHARITY_PROFILE',
                        'LINK_DONOR_FUNDING_ACCOUNT',
                        'ADMIN_FUND_TRANSFERS',
                        'ADMIN_FEES'
                        );
                    alter table permission
                        alter column access_type set default null;
                    alter table permission
                        alter column access_type type permission_access_type using access_type::text::permission_access_type;
                    alter table permission
                        alter column access_type set default 'USER_DEFAULTS'::permission_access_type;
                    drop type _permission_access_type;

                    -- Grab the STAFF_BASIC role
                    select * from role where name = 'STAFF_BASIC' into v_staff_basic_role;

                    -- Grant the STAFF_BASIC role the new ADMIN_TRANSACTIONS_ALL permission type
                    insert into permission (name, description, role_id, access_type)
                    values ('Admin Transactions All', 'Access to Admin > All Transactions', v_staff_basic_role.id,
                            'ADMIN_TRANSACTIONS_ALL'::permission_access_type);

                    -- Find all roles that had any access to ADMIN_INVESTMENTS and grant those roles FULL access to ADMIN_TRANSACTIONS_ALL
                    -- Grant all remaining roles NONE access_level
                    with role_with_admin_investments_permission as (
                        select role.*
                        from role
                                join permission p on role.id = p.role_id
                        where p.access_type = 'ADMIN_INVESTMENTS'::permission_access_type
                        and p.access_level <> 'NONE'::permission_access_level
                    )
                    insert
                    into permission (name, description, role_id, access_type, access_level)
                        (select 'Admin Transactions All',
                                'Access to Admin > All Transactions',
                                role.id,
                                'ADMIN_TRANSACTIONS_ALL'::permission_access_type,
                                -- Give FULL access to roles that had READ or FULL access for the ADMIN_INVESTMENTS permission.
                                -- Give remaining roles NONE access
                                case
                                    when exists(select 1
                                                from role_with_admin_investments_permission
                                                where role.id = role_with_admin_investments_permission.id) then 'FULL'::permission_access_level
                                    else 'NONE'::permission_access_level end
                        -- Insert a permission for every role EXCEPT the STAFF_BASIC role (we already created one above)
                        from role
                        where role.id <> v_staff_basic_role.id);

                    /*
                        The STAFF_PLUS had NONE level access to ADMIN_INVESTMENTS, but according to the roles/permissions outlined
                        in the spreadsheet attached to https://giveinteractive.atlassian.net/browse/GD-94 (as of 12/18/21) the
                        STAFF_PLUS role _should_ have access to the All Transactions tab.

                        Accordingly - go ahead and give STAFF_BASIC FULL access on the new ADMIN_TRANSACTIONS_ALL permission.
                    */
                    update permission
                    set access_level = 'FULL'::permission_access_level
                    from role
                    where permission.role_id = role.id
                    and role.name = 'STAFF_PLUS'
                    and access_type = 'ADMIN_TRANSACTIONS_ALL'::permission_access_type;
                end;
            $$;
        `)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        queryRunner.query(/* sql */ `
            do
            $$
                begin
                    delete from permission where access_type = 'ADMIN_TRANSACTIONS_ALL'::permission_access_type;

                    alter type permission_access_type rename to _permission_access_type;
                    create type permission_access_type as enum (
                        'USER_DEFAULTS',
                        'ADMIN_FUNDS',
                        'ADMIN_IMA_MANAGEMENT',
                        'ADMIN_INVESTMENT_POOLS',
                        'ADMIN_CONTRIBUTIONS',
                        'ADMIN_CONTRIBUTIONS_NEW',
                        'ADMIN_BATCHES',
                        'ADMIN_RECIPIENTS',
                        'ADMIN_GRANTS',
                        'ADMIN_GRANTS_NEW',
                        'ADMIN_GRANTS_DUE_DILIGENCE',
                        'ADMIN_GRANTS_REVIEW',
                        'ADMIN_GRANTS_PAYMENTS',
                        'ADMIN_GRANTS_ALL',
                        'ADMIN_GRANTS_SPECIAL_APPROVAL',
                        'ADMIN_GRANT_FINALIZE',
                        'ADMIN_USER_MANAGEMENT',
                        'ADMIN_INVESTMENTS',
                        'ADMIN_DIVESTMENTS',
                        'ADMIN_BANK_ACCOUNTS',
                        'ADMIN_RECONCILIATION',
                        'ADMIN_CONTENT_MANAGEMENT',
                        'FUND_CREATE',
                        'CHARITY_GRANT_NOW_CTA',
                        'CHARITY_FAVORITES',
                        'CHARITY_CREATE',
                        'CHARITY_SEARCH',
                        'CHARITY_PROFILE',
                        'LINK_DONOR_FUNDING_ACCOUNT',
                        'ADMIN_FUND_TRANSFERS',
                        'ADMIN_FEES'
                        );
                    alter table permission
                        alter column access_type set default null;
                    alter table permission
                        alter column access_type type permission_access_type using access_type::text::permission_access_type;
                    alter table permission
                        alter column access_type set default 'USER_DEFAULTS'::permission_access_type;
                    drop type _permission_access_type;
                end;
            $$;
        `)
    }

}
