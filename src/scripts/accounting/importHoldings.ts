import { updateInstitutionAccountHoldings } from '../../cron/accounting/updateHoldings';

export async function importHoldings() {
    await updateInstitutionAccountHoldings();
}
