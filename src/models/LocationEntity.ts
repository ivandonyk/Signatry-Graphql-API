import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    VersionColumn,
    OneToMany
} from 'typeorm';
import { ObjectType, Field, Int, Float } from 'type-graphql';
import { FundTransaction } from './FundTransaction';

@Entity()
@ObjectType()
export class LocationEntity {
    // Id
    @PrimaryGeneratedColumn('uuid')
    @Field()
    id: string;

    @Column({
        type: 'character varying',
        nullable: false
    })
    @Field(type => String, { nullable: false })
    locationId: string;

    @Column({
        type: 'character varying',
        nullable: false
    })
    @Field(type => String, { nullable: false })
    name: string;

    @Column({ nullable: false })
    tenantId: string;
}
