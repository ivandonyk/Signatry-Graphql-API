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
import { Invitation } from '.';

@Entity()
@ObjectType()
export class PendingFundUser {
    @PrimaryGeneratedColumn('uuid')
    @Field()
    id: string;

    @Column({
        type: 'character varying',
        nullable: false
    })
    @Field(type => String, { nullable: false })
    email: string;

    // Enabled
    @Column({
        type: 'boolean',
        default: () => true
    })
    @Field(type => Boolean)
    enabled: boolean;

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
    @Field(type => FundRelationship, { nullable: false })
    fundRelationship: FundRelationship;
    @Column({ nullable: false })
    fundRelationshipId: string;

    @OneToMany(
        type => Invitation,
        inverse => inverse.pendingFundUser
    )
    @Field(type => [Invitation], { nullable: true })
    invitations: Invitation[];
}
