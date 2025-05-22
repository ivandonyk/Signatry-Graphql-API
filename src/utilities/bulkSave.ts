import { InsertResult, Repository, UpdateResult } from 'typeorm';

interface Counts {
    successCount: number;
    errorCount: number;
}

export const bulkSave = async <Entity>(
    records: any[],
    repo: Repository<Entity>,
    action: 'insert' | 'save',
    async: boolean
): Promise<Counts> => {
    let results: PromiseSettledResult<InsertResult | UpdateResult>[] = [];

    // pretty much just mimic the results of promise.allSettled
    const handleResponse = (res: InsertResult | UpdateResult) => {
        return results.push({ status: 'fulfilled', value: res });
    };
    const handleError = (err: any) => results.push({ status: 'rejected', reason: err });

    // asynchronously
    if (async) {
        try {
            results = await Promise.allSettled(
                records.map(insert => {
                    if (action === 'insert') return repo.insert(insert);
                    else return repo.save(insert);
                })
            );
        } catch (error) {
            console.log('failing on bulkInsert: ', error);
        }
    }
    // synchronously
    else {
        for await (const record of records) {
            if (action == 'insert') {
                await repo
                    .insert(record)
                    .then(handleResponse)
                    .catch(handleError);
            } else {
                await repo
                    .save(record)
                    .then(handleResponse)
                    .catch(handleError);
            }
        }
    }

    // find count of success and failures
    return results.reduce(
        (acc: Counts, result) => {
            // unsure if there are any other status, but play it safe
            if (result.status === 'fulfilled') acc.successCount = ++acc.successCount;
            else if (result.status === 'rejected') acc.errorCount = ++acc.errorCount;
            return acc;
        },
        { errorCount: 0, successCount: 0 }
    );
};
