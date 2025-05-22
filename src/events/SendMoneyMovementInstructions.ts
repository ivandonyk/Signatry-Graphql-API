import { getOrCreateConnection } from '../typeorm';
import { Batch, InstitutionAccount } from '../models';
import { EmailService } from '../sendgrid';
import { MoneyMovementInstructionsInput } from '../inputs/Batch/MoneyMovementInstructionsInput';
import { InvestmentType } from '../models/Investment';

export async function SendMoneyMovementInstructionsListener(batchIds: string[]) {
    const connection = await getOrCreateConnection();
    const manager = connection.createEntityManager();
    const batchRepo = manager.getRepository(Batch);

    async function sendMoneyMovementInstructions(ids: string[]): Promise<Batch[]> {
        const batches = await batchRepo.findByIds(ids, {
            relations: [
                'transactions',
                'transactions.fundInvestment',
                'transactions.fundInvestment.fund',
                'transactions.fundInvestment.investment',
                'sourceGLAccount',
                'sourceGLAccount.institutionAccount'
            ]
        });

        // get all institution_acct_ids from source
        const sourceInstitutionAccountIds = new Set();
        batches.forEach(batch =>
            sourceInstitutionAccountIds.add(batch.sourceGLAccount.institutionAccount.id)
        );

        // pull out the FA's for these institution_acct_ids
        const instutionFAs = await manager
            .getRepository(InstitutionAccount)
            .createQueryBuilder('institution_account')
            .leftJoin('institution_account.financialAdvisors', 'financialAdvisors')
            .select(['institution_account.id', 'financialAdvisors.id', 'financialAdvisors.email'])
            .where('institution_account.id IN (:...ids)', {
                ids: Array.from(sourceInstitutionAccountIds)
            })
            .andWhere('financialAdvisors.receivesInstructions = true')
            .getMany();

        const faForInstitutionAccountIdMap = {}; // InstitutionAccountId => [email1, email2, email3]
        instutionFAs.forEach(iAccount => {
            if (iAccount.financialAdvisors) {
                const emails = iAccount.financialAdvisors.map(fa => fa.email);
                faForInstitutionAccountIdMap[iAccount.id] = emails;
            }
        });

        const emailPromises = [];
        for await (const batch of batches) {
            // send emails
            const emailService = new EmailService();

            const isIMA = batch.transactions.some(
                trans => trans.fundInvestment.investment.investmentType === InvestmentType.IMA
            );

            const fundName = batch.transactions[0].fundInvestment.fund.name;

            // FA's for this institution_acct_id
            const financialAdvisorEmails =
                faForInstitutionAccountIdMap[batch.sourceGLAccount.institutionAccount.id];

            for (const faEmail of financialAdvisorEmails) {
                const emailData: MoneyMovementInstructionsInput = {
                    batchId: batch.id,
                    accountName: isIMA ? fundName : batch.sourceGLAccount.title.replace(/_/g, ' '),
                    toEmail: faEmail,
                    isIMA
                };

                if (process.env.NODE_ENV !== 'development' && faEmail) {
                    await emailService.sendMoneyMovementInstructions(manager, emailData);
                }
            }
        }

        // wait till all the email have been sent
        return batches;
    }

    await sendMoneyMovementInstructions(batchIds);
}
