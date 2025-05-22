import { UserProfile } from './UserProfile';
import { Fund } from './Fund';
import { FundRole } from './FundRole';
import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    VersionColumn,
    JoinColumn,
    OneToMany,
    ManyToOne,
    ManyToMany
} from 'typeorm';
import { ObjectType, Field, Int, Float } from 'type-graphql';
import { FundRelationship } from './FundRelationship';

@Entity()
@ObjectType()
export class FundUserProfile {
    @PrimaryGeneratedColumn('uuid')
    @Field()
    id: string;

    @CreateDateColumn({ default: () => 'CURRENT_TIMESTAMP' })
    @Field()
    createdOn: Date;

    @UpdateDateColumn({ default: () => 'CURRENT_TIMESTAMP' })
    @Field()
    updatedOn: Date;

    @VersionColumn({ default: 1 })
    @Field()
    version: number;

    @ManyToOne(
        type => UserProfile,
        inverse => inverse.fundUserProfiles
    )
    @Field(type => UserProfile, { nullable: false })
    userProfile: UserProfile;
    @Column({ nullable: false })
    userProfileId: string;

    @ManyToOne(
        type => Fund,
        inverse => inverse.fundUserProfiles
    )
    @Field(type => Fund, { nullable: false })
    fund: Fund;
    @Column({ nullable: false })
    fundId: string;

    @ManyToOne(
        type => FundRole,
        inverse => inverse.fundUserProfiles
    )
    @JoinColumn({ name: 'fund_role_id' })
    @Field(type => FundRole, { nullable: false })
    fundRole: FundRole;
    @Column({ nullable: false })
    fundRoleId: string;

    @ManyToOne(
        type => FundRelationship,
        inverse => inverse.fundUserProfiles
    )
    @JoinColumn({ name: 'fund_relationship_id' })
    @Field(type => FundRelationship, { nullable: true })
    fundRelationship: FundRelationship;
    @Column({ nullable: false })
    fundRelationshipId: string;
}
