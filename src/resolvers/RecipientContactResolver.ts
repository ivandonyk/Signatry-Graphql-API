import { Recipient } from '../models/Recipient';
import { RecipientContact } from '../models/RecipientContact';
import { RecipientContactAddress } from '../models/RecipientContactAddress';
import { RecipientContactPhone } from '../models/RecipientContactPhone';
import { RecipientContactEmail } from '../models/RecipientContactEmail';
import { Resolver, FieldResolver, Query, Ctx, Root } from 'type-graphql';
import { UtilityResolver } from '../graphql/core/UtilityResolver';
import { GraphQLContext } from '../context';

@Resolver(type => RecipientContact)
export class RecipientContactResolver extends UtilityResolver {
    // Primary recipient contact address
    @FieldResolver(type => RecipientContactAddress)
    public async primaryAddress(@Root() root: RecipientContact, @Ctx() context: GraphQLContext) {
        const repo = context.typeorm.getRepository(RecipientContactAddress);
        return repo.findOne({
            recipientContactId: root.id,
            isPrimary: true
        });
    }

    // All recipient contact addresses
    @FieldResolver(type => RecipientContactAddress)
    public async addresses(@Root() root: RecipientContact, @Ctx() context: GraphQLContext) {
        const repo = context.typeorm.getRepository(RecipientContactAddress);
        const addresses = await repo.find({
            recipientContactId: root.id
        });
        return addresses;
    }

    // Donation Address
    @FieldResolver(type => RecipientContactAddress)
    public async donationAddress(
        @Root() { id }: RecipientContactAddress,
        @Ctx() { typeorm }: GraphQLContext
    ) {
        const repo = typeorm.getRepository(RecipientContactAddress);
        return await repo.findOne({
            recipientContactId: id,
            isDonationAddress: true
        });
    }

    // Primary recipient contact phone number
    @FieldResolver(type => RecipientContactPhone)
    public async primaryPhone(@Root() root: RecipientContact, @Ctx() context: GraphQLContext) {
        const repo = context.typeorm.getRepository(RecipientContactPhone);
        return repo.findOne({
            recipientContactId: root.id,
            isPrimary: true
        });
    }

    // All primary recipient phone numbers
    @FieldResolver(type => RecipientContactPhone)
    public async phones(@Root() root: RecipientContact, @Ctx() context: GraphQLContext) {
        const repo = context.typeorm.getRepository(RecipientContactPhone);
        return repo.find({
            recipientContactId: root.id
        });
    }

    // Primary recipient contact email
    @FieldResolver(type => RecipientContactEmail)
    public async primaryEmail(@Root() root: RecipientContact, @Ctx() context: GraphQLContext) {
        const repo = context.typeorm.getRepository(RecipientContactEmail);
        return repo.findOne({
            recipientContactId: root.id,
            isPrimary: true
        });
    }

    // All primary recipient emails
    @FieldResolver(type => RecipientContactEmail)
    public async emails(@Root() root: RecipientContact, @Ctx() context: GraphQLContext) {
        const repo = context.typeorm.getRepository(RecipientContactEmail);
        return repo.find({
            recipientContactId: root.id
        });
    }
}
