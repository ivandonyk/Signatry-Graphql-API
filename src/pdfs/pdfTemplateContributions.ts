import { formatMoney } from './pdfUtilities';
import dayjs from 'dayjs';
import { pdfTemplateCss, pdfTemplateLogo, pdfTemplateSignature } from './pdfTemplate';

export const pdfTemplateContributionsHeader = function(address) {
    const css = pdfTemplateCss();

    const addressTo = `
        ${address.name}<br />
        ${address.lineOne ? address.lineOne + '<br />' : ''}
        ${address.lineTwo ? address.lineTwo + '<br />' : ''}
        ${address.lineThree ? '33' + address.lineThree + '33<br />' : ''}
        ${address.city}, ${address.state} ${address.postalCode}<br />
    `;

    return `
        <!doctype html>
        <html>
        <head>
            <meta charset="utf-8">
            <title></title>
            ${css}
        </head>
        <body>
            <div class="page page-contributions">
                <div class="logo">
                    ${pdfTemplateLogo()}
                </div>
                <div class="inner-page">
                    <header>
                        <section class="addresses">
                            <div class="address-to">
                                ${addressTo}
                            </div>
                            <div class="address-from">
                                7171 W 95th St., Suite 501<br />
                                Overland Park, KS  66212<br />
                                <a href="tel:913-310-0279">(913) 310-0279</a>
                            </div>
                        </section>
                    </header>
    `;
};

export const pdfTemplateContributionsGreeting = function(createdOn, fundName, fundCreatedBy, fundCode ) {
    //const date = formatDate(createdOn);
    const date = dayjs(createdOn).format('MMMM D, YYYY');

    return `
                    <section class="greeting">
                        <p class="greeting-date">${date}</p>
                        <p class="greeting-reference">Reference: ${fundName}</p>
                        <p class="greeting-dear">Dear ${fundCreatedBy}:</p>
                        <p class="greeting-thank-you">Thank you for your contribution to The Signatry. Your contribution has been credited to ${fundName} ${fundCode ?? '(' + fundCode + ')'}. For your records, below are the details of your gift:</p>
                    </section>
    `;
};

export const pdfTemplateContributionsTable = function(data) {
    let total = 0;
    let html = ` 
                    <table class="contributions-table">
                        <thead>
                            <th>Date Received</th>
                            <th>Asset</th>
                            <th>Value</th>
                        </thead>
                        <tbody>
    `;

    data.forEach(row => {
        console.log(row);
        html += `
                            <tr>
                                <td>${dayjs(row.date).format('MM/DD/YYYY')}</td>
                                <td>${row.asset}</td>
                                <td>${formatMoney(row.value)}</td>
                            </tr>
        `;

        total += row.value;
    });

    html += `
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colspan="2">Total value of assets contributed:</td>
                                <td>${formatMoney(total)}</td>
                            </tr>
                        </tfoot>
                    </table>
    `;

    return html;
};

export const pdfTemplateContributionsFooter = function() {
    return `
                    <p class="thank-you">Thank you for joining with The Signatry in fulfilling the Great Commission by empowering ministries. You can find out more about recommending grants or gifting other types of assets at <a href="https://thesignatry.com/">thesignatry.com</a>. Please call us with any questions at 913-310-0279 and we will be glad to assist you.</p>
                    
                    <footer>
                        <p>In His Service,</p>
                        <div class="signature">
                            ${pdfTemplateSignature()}
                        </div>
                        <br />
                        <p>
                            Stephen French<br />
                            Chief Executive Officer
                        </p>
                        <section class="fine-print">
                            <p>Your gift may have tax implications associated with it, so we recommend that you discuss it with your tax advisors. The Signatry did not provide any goods or services to you in consideration for your contribution, and The Signatry has exclusive legal control over the contribution.</p>
                            <p>The Signatry is recognized by the Internal Revenue Service as a tax-exempt organization under section 501c3 of the Internal Revenue Code. The Signatry’s Tax ID is 43-1890105.</p>
                        </section>
                    </footer>
                </div>
            </div>
        </body>
        </html>
    `;
};
