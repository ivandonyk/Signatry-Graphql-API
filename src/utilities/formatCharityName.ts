import { titleCase } from 'title-case';

export default function formatCharityName(name = '') {
    return titleCase(name.toLowerCase())
        .replace(/\susa\s/i, ' USA ')
        .replace(/,?\s?inc\.?$/i, '');
}
