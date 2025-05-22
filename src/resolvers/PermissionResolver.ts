import { Resolver } from 'type-graphql';
import { UtilityResolver } from '../graphql/core/UtilityResolver';
// import { GraphQLContext } from '../graphql/context';
import { Permission } from '../models';

@Resolver(type => Permission)
export class PermissionResolver extends UtilityResolver {}
