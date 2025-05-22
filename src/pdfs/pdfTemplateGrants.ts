import dayjs from 'dayjs';
import { pdfTemplateCss, pdfTemplateLogo, pdfTemplateSignature } from './pdfTemplate';

export const pdfTemplateGrantsHeader = function(address) {
    const css = pdfTemplateCss();

    const addressTo = `
        ${address.name}<br />
        ${address.lineOne ? address.lineOne + '<br />' : ''}
        ${address.lineTwo ? address.lineTwo + '<br />' : ''}
        ${address.lineThree ? address.lineThree + '<br />' : ''}
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
            <div class="page page-grants">
                <div class="logo">
                    ${pdfTemplateLogo()}
                </div>
                <div class="inner-page">
                    <header>
                        <section class="addresses">
                            <div class="address-to">
                                ${addressTo}
                            </div>
                        </section>
                    </header>
    `;
};

export const pdfTemplateGrantsGreeting = function(paidOn, fundName, fundType) {
    const date = dayjs(paidOn).format('MMMM D, YYYY');

    return `
                    <section class="greeting">
                        <p class="greeting-date">${date}</p>
                        <p class="greeting-thank-you">We are pleased to have presented you with a grant from ${fundName}, a ${fundType} with The Signatry. Please note the following details about the grant:</p>
                    </section>
    `;
};

export const pdfTemplateGrantsTable = function(data) {
    let html = ` 
                    <table class="grants-table">
                        <tbody>
    `;

    for (let k in data) {
        if (data[k]) {
            html += `
                            <tr>
                                <td>${k}:</td>
                                <td>${data[k]}</td>
                            </tr>
            `;
        }
    }

    html += `
                        </tbody>
                    </table>
    `;

    return html;
};

export const pdfTemplateGrantsFooter = function(fundName, fundType, tenant) {
    return `
                    <p class="thank-you">We provided the donor(s) with a gift receipt when the gifts were made to the fund; therefore, it is not necessary to forward a receipt from your organization. Please use the full name of the
fund, ${fundName}, a ${fundType} of The Signatry, whenever you recognize your contributions.
                    </p>
                    <p class="thank-you">May God bless you as you carry out this important work. If you have any questions about this grant, please feel free to contact our donor care team at 913-310-0279.</p>
                    
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
                            <p>In accepting this grant, your organization acknowledges that it will use the funds for the exempt purpose indicated and that itis either a government entity or an IRS-designated 501(c)(3) publicly-supported charity in good standing with the IRS.Additionally, you acknowledge that this grant will not be used to pay a binding pledge or otherwise provide a private benefit.</p>
                        </section>
                        
                    </footer>
                </div>
                
                <footer class="address">
                    ${tenant.addressLineOne} | ${tenant.cityStateZip} | ${tenant.phone} | ${tenant.url ? '<a href="' + tenant.url + '">' + tenant.url + '</a>' : ''}
                </footer>
            </div>
        </body>
        </html>
    `;
};
