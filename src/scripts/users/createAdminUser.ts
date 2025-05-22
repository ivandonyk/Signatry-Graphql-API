import AWS from 'aws-sdk';
import { getOrCreateConnection } from '../../typeorm';
import { AppUser, UserProfile, Role, UserProfileRole } from '../../models';
import { RoleTypeValues } from '../../models/Role';

import minimist from 'minimist';

// get args
const argv = minimist(process.argv.slice(2));

// ensure email arg is defined
if (argv.email === undefined) {
    process.stdout.write(
        'You must specify an email address: "npm run create-admin-user -- --email <email>\n\n'
    );
    process.exit(1);
}

// ensure aws env vars are defined
['USERPOOL_ID', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_REGION'].forEach(prop => {
    if (process.env[prop] === undefined) {
        process.stdout.write(`Environment variable ${prop} is undefined\n\n`);
        process.exit(1);
    }
});

// get email, firstName, lastName args
const { email, firstName = 'Admin', lastName = 'User' } = argv;
// fallback values for env specific vars
const { ADMIN_USERNAME = 'admin', ADMIN_TEMPORARY_PASSWORD = 'Admin2020!' } = process.env;

// initialize cognito api
const cognitoIdSP = new AWS.CognitoIdentityServiceProvider();

const params = {
    UserPoolId: process.env.USERPOOL_ID,
    Username: ADMIN_USERNAME,
    DesiredDeliveryMediums: ['EMAIL'],
    ForceAliasCreation: false,
    TemporaryPassword: ADMIN_TEMPORARY_PASSWORD,
    UserAttributes: [
        {
            Name: 'email_verified',
            Value: 'true'
        },
        {
            Name: 'email',
            Value: email
        }
    ]
};

process.stdout.write(`Creating admin user "${firstName} ${lastName}" with email "${email}"\n\n`);

cognitoIdSP.adminCreateUser(params, async (err, data) => {
    if (err) {
        console.log(err, err.stack);
        process.exit(1);
    }

    const { User } = data;
    const { Attributes } = User;
    //creates typeorm connection
    const connection = await getOrCreateConnection();
    // finds the role
    const role = await connection.manager.findOne(Role, {
        name: RoleTypeValues.GLOBAL_ADMIN
    });
    // function to find inde for correct attribute
    const findIndex = (name: string) => Attributes.findIndex(x => x.Name === name);
    // instantiates new AppUser record
    const user = connection.manager.create(AppUser, {
        sub: Attributes[findIndex('sub')].Value,
        username: User.Username,
        emailAddress: Attributes[findIndex('email')].Value,
        enabled: true
    });
    // saves record
    const { id: appUserId } = await connection.manager.save(user);
    // instantiates UserProfile record
    const profile = connection.manager.create(UserProfile, {
        appUserId: appUserId,
        enabled: true,
        firstName: firstName,
        lastName: lastName
    });
    // saves record
    const { id: userProfileId } = await connection.manager.save(profile);
    // instantiates UserProfileRole
    const userProfileRole = connection.manager.create(UserProfileRole, {
        createdBy: userProfileId,
        updatedBy: userProfileId,
        userProfileId: userProfileId,
        roleId: role.id
    });
    // saves record
    await connection.manager.save(userProfileRole);

    process.stdout.write('Admin user created successfully\n\n');
    process.exit(0);
});
