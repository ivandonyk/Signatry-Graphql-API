import { Resolver, Ctx, Mutation, Arg } from 'type-graphql';
import { GraphQLContext } from '../context';
import { UtilityResolver } from './core/UtilityResolver';

@Resolver()
export class LoggingResolver extends UtilityResolver{
    @Mutation(type => Boolean)
    public async logEvent(
        @Ctx() context: GraphQLContext, 
        @Arg('eventName', type => String) eventName: string,
        @Arg('timestamp', type => Date) timestamp: Date,
        @Arg('message', type => String) message: string
    ): Promise<Boolean> {
        const { profile } = await this.getPotentiallyImpersonatedProfile(context);
        console.log(`${timestamp} - User: ${profile.firstName} ${profile.lastName} ${profile.userCode} - ${eventName}: ${message}`);
        return true;
    }
}
