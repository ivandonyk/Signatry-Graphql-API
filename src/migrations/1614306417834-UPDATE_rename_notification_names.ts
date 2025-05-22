import { MigrationInterface, QueryRunner } from 'typeorm';

export class UPDATERenameNotificationNames1614306417834 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            UPDATE public.notification
            SET name = 'Reallocation completed'
            WHERE id = 'a9404462-293d-4451-8832-a59e6f5af592';
    
            UPDATE public.notification
            SET name = 'Insufficient funds'
            WHERE id = 'ba4b341f-0668-49fe-9106-6679b1bf5ee0';
            
            UPDATE public.notification
            SET name = 'Contribution created'
            WHERE id = '62b3bb95-87a2-4b72-88d9-5581b2283c8e';
            
            UPDATE public.notification
            SET name = 'Advisor request for funds transfer'
            WHERE id = 'c248174c-2fff-499c-8a0e-12821728dc49';
            
            UPDATE public.notification
            SET name = 'Recurring Grant request'
            WHERE id = '41be5f03-78e1-4453-848a-0a00feed2107';
            
            UPDATE public.notification
            SET name = 'Contribution edited'
            WHERE id = 'b6ab54dc-c587-4e02-a55e-230aba9bde56';
            
            UPDATE public.notification
            SET name = 'Grant cancelled'
            WHERE id = '174a41bd-2c51-4195-8118-88485daa0e5c';
            
            UPDATE public.notification
            SET name = 'Fund edited'
            WHERE id = '9b2393f7-565d-481e-8f67-7c2589bc5b2f';
            
            UPDATE public.notification
            SET name = 'Fund-to-fund transfer completed'
            WHERE id = 'ef8cc7ce-6e87-4fe0-af20-f0f4eea116dc';
            
            UPDATE public.notification
            SET name = 'Advisor confirmation of funds sent'
            WHERE id = '87b78da7-f8d5-4639-8f95-1939ba59cec0';
            
            UPDATE public.notification
            SET name = 'One-time Grant request'
            WHERE id = '026871b4-f2b5-49e7-8824-4031b7255d21';
            
            UPDATE public.notification
            SET name = 'Fund-to-fund transfer requested'
            WHERE id = 'ee321901-ea0d-4810-95fa-53f4327a609c';
            
            UPDATE public.notification
            SET name = 'Reallocation requested'
            WHERE id = '5672ab76-6d13-4814-9206-c07c5ffb1e21';
            
            UPDATE public.notification
            SET name = 'Grant edited'
            WHERE id = 'e00fbb11-4c1a-44f5-a3b4-f20a484e9ed6';
            
            UPDATE public.notification
            SET name = 'Contribution posted'
            WHERE id = '8549c939-d991-467d-98b7-6fb8f202cf01';
            
            UPDATE public.notification
            SET name = 'Successor(s) added/removed'
            WHERE id = '79470ee2-e00b-4eba-9dac-fe65f99829d8';
            
            UPDATE public.notification
            SET name = 'Grant paid'
            WHERE id = 'a4a1e1f1-5272-4dce-9153-a048f1cb15bc';
            
            UPDATE public.notification
            SET name = 'Role(s) added / removed'
            WHERE id = '894a81a6-0a1c-40d8-83a3-ab08a9ff48f8';
            
            UPDATE public.notification
            SET name = 'Grant on hold'
            WHERE id = 'be13aa04-8067-497a-9a2a-26187703091a';
            
            UPDATE public.notification
            SET name = 'Fund deleted'
            WHERE id = '5275c16c-e20e-4507-b8c4-d0c9b4b9a32e';
            
            UPDATE public.notification
            SET name = 'Fund created'
            WHERE id = 'a117b265-9a9c-416f-8b38-c4b5e4b1b24d';
            
            UPDATE public.notification
            SET name = 'Contribution cleared'
            WHERE id = '54924ff1-f434-4243-a286-92c810e1bf20';
            
            UPDATE public.notification
            SET name = 'Stock Gift received'
            WHERE id = 'c913b852-edb2-4651-9729-f660838dd800';
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            UPDATE notification SET name = 'Fund - Edited' WHERE id = '9b2393f7-565d-481e-8f67-7c2589bc5b2f';
            UPDATE notification SET name = 'Fund - Deleted' WHERE id = '5275c16c-e20e-4507-b8c4-d0c9b4b9a32e';
            UPDATE notification SET name = 'Fund - Role(s) Added/Removed' WHERE id = '894a81a6-0a1c-40d8-83a3-ab08a9ff48f8';
            UPDATE notification SET name = 'Fund - Successor(s) Added/Removed' WHERE id = '79470ee2-e00b-4eba-9dac-fe65f99829d8';
            UPDATE notification SET name = 'Contribution - Created' WHERE id = '62b3bb95-87a2-4b72-88d9-5581b2283c8e';
            UPDATE notification SET name = 'Contribution - Posted' WHERE id = '8549c939-d991-467d-98b7-6fb8f202cf01';
            UPDATE notification SET name = 'Contribution - Cleared' WHERE id = '54924ff1-f434-4243-a286-92c810e1bf20';
            UPDATE notification SET name = 'Contribution - Edited' WHERE id = 'b6ab54dc-c587-4e02-a55e-230aba9bde56';
            UPDATE notification SET name = 'Contribution - Stock Gift Received' WHERE id = 'c913b852-edb2-4651-9729-f660838dd800';
            UPDATE notification SET name = 'Grant - One-Time Request' WHERE id = '026871b4-f2b5-49e7-8824-4031b7255d21';
            UPDATE notification SET name = 'Grant - Recurring Request' WHERE id = '41be5f03-78e1-4453-848a-0a00feed2107';
            UPDATE notification SET name = 'Grant - Paid' WHERE id = 'a4a1e1f1-5272-4dce-9153-a048f1cb15bc';
            UPDATE notification SET name = 'Grant - Edited' WHERE id = 'e00fbb11-4c1a-44f5-a3b4-f20a484e9ed6';
            UPDATE notification SET name = 'Grant - Cancelled' WHERE id = '174a41bd-2c51-4195-8118-88485daa0e5c';
            UPDATE notification SET name = 'Grant - On Hold' WHERE id = 'be13aa04-8067-497a-9a2a-26187703091a';
            UPDATE notification SET name = 'Grant - Insufficient Funds' WHERE id = 'ba4b341f-0668-49fe-9106-6679b1bf5ee0';
            UPDATE notification SET name = 'Transaction - Fund-to-Fund Transfer Request' WHERE id = 'ee321901-ea0d-4810-95fa-53f4327a609c';
            UPDATE notification SET name = 'Transaction - Fund-to-Fund Transfer Completed' WHERE id = 'ef8cc7ce-6e87-4fe0-af20-f0f4eea116dc';
            UPDATE notification SET name = 'Investment - Reallocation Requested' WHERE id = '5672ab76-6d13-4814-9206-c07c5ffb1e21';
            UPDATE notification SET name = 'Investment - Reallocation Completed' WHERE id = 'a9404462-293d-4451-8832-a59e6f5af592';
            UPDATE notification SET name = 'Money Manager - Advisor Confirmation of Funds Sent' WHERE id = '87b78da7-f8d5-4639-8f95-1939ba59cec0';
            UPDATE notification SET name = 'Money Manager - Advisor Request for Funds Transfer' WHERE id = 'c248174c-2fff-499c-8a0e-12821728dc49';
            UPDATE notification SET name = 'Fund - Created' WHERE id = 'a117b265-9a9c-416f-8b38-c4b5e4b1b24d';
        `);
    }
}
