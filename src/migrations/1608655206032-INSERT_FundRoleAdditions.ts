import { MigrationInterface, QueryRunner } from "typeorm";

export class INSERTFundRoleAdditions1608655206032 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/*sql */ `
            DO
            LANGUAGE plpgsql $$
            DECLARE
            fund_role_id uuid := null;
            BEGIN
            
                INSERT INTO fund_role (name, enabled, created_on, created_by, updated_on, updated_by, version)
                VALUES ('Read Only + Investments', true, now(), null, now(), null, 1);
            
                fund_role_id := (SELECT id FROM fund_role WHERE name LIKE 'Read Only + Investments');
            
                INSERT INTO fund_permission (access_type,
                                             access_level,
                                             name,
                                             description,
                                             created_on,
                                             created_by,
                                             updated_on,
                                             updated_by,
                                             version,
                                             enabled,
                                             fund_role_id)
                    VALUES
                    ('ROLES_AND_PERMISSIONS',       'READ',  'Roles And Permissions',      'Roles And Permissions',      now(), null, now(), null, 1, true, fund_role_id),
                    ('LINK_DONOR_FUNDING_ACCOUNT',  'FULL',  'Link Donor Funding Account', 'Link Donor Funding Account', now(), null, now(), null, 1, true, fund_role_id),
                    ('CONTRIBUTION_DETAIL',         'READ',  'Contribution Detail',        'Contribution Detail',        now(), null, now(), null, 1, true, fund_role_id),
                    ('EXPORT_CONTRIBUTION_TABLE',   'FULL',  'Export Contribution Table',  'Export Contribution Table',  now(), null, now(), null, 1, true, fund_role_id),
                    ('FUND_TO_FUND_TRANSFERS',      'READ' , 'Fund to Fund Transfers',     'Fund to Fund Transfers',     now(), null, now(), null, 1, true, fund_role_id),
                    ('REALLOCATE_INVESTMENTS',      'FULL',  'Reallocate Investments',     'Reallocate Investments',     now(), null, now(), null, 1, true, fund_role_id),
                    ('REBALANCE_INVESTMENTS',       'FULL',  'Rebalance Investments',      'Rebalance Investments',      now(), null, now(), null, 1, true, fund_role_id),
                    ('TRANSACTION_DETAIL',          'READ',  'Transaction Detail',         'Transaction Detail',         now(), null, now(), null, 1, true, fund_role_id),
                    ('DOCUMENT_SETTINGS',           'READ',  'Document Settings',          'Document Settings',          now(), null, now(), null, 1, true, fund_role_id),
                    ('GRANT_DETAIL',                'READ',  'Grant Detail',               'Grant Detail',               now(), null, now(), null, 1, true, fund_role_id),
                    ('EXPORT_GRANT_TABLE',          'FULL',  'Export Grant Table',         'Export Grant Table',         now(), null, now(), null, 1, true, fund_role_id),
                    ('GRANT_NOW_CTA',               'NONE',  'Grant Now Cta',              'Grant Now Cta',              now(), null, now(), null, 1, true, fund_role_id),
                    ('LIQUIDATION_REQUESTS',        'NONE',  'Liquidation Requests',       'Liquidation Requests',       now(), null, now(), null, 1, true, fund_role_id),
                    ('INITIATE_CONTRIBUTION',       'FULL',  'Initiate Contribution',      'Initiate Contribution',      now(), null, now(), null, 1, true, fund_role_id),
                    ('DASHBOARD',                   'READ',  'Dashboard',                  'Dashboard',                  now(), null, now(), null, 1, true, fund_role_id),
                    ('RECOMMEND_A_GRANT',           'NONE',  'Recommend a Grant',          'Recommend a Grant',          now(), null, now(), null, 1, true, fund_role_id),
                    ('VIEW_GRANTS_DASHBOARD',       'READ',  'View Grants Dashboard',      'View Grants Dashboard',      now(), null, now(), null, 1, true, fund_role_id),
                    ('INVESTMENT_INSTRUCTIONS',     'FULL',  'Investment Instructions',    'Investment Instructions',    now(), null, now(), null, 1, true, fund_role_id),
                    ('INVESTMENT_SETTINGS',         'FULL',  'Investment Settings',        'Investment Settings',        now(), null, now(), null, 1, true, fund_role_id),
                    ('REQUEST_IMA',                 'FULL',  'Request Ima',                'Request Ima',                now(), null, now(), null, 1, true, fund_role_id),
                    ('FUND_NAME',                   'READ',  'Fund Name',                  'Fund Name',                  now(), null, now(), null, 1, true, fund_role_id),
                    ('FUND_PURPOSE',                'READ',  'Fund Purpose',               'Fund Purpose',               now(), null, now(), null, 1, true, fund_role_id),
                    ('FUND_DETAILS',                'READ',  'Fund Details',               'Fund Details',               now(), null, now(), null, 1, true, fund_role_id),
                    ('CONTRIBUTION_SUMMARY',        'READ',  'Contribution Summary',       'Contribution Summary',       now(), null, now(), null, 1, true, fund_role_id),
                    ('DIVESTMENT_INSTRUCTIONS',     'FULL',  'Divestment Instructions',    'Divestment Instructions',    now(), null, now(), null, 1, true, fund_role_id);
            
            END;
            $$;
            
            DO
            LANGUAGE plpgsql $$
            DECLARE
            fund_role_id uuid := null;
            BEGIN
            
                INSERT INTO fund_role (name, enabled, created_on, created_by, updated_on, updated_by, version)
                VALUES ('Investment Manager', true, now(), null, now(), null, 1);
            
                fund_role_id := (SELECT id FROM fund_role WHERE name LIKE 'Investment Manager');
            
                INSERT INTO fund_permission (access_type,
                                             access_level,
                                             name,
                                             description,
                                             created_on,
                                             created_by,
                                             updated_on,
                                             updated_by,
                                             version,
                                             enabled,
                                             fund_role_id)
                    VALUES
                    ('DASHBOARD',                   'READ',  'Dashboard',                  'Dashboard',                  now(), null, now(), null, 1, true, fund_role_id),
                    ('ROLES_AND_PERMISSIONS',       'READ',  'Roles And Permissions',      'Roles And Permissions',      now(), null, now(), null, 1, true, fund_role_id),
                    ('LINK_DONOR_FUNDING_ACCOUNT',  'FULL',  'Link Donor Funding Account', 'Link Donor Funding Account', now(), null, now(), null, 1, true, fund_role_id),
                    ('INITIATE_CONTRIBUTION',       'FULL',  'Initiate Contribution',      'Initiate Contribution',      now(), null, now(), null, 1, true, fund_role_id),
                    ('CONTRIBUTION_DETAIL',         'READ',  'Contribution Detail',        'Contribution Detail',        now(), null, now(), null, 1, true, fund_role_id),
                    ('EXPORT_CONTRIBUTION_TABLE',   'FULL',  'Export Contribution Table',  'Export Contribution Table',  now(), null, now(), null, 1, true, fund_role_id),
                    ('FUND_TO_FUND_TRANSFERS',      'READ' , 'Fund to Fund Transfers',     'Fund to Fund Transfers',     now(), null, now(), null, 1, true, fund_role_id),
                    ('REALLOCATE_INVESTMENTS',      'FULL',  'Reallocate Investments',     'Reallocate Investments',     now(), null, now(), null, 1, true, fund_role_id),
                    ('REBALANCE_INVESTMENTS',       'FULL',  'Rebalance Investments',      'Rebalance Investments',      now(), null, now(), null, 1, true, fund_role_id),
                    ('TRANSACTION_DETAIL',          'READ',  'Transaction Detail',         'Transaction Detail',         now(), null, now(), null, 1, true, fund_role_id),
                    ('DOCUMENT_SETTINGS',           'READ',  'Document Settings',          'Document Settings',          now(), null, now(), null, 1, true, fund_role_id),
                    ('GRANT_DETAIL',                'READ',  'Grant Detail',               'Grant Detail',               now(), null, now(), null, 1, true, fund_role_id),
                    ('EXPORT_GRANT_TABLE',          'FULL',  'Export Grant Table',         'Export Grant Table',         now(), null, now(), null, 1, true, fund_role_id),
                    ('GRANT_NOW_CTA',               'NONE',  'Grant Now Cta',              'Grant Now Cta',              now(), null, now(), null, 1, true, fund_role_id),
                    ('LIQUIDATION_REQUESTS',        'FULL',  'Liquidation Requests',       'Liquidation Requests',       now(), null, now(), null, 1, true, fund_role_id),
                    ('RECOMMEND_A_GRANT',           'NONE',  'Recommend a Grant',          'Recommend a Grant',          now(), null, now(), null, 1, true, fund_role_id),
                    ('VIEW_GRANTS_DASHBOARD',       'READ',  'View Grants Dashboard',      'View Grants Dashboard',      now(), null, now(), null, 1, true, fund_role_id),
                    ('INVESTMENT_INSTRUCTIONS',     'FULL',  'Investment Instructions',    'Investment Instructions',    now(), null, now(), null, 1, true, fund_role_id),
                    ('INVESTMENT_SETTINGS',         'FULL',  'Investment Settings',        'Investment Settings',        now(), null, now(), null, 1, true, fund_role_id),
                    ('REQUEST_IMA',                 'FULL',  'Request Ima',                'Request Ima',                now(), null, now(), null, 1, true, fund_role_id),
                    ('FUND_NAME',                   'READ',  'Fund Name',                  'Fund Name',                  now(), null, now(), null, 1, true, fund_role_id),
                    ('FUND_PURPOSE',                'READ',  'Fund Purpose',               'Fund Purpose',               now(), null, now(), null, 1, true, fund_role_id),
                    ('FUND_DETAILS',                'READ',  'Fund Details',               'Fund Details',               now(), null, now(), null, 1, true, fund_role_id),
                    ('CONTRIBUTION_SUMMARY',        'READ',  'Contribution Summary',       'Contribution Summary',       now(), null, now(), null, 1, true, fund_role_id),
                    ('DIVESTMENT_INSTRUCTIONS',     'FULL',  'Divestment Instructions',    'Divestment Instructions',    now(), null, now(), null, 1, true, fund_role_id);
            
            END;
            $$;

            DO
            LANGUAGE plpgsql $$
            DECLARE
            fund_role_id uuid := null;
            BEGIN
            
                INSERT INTO fund_role (name, enabled, created_on, created_by, updated_on, updated_by, version)
                VALUES ('Read Only + Grants', true, now(), null, now(), null, 1);
            
                fund_role_id := (SELECT id FROM fund_role WHERE name LIKE 'Read Only + Grants');
            
                INSERT INTO fund_permission (access_type,
                                             access_level,
                                             name,
                                             description,
                                             created_on,
                                             created_by,
                                             updated_on,
                                             updated_by,
                                             version,
                                             enabled,
                                             fund_role_id)
                    VALUES
                    ('DASHBOARD',                   'READ',  'Dashboard',                  'Dashboard',                  now(), null, now(), null, 1, true, fund_role_id),
                    ('ROLES_AND_PERMISSIONS',       'READ',  'Roles And Permissions',      'Roles And Permissions',      now(), null, now(), null, 1, true, fund_role_id),
                    ('LINK_DONOR_FUNDING_ACCOUNT',  'FULL',  'Link Donor Funding Account', 'Link Donor Funding Account', now(), null, now(), null, 1, true, fund_role_id),
                    ('INITIATE_CONTRIBUTION',       'FULL',  'Initiate Contribution',      'Initiate Contribution',      now(), null, now(), null, 1, true, fund_role_id),
                    ('CONTRIBUTION_DETAIL',         'READ',  'Contribution Detail',        'Contribution Detail',        now(), null, now(), null, 1, true, fund_role_id),
                    ('EXPORT_CONTRIBUTION_TABLE',   'FULL',  'Export Contribution Table',  'Export Contribution Table',  now(), null, now(), null, 1, true, fund_role_id),
                    ('FUND_TO_FUND_TRANSFERS',      'READ' , 'Fund to Fund Transfers',     'Fund to Fund Transfers',     now(), null, now(), null, 1, true, fund_role_id),
                    ('REALLOCATE_INVESTMENTS',      'READ',  'Reallocate Investments',     'Reallocate Investments',     now(), null, now(), null, 1, true, fund_role_id),
                    ('REBALANCE_INVESTMENTS',       'READ',  'Rebalance Investments',      'Rebalance Investments',      now(), null, now(), null, 1, true, fund_role_id),
                    ('TRANSACTION_DETAIL',          'READ',  'Transaction Detail',         'Transaction Detail',         now(), null, now(), null, 1, true, fund_role_id),
                    ('DOCUMENT_SETTINGS',           'READ',  'Document Settings',          'Document Settings',          now(), null, now(), null, 1, true, fund_role_id),
                    ('GRANT_DETAIL',                'FULL',  'Grant Detail',               'Grant Detail',               now(), null, now(), null, 1, true, fund_role_id),
                    ('EXPORT_GRANT_TABLE',          'FULL',  'Export Grant Table',         'Export Grant Table',         now(), null, now(), null, 1, true, fund_role_id),
                    ('GRANT_NOW_CTA',               'FULL',  'Grant Now Cta',              'Grant Now Cta',              now(), null, now(), null, 1, true, fund_role_id),
                    ('LIQUIDATION_REQUESTS',        'NONE',  'Liquidation Requests',       'Liquidation Requests',       now(), null, now(), null, 1, true, fund_role_id),
                    ('RECOMMEND_A_GRANT',           'FULL',  'Recommend a Grant',          'Recommend a Grant',          now(), null, now(), null, 1, true, fund_role_id),
                    ('VIEW_GRANTS_DASHBOARD',       'FULL',  'View Grants Dashboard',      'View Grants Dashboard',      now(), null, now(), null, 1, true, fund_role_id),
                    ('INVESTMENT_INSTRUCTIONS',     'READ',  'Investment Instructions',    'Investment Instructions',    now(), null, now(), null, 1, true, fund_role_id),
                    ('INVESTMENT_SETTINGS',         'READ',  'Investment Settings',        'Investment Settings',        now(), null, now(), null, 1, true, fund_role_id),
                    ('REQUEST_IMA',                 'NONE',  'Request Ima',                'Request Ima',                now(), null, now(), null, 1, true, fund_role_id),
                    ('FUND_NAME',                   'READ',  'Fund Name',                  'Fund Name',                  now(), null, now(), null, 1, true, fund_role_id),
                    ('FUND_PURPOSE',                'READ',  'Fund Purpose',               'Fund Purpose',               now(), null, now(), null, 1, true, fund_role_id),
                    ('FUND_DETAILS',                'READ',  'Fund Details',               'Fund Details',               now(), null, now(), null, 1, true, fund_role_id),
                    ('CONTRIBUTION_SUMMARY',        'READ',  'Contribution Summary',       'Contribution Summary',       now(), null, now(), null, 1, true, fund_role_id),
                    ('DIVESTMENT_INSTRUCTIONS',     'READ',  'Divestment Instructions',    'Divestment Instructions',    now(), null, now(), null, 1, true, fund_role_id);
            
            END;
            $$;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/*sql */ `
                DO
                    LANGUAGE plpgsql $$
                    DECLARE _fund_role_id uuid := null;
                    BEGIN
                        _fund_role_id := (SELECT id FROM fund_role WHERE name LIKE 'Read Only + Investments');
                        DELETE FROM fund_permission WHERE fund_role_id = _fund_role_id;
                        DELETE FROM fund_role WHERE id = _fund_role_id;
                
                        _fund_role_id := (SELECT id FROM fund_role WHERE name LIKE 'Investment Manager');
                        DELETE FROM fund_permission WHERE fund_role_id = _fund_role_id;
                        DELETE FROM fund_role WHERE id = _fund_role_id;
                
                        _fund_role_id := (SELECT id FROM fund_role WHERE name LIKE 'Read Only + Grants');
                        DELETE FROM fund_permission WHERE fund_role_id = _fund_role_id;
                        DELETE FROM fund_role WHERE id = _fund_role_id;
                
                    END;
                $$;
        `);
    }
}
