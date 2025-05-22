import faker from 'faker';
import { getOrCreateConnection } from '../../typeorm';

(async () => {
    const connection = await getOrCreateConnection({ logging: true });
    const queryRunner = connection.createQueryRunner();

    const recipients = await queryRunner.query('SELECT * FROM recipient;');

    await Promise.all(
        recipients.map(async recipient => {
            // Financials
            await queryRunner.query(`INSERT INTO recipient_financials(
              recipient_id,
              most_recent_financials_year,
              total_revenue,
              total_assets,
              total_expenses,
              irs_filings_link,
              full_financial_report_link
              ) VALUES (
                '${recipient.id}',
                2019,
                123456789,
                123456,
                123456,
                'https://guidestar.org',
                'https://guidestar.org'
                ) RETURNING * ;`);

            // Board Members
            const boardMembers = Array.from(Array(20));
            await Promise.all(
                boardMembers.map(async member => {
                    return await queryRunner.query(`INSERT INTO recipient_board_of_directors_member(
                            recipient_id,
                            name,
                            title,
                            company,
                            is_primary
                            ) VALUES (
                                '${recipient.id}',
                                '${faker.name.findName().replace(/'/g, "''")}',
                                '${faker.name.jobDescriptor().replace(/'/g, "''")}',
                                '${faker.company.companyName().replace(/'/g, "''")}',
                                'FALSE'
                            ) RETURNING *`);
                })
            );

            // Employees count
            const count = 150;
            await queryRunner.query(
                `UPDATE "recipient" SET "number_of_employees" = ${count} WHERE "id" = '${recipient.id}';`
            );

            // Keywords
            const keywords = `"social investment","education","health","human rights","participatory development","culture","philanthropy","relief","services"
                `;
            await queryRunner.query(
                `UPDATE recipient SET keywords = '{${keywords}}' WHERE id = '${recipient.id}'`
            );

            // Social Media Links
            const links = '"https://twitter.com", "facebook.com", "https://instagram.com"'; // Purposefully mirrored the inconsistency of provided protocols in the API
            await queryRunner.query(
                `UPDATE recipient SET social_media_links = '{${links}}' WHERE id = '${recipient.id}'`
            );
        })
    ).then(() => process.exit(0));
})();
