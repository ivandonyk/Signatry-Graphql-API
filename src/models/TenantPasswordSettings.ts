import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    VersionColumn,
    OneToMany,
    ManyToOne,
    ManyToMany
} from 'typeorm';
import { ObjectType, Field, Int, Float } from 'type-graphql';

@ObjectType()
export class TenantPasswordSettings {
    @Field(type => Int, { nullable: false })
    minLength: number;

    @Field(type => Boolean, { nullable: false })
    requireNumberCharacter: boolean;

    @Field(type => Boolean, { nullable: false })
    requireSpecialCharacter: boolean;

    @Field(type => Boolean, { nullable: false })
    requireLowerCaseCharacter: boolean;

    @Field(type => Boolean, { nullable: false })
    requireUpperCaseCharacter: boolean;
}
