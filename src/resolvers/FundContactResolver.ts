import { FundContact } from '../models/FundContact';
import { FundContactAddress } from '../models/FundContactAddress';
import { FundContactPhone } from '../models/FundContactPhone';
import { FundContactEmail } from '../models/FundContactEmail';
import { Resolver, FieldResolver, Ctx, Root, Arg, Int, Info } from 'type-graphql';
import { UtilityResolver } from '../graphql/core/UtilityResolver';
import { GraphQLContext } from '../context';
import { FundContactAddressOrderBy } from '../inputs/FundContact/FundContactAddressOrderBy';
import { FundContactAddressFilter } from '../inputs/FundContact/FundContactAddressFilter';
import { FundContactPhoneOrderBy } from '../inputs/FundContact/FundContactPhoneOrderBy';
import { FundContactPhoneFilter } from '../inputs/FundContact/FundContactPhoneFilter';
import { FundContactEmailOrderBy } from '../inputs/FundContact/FundContactEmailOrderBy';
import { FundContactEmailFilter } from '../inputs/FundContact/FundContactEmailFilter';

@Resolver(type => FundContact)
export class FundContactResolver extends UtilityResolver {
    // Primary fund contact address
    @FieldResolver(type => FundContactAddress)
    public async address(@Root() root: FundContact, @Ctx() context: GraphQLContext) {
        const repo = context.typeorm.getRepository(FundContactAddress);
        if (!root.addresses) {
            root.addresses = await repo.find({ fundContactId: root.id });
        }
        return root.addresses.find(address => address.isPrimary);
    }

    // All fund contact addresses
    @FieldResolver(type => [FundContactAddress])
    public async addresses(
        @Root() root: FundContact,
        @Ctx() context: GraphQLContext,
        @Info() info: any,
        @Arg('orderBy', { nullable: true })
        orderBy?: FundContactAddressOrderBy,
        @Arg('skip', type => Int, { nullable: true }) skip?: number,
        @Arg('take', type => Int, { nullable: true }) take?: number,
        @Arg('where', type => FundContactAddressFilter, { nullable: true })
        where?: FundContactAddressFilter
    ) {
        const repo = context.typeorm.getRepository(FundContactAddress);
        const builder = this.createQuery(
            repo,
            { ...where, fundContactId: root.id },
            orderBy,
            skip,
            take
        );
        const result = await builder.getMany();
        return result;
    }

    // Primary fund contact phone number
    @FieldResolver(type => FundContactPhone)
    public async phone(@Root() root: FundContact, @Ctx() context: GraphQLContext) {
        const repo = context.typeorm.getRepository(FundContactPhone);
        return repo.findOne({
            fundContactId: root.id,
            isPrimary: true
        });
    }

    // All primary fund phone numbers
    @FieldResolver(type => FundContactPhone)
    public async phones(
        @Root() root: FundContact,
        @Ctx() context: GraphQLContext,
        @Info() info: any,
        @Arg('orderBy', { nullable: true })
        orderBy?: FundContactPhoneOrderBy,
        @Arg('skip', type => Int, { nullable: true }) skip?: number,
        @Arg('take', type => Int, { nullable: true }) take?: number,
        @Arg('where', type => FundContactPhoneFilter, { nullable: true })
        where?: FundContactPhoneFilter
    ) {
        const repo = context.typeorm.getRepository(FundContactPhone);
        const builder = this.createQuery(
            repo,
            { ...where, fundContactId: root.id },
            orderBy,
            skip,
            take
        );
        const result = await builder.getMany();
        return result;
    }

    // Primary fund contact email
    @FieldResolver(type => FundContactEmail)
    public async email(@Root() root: FundContact, @Ctx() context: GraphQLContext) {
        const repo = context.typeorm.getRepository(FundContactEmail);
        return repo.findOne({
            fundContactId: root.id,
            isPrimary: true
        });
    }

    // All primary fund emails
    @FieldResolver(type => FundContactEmail)
    public async emails(
        @Root() root: FundContact,
        @Ctx() context: GraphQLContext,
        @Info() info: any,
        @Arg('orderBy', { nullable: true })
        orderBy?: FundContactEmailOrderBy,
        @Arg('skip', type => Int, { nullable: true }) skip?: number,
        @Arg('take', type => Int, { nullable: true }) take?: number,
        @Arg('where', type => FundContactEmailFilter, { nullable: true })
        where?: FundContactEmailFilter
    ) {
        const repo = context.typeorm.getRepository(FundContactEmail);
        const builder = this.createQuery(
            repo,
            { ...where, fundContactId: root.id },
            orderBy,
            skip,
            take
        );
        const result = await builder.getMany();
        return result;
    }
}
