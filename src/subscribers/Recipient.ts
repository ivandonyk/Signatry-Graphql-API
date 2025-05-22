import { EventSubscriber, EntitySubscriberInterface, UpdateEvent, In } from 'typeorm';
import { Recipient } from '../models/Recipient';
import { FundTransaction } from '../models/FundTransaction';
import { FundTransactionInfo } from '../models/FundTransactionInfo';
import { TransactionStatusValue } from '../models/TransactionStatus';
import { grantUtil } from '../utilities/grant';

@EventSubscriber()
export class RecipientSubscriber implements EntitySubscriberInterface<Recipient> {
    /**
     * Listen to events on Recipient entities
     */
    listenTo() {
        return Recipient;
    }

    /**
     * After update
     * @param event
     */
    async afterUpdate(event: UpdateEvent<Recipient>) {
        const { entity: recipient, manager, updatedRelations } = event;

        /**
         * If recipientStatus has changed, execute the fund transaction update hooks
         */
        if (updatedRelations.find(relation => relation.propertyPath === 'recipientStatus')) {
            // get all transaction destinations with this recipient
            const destinations = await manager
                .getRepository(FundTransactionInfo)
                .find({ recipientId: recipient.id });

            // Return early if no destinations exist (i.e., the Recipient's status is being updated outside the context of Grant Management and no grants to the recipient exist, such as from /admin/recipients)
            if (!destinations.length) return;

            // get all transactions associated with these destinations
            const grants = await manager
                .getRepository(FundTransaction)
                .createQueryBuilder('fundTransaction')
                .innerJoinAndSelect('fundTransaction.transactionStatus', 'transactionStatus')
                .where('fundTransaction.id IN (:...transactionIds)', {
                    transactionIds: destinations.map(d => d.fundTransactionId)
                })
                .andWhere('transactionStatus.name NOT IN (:...statusNames)', {
                    statusNames: [TransactionStatusValue.COMPLETE, TransactionStatusValue.CANCELED]
                })
                .andWhere('fundTransaction.isHistoric = FALSE')
                .getMany();

            // execute the transaction update hooks for each transaction
            for (const grant of grants) {
                await grantUtil.saveGrant(manager, grant, null);
            }
        }
    }
}
