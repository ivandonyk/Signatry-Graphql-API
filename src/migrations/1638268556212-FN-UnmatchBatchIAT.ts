import { MigrationInterface, QueryRunner } from 'typeorm';

export class FNUnmatchBatchIAT1638268556212 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/*sql*/ `
            CREATE OR REPLACE function unmatch_batch_iat(_transaction_id varchar, _ignored boolean) returns void
                    language plpgsql
                as
                $$
                DECLARE
                    _batch_id uuid;
                    _gl_account_id uuid;
                    _destination_id uuid;
                    _source_id uuid;
                    _destination_not_required boolean;
                    _destination_posted boolean;
                    _destination_posted_on date;
                    _source_not_required boolean;
                    _source_posted boolean;
                    _source_posted_on date;
                    _posted_on date;
                    _batch_status varchar;
                    temprow record;
                BEGIN
                    SELECT batch_id INTO _batch_id FROM institution_account_transaction WHERE transaction_id = _transaction_id;
                
                    SELECT gl.id INTO _gl_account_id
                    FROM institution_account_transaction iat
                             INNER JOIN institution_account ia ON ia.id = iat.institution_account_id
                             INNER JOIN gl_account gl ON gl.id = ia.gl_account_id
                    WHERE iat.transaction_id = _transaction_id;
                
                    SELECT
                        destination_glaccount_id,
                        source_glaccount_id,
                        destination_info ->> 'notRequired',
                        destination_info ->> 'posted',
                        destination_info ->> 'postedOn',
                        source_info ->> 'notRequired',
                        source_info ->> 'posted',
                        source_info ->> 'postedOn',
                        status
                    INTO
                        _destination_id,
                        _source_id,
                        _destination_not_required,
                        _destination_posted,
                        _destination_posted_on,
                        _source_not_required,
                        _source_posted,
                        _source_posted_on,
                        _batch_status
                    FROM batch WHERE id = _batch_id;
                
                    -- null cleared_on
                    UPDATE batch SET cleared_on = NULL,posted_on=NULL WHERE id = _batch_id;
                
                    -- update metadata
                    IF _gl_account_id = _destination_id THEN
                        UPDATE batch SET destination_info = destination_info::jsonb - 'posted' WHERE id = _batch_id;
                        UPDATE batch SET destination_info = destination_info::jsonb - 'postedBy' WHERE id = _batch_id;
                        UPDATE batch SET destination_info = destination_info::jsonb - 'postedOn' WHERE id = _batch_id;
                        _posted_on = _destination_posted_on;
                    ELSIF _gl_account_id = _source_id THEN
                        UPDATE batch SET source_info = source_info::jsonb - 'posted' WHERE id = _batch_id;
                        UPDATE batch SET source_info = source_info::jsonb - 'postedBy' WHERE id = _batch_id;
                        UPDATE batch SET source_info = source_info::jsonb - 'postedOn' WHERE id = _batch_id;
                        _posted_on = _source_posted_on;
                    END IF;
                
                    -- status updates
                    IF _batch_status = 'PARTIAL' THEN
                        UPDATE batch SET status = 'PENDING' WHERE id = _batch_id;
                    ELSEIF _batch_status = 'POSTED' AND (_source_not_required = true OR _destination_not_required = true) THEN
                        UPDATE batch SET status = 'PENDING' WHERE id = _batch_id;
                    ELSEIF (_source_posted = true OR _destination_posted = true) THEN
                        UPDATE batch SET status = 'PARTIAL' WHERE id = _batch_id;
                    end if;
                
                    -- update pool investment holding market value
                    IF _posted_on IS NOT NULL THEN
                        FOR temprow IN
                            SELECT ia.gl_account_id, b.source_glaccount_id,b.destination_glaccount_id,
                                   pih.market_value,pih.units,ftd.amount,pih.id as pihid,ftd.id as ftdid
                            FROM fund_transaction_detail as ftd
                                     INNER JOIN batch b on b.id = ftd.batch_id
                                     INNER JOIN institution_account_transaction iat on b.id = iat.batch_id
                                     INNER JOIN institution_account ia on iat.institution_account_id = ia.id
                                     INNER JOIN investment i on ia.id = i.institution_account_id
                                     INNER JOIN fund_investment fi on i.id = fi.investment_id
                                     INNER JOIN pool_investment_holding pih on fi.id = pih.fund_investment_id
                            WHERE i.investment_type != 'IMA' AND
                                    ftd.fund_investment_id = fi.id AND
                                    pih.date >= _posted_on AND
                                    b.id = _batch_id
                            LOOP
                                if temprow.source_glaccount_id = temprow.gl_account_id THEN
                                    UPDATE pool_investment_holding SET
                                                                       market_value = (market_value + temprow.amount),
                                                                       units = (units + temprow.units)
                                    WHERE id = temprow.pihid;
                                ELSEIF temprow.destination_glaccount_id = temprow.gl_account_id THEN
                                    UPDATE pool_investment_holding
                                    SET market_value = (market_value - temprow.amount), units = (units - temprow.units)
                                    WHERE id = temprow.pihid;
                                end if;
                                -- Update transaction detail
                                UPDATE fund_transaction_detail SET transaction_detail_status_id = (SELECT id FROM transaction_detail_status WHERE name = 'PENDING_RECONCILIATION') WHERE id = temprow.ftdid ;
                            END LOOP;
                    END IF;
                    -- null FK
                    UPDATE institution_account_transaction SET batch_id = null,gl_account_reconciliation_id =null,is_ignored=_ignored WHERE transaction_id = _transaction_id;
                
                END;
                $$; 
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/*sql*/ `
            DROP FUNCTION IF EXISTS unmatch_batch_iat;
        `);
    }
}
