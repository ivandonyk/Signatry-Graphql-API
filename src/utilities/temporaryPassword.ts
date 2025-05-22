import crypto from 'crypto';
/**
 * Generates a temporary password.
 */

export function generateTemporaryPassword() {
    const lowerCaseString = crypto.randomBytes(Math.random() * 4 + 7).toString('hex');
    const specialCharacters = [
        '^',
        '$',
        '*',
        '[',
        ']',
        '{',
        '}',
        '(',
        ')',
        '?',
        '!',
        '@',
        '#',
        '%',
        '&',
        '/',
        '>',
        '<',
        ':',
        ';',
        '|',
        '_',
        '~'
    ];

    let password = '';

    let hasSpecial = false;
    let hasUpper = false;

    const stringArray = lowerCaseString.split('');

    stringArray.forEach((char, i) => {
        const rando = Math.random();
        if (!hasUpper) {
            const shouldUpper = rando > 0.5;
            if (shouldUpper && isNaN(parseInt(char))) {
                password = password.concat(char.toUpperCase());
                hasUpper = true;
            } else {
                password = password.concat(char);
            }
        } else {
            password = password.concat(char);
        }

        if (!hasSpecial) {
            if (rando > 0.8) {
                password = password.concat(
                    specialCharacters[Math.floor(Math.random() * specialCharacters.length)]
                );

                hasSpecial = true;
            }
        }
    });

    if (!hasSpecial) {
        password = password.concat(
            specialCharacters[Math.floor(Math.random() * specialCharacters.length)]
        );
    }

    if (!hasUpper) {
        for (let index = 0; index < stringArray.length; index++) {
            if (isNaN(parseInt(stringArray[index]))) {
                password = password.concat(stringArray[index].toUpperCase());
                break;
            }
        }
    }

    if (!/\d/.test(password)) {
        password = password.concat(Math.floor(Math.random() * 10).toString());
    }

    return password;
}
