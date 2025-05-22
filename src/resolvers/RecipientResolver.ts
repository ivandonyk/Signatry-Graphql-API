import { RecipientEvent } from './../models/RecipientEvent';
import { RecipientCommentOrderBy } from './../inputs/RecipientComment/RecipientCommentOrderBy';
import { Recipient } from '../models/Recipient';

import { RecipientContact } from '../models/RecipientContact';
import { RecipientStatus } from '../models/RecipientStatus';
import { Resolver, FieldResolver, Ctx, Root, Arg, Int } from 'type-graphql';
import { UtilityResolver } from '../graphql/core/UtilityResolver';
import { GraphQLContext } from '../context';
import {
    FundTransactionInfo,
    TransactionRecurrence,
    Tag,
    Cause,
    RecipientBoardOfDirectorsMember,
    RecipientSocialMediaLinks,
    RecipientFinancials
} from '../models';
import { shuffleArray } from '../utilities/shuffleArray';
import { RecipientComment } from '../models/RecipientComment';
import { RecipientPreferredPayment } from '../models/RecipientPreferredPaymentType';

@Resolver(type => Recipient)
export class RecipientResolver extends UtilityResolver {
    // Recipient status
    @FieldResolver(type => RecipientStatus)
    public async recipientStatus(@Root() root: Recipient, @Ctx() context: GraphQLContext) {
        const repo = context.typeorm.getRepository(RecipientStatus);
        return repo.findOne(root.recipientStatusId);
    }

    // All recipient contacts
    @FieldResolver(type => RecipientContact)
    public async contacts(@Root() root: Recipient, @Ctx() context: GraphQLContext) {
        const repo = context.typeorm.getRepository(RecipientContact);
        return repo.find({ recipientId: root.id });
    }

    // Primary recipient contact
    @FieldResolver(type => RecipientContact)
    public async contact(@Root() root: Recipient, @Ctx() context: GraphQLContext) {
        const repo = context.typeorm.getRepository(RecipientContact);
        return repo.findOne({ recipientId: root.id, isPrimary: true });
    }

    @FieldResolver(type => [FundTransactionInfo])
    public async fundDestinations(@Root() root: Recipient, @Ctx() context: GraphQLContext) {
        return context.typeorm.getRepository(FundTransactionInfo).find({
            recipientId: root.id
        });
    }

    // Fund Recurrence
    @FieldResolver(type => TransactionRecurrence)
    public async transactionRecurrence(@Root() root: Recipient, @Ctx() context: GraphQLContext) {
        return context.typeorm.getRepository(TransactionRecurrence).findOne({
            recipientId: root.id
        });
    }

    // Tags
    @FieldResolver(type => [Tag])
    public async tags(@Root() root: Recipient, @Ctx() context: GraphQLContext) {
        return context.typeorm
            .createQueryBuilder(Tag, 'tag')
            .leftJoin('tag.recipients', 'recipient')
            .where('recipient.id = :id', { id: root.id })
            .getMany();
    }

    // Causes
    @FieldResolver(type => [Cause])
    public async causes(@Root() root: Recipient, @Ctx() context: GraphQLContext) {
        return context.typeorm
            .createQueryBuilder(Cause, 'cause')
            .leftJoin('cause.recipientCauses', 'recipientCause')
            .where('recipientCause.recipientId = :id', { id: root.id })
            .orderBy('recipientCause.ordinal', 'ASC')
            .getMany();
    }

    // Primary cause
    @FieldResolver(type => Cause)
    public async primaryCause(@Root() root: Recipient, @Ctx() context: GraphQLContext) {
        return context.typeorm
            .createQueryBuilder(Cause, 'primaryCause')
            .leftJoin('primaryCause.recipientCauses', 'recipientCause')
            .leftJoin('recipientCause.recipient', 'recipient')
            .where('recipient.id = :id', { id: root.id })
            .andWhere('recipientCause.isPrimary = true')
            .getOne();
    }

    @FieldResolver(type => [RecipientBoardOfDirectorsMember])
    public async boardOfDirectors(@Root() { id }: Recipient, @Ctx() { typeorm }: GraphQLContext) {
        return typeorm
            .createQueryBuilder(RecipientBoardOfDirectorsMember, 'boardMember')
            .where('boardMember.recipient.id = :id', { id })
            .getMany();
    }

    @FieldResolver(type => RecipientSocialMediaLinks)
    public socialMediaLinks(@Root() root: Recipient) {
        return {
            facebook: root.socialMediaLinks.find(link => link.includes('facebook')) || null,
            twitter: root.socialMediaLinks.find(link => link.includes('twitter')) || null,
            instagram: root.socialMediaLinks.find(link => link.includes('instagram')) || null
        };
    }

    @FieldResolver(type => RecipientFinancials)
    public async financials(@Root() root: Recipient, @Ctx() { typeorm }: GraphQLContext) {
        return await typeorm.manager
            .getRepository(RecipientFinancials)
            .findOne({ recipientId: root.id });
    }

    // Recipient events
    @FieldResolver(type => [RecipientEvent])
    public async recipientEvents(@Root() root: Recipient, @Ctx() context: GraphQLContext) {
        return context.typeorm.getRepository(RecipientEvent).find({
            recipientId: root.id
        });
    }

    // Recipient comments
    @FieldResolver(type => [RecipientComment])
    public async recipientComments(
        @Root() root: Recipient,
        @Ctx() context: GraphQLContext,
        @Arg('orderBy', { nullable: true }) orderBy?: RecipientCommentOrderBy,
        @Arg('skip', type => Int, { nullable: true }) skip?: number,
        @Arg('take', type => Int, { nullable: true }) take?: number
    ) {
        const conditions = {
            recipient: root.id
        };
        const repo = context.typeorm.getRepository(RecipientComment);
        return this.createQuery(repo, conditions, orderBy, skip, take).getMany();
    }

    @FieldResolver(type => [RecipientPreferredPayment])
    public async recipientPreferredPayments(
        @Root() root: Recipient,
        @Ctx() context: GraphQLContext
    ) {
        return context.typeorm.getRepository(RecipientPreferredPayment).find({
            recipientId: root.id
        });
    }

    // Photos
    @FieldResolver(type => [String])
    public async photos(@Root() root: Recipient, @Ctx() context: GraphQLContext) {
        const { manager } = context.typeorm;

        if (root.banner) return [root.banner];

        // return photos if exist (random order)
        if (root.photos.length) return shuffleArray(root.photos);

        // fall back to primary cause image
        const cause = await manager
            .createQueryBuilder(Cause, 'cause')
            .leftJoin('cause.recipientCauses', 'recipientCauses')
            .leftJoin('recipientCauses.recipient', 'recipient')
            .where('recipient.id = :id', { id: root.id })
            .andWhere('recipientCauses.isPrimary = true')
            .getOne();

        if (cause && cause.photo) {
            return [cause.photo];
        }

        return [];
    }
}
