import { getOrCreateConnection } from '../../typeorm';

(async () => {
    const connection = await getOrCreateConnection({ logging: true });
    const queryRunner = connection.createQueryRunner();

    const batchesUpdatedResult = await queryRunner.query(`
      update batch b set amount = (select sum(abs(amount)) from fund_transaction_detail where batch_id = b.id)
      where id in (
        select id from (
          select bh.id, bh.amount, x.detail_amount from batch bh
          inner join (
            select  b.id,  sum(abs(fd.amount)) as detail_amount from batch b
            join fund_transaction_detail fd on b.id = fd.batch_id
            group by b.id
          ) x on bh.id = x.id
        ) y
        where to_char(y.amount, '9999999999D99') <> to_char(y.detail_amount, '9999999999D99')
      );
    `);

    console.log('Batches updated: ', batchesUpdatedResult);
})();
