import GuidestarClient from '../../guidestar/client';
import { getOrCreateConnection } from '../../typeorm';

const client = new GuidestarClient();

(async () => {
    const connection = await getOrCreateConnection();
    const queryRunner = connection.createQueryRunner();

    const recipients = await connection.manager.queryRunner.query('SELECT * FROM recipient;');
    await Promise.all(
        recipients.map(async recipient => {
            const data = await client.getCharityData(recipient.ein);

            if (!data) return;

            const fullFinancialReportStatement = data.financials.financial_statements?.find(
                statement =>
                    parseInt(statement.fiscal_year_end) ===
                    data.financials.most_recent_year_financials.fiscal_year
            );

            // Get the statement with the same year as the most recent financials year, if it exists
            let fullFinancialReportLink = null;
            if (fullFinancialReportStatement)
                fullFinancialReportLink = fullFinancialReportStatement.document_url;

            // Get the Form 990 document with the same year as the most recent financials year, if it exists
            const irsFilingsDocument = data.financials.financial_documents?.find(
                doc =>
                    parseInt(doc.form990_year) ===
                    data.financials.most_recent_year_financials.fiscal_year
            );

            let irsFilingsLink = null;
            if (irsFilingsDocument) irsFilingsLink = irsFilingsDocument.form990_url;

            const boardMembers = data.operations.board_of_directors;
            const principalBoardMemberName = data.operations.board_chair_name;
            const count = data.operations.no_of_employees;
            const keywords = data.summary.keywords
                .split(', ')
                .map(str => str.replace(/(.+)/, '"$1", '))
                .join('');
            const socialMediaLinks = data.summary.social_media_urls
                .filter(
                    (url: string) =>
                        url.includes('facebook') ||
                        url.includes('instagram') ||
                        url.includes('twitter')
                )
                .map(str => str.replace(/(.+)/, '"$1", '))
                .join('');

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
                        ${
                            data.financials.most_recent_year_financials.fiscal_year
                                ? data.financials.most_recent_year_financials.fiscal_year
                                : null
                        },
                        ${
                            data.financials.most_recent_year_financials.total_revenue
                                ? data.financials.most_recent_year_financials.total_revenue
                                : null
                        },
                        ${
                            data.financials.most_recent_year_financials.assets_total
                                ? data.financials.most_recent_year_financials.assets_total
                                : null
                        },
                        ${
                            data.financials.most_recent_year_financials.expenses_total
                                ? data.financials.most_recent_year_financials.expenses_total
                                : null
                        },
                        '${irsFilingsLink}',
                        '${fullFinancialReportLink}'
                    ) RETURNING * ;`);

            boardMembers.map(async member => {
                return await queryRunner.query(`INSERT INTO recipient_board_of_directors_member(
                        recipient_id,
                        name,
                        title,
                        company,
                        is_primary
                        ) VALUES (
                            '${recipient.id}',
                            '${
                                member.name === '' || member.name === null || member.name === ' '
                                    ? null
                                    : member.name.replace("'", "''")
                            }',
                            '${
                                member.title === '' || member.title === null || member.title === ' '
                                    ? null
                                    : member.title.replace("'", "''")
                            }',
                            '${
                                member.company === '' ||
                                member.company === null ||
                                member.company === ' '
                                    ? null
                                    : member.company.replace("'", "''")
                            }',
                            ${
                                !!principalBoardMemberName &&
                                member.name === principalBoardMemberName
                                    ? 'TRUE'
                                    : 'FALSE'
                            }
                        ) RETURNING *`);
            });

            await queryRunner.query(
                `UPDATE "recipient" SET "number_of_employees" = ${count} WHERE "id" = '${recipient.id}';`
            );

            await queryRunner.query(
                `UPDATE recipient SET keywords = '{${keywords}}' WHERE id = '${recipient.id}'`
            );

            await queryRunner.query(
                `UPDATE recipient SET social_media_links = '{${socialMediaLinks}}' WHERE id = '${recipient.id}'`
            );
        })
    ).then(() => process.exit(0));
})();
