import { Entity, Column, OneToMany, AfterLoad } from 'typeorm';
import { ObjectType, Field } from 'type-graphql';
import { Holding } from './Holding';
import { BaseEntity } from '../entities/BaseEntity';
import { PoolInvestmentHolding } from '.';

@Entity()
@ObjectType()
export class Security extends BaseEntity {
    @Column({
        type: 'character varying',
        nullable: false
    })
    @Field(type => String, { nullable: false })
    securityId: string;

    @Column({
        type: 'character varying',
        nullable: false
    })
    @Field(type => String, { nullable: false })
    name: string;

    @Column({
        nullable: false
    })
    @Field(type => String, { nullable: true })
    tickerSymbol: string;

    @Column({
        type: 'character varying',
        nullable: false
    })
    @Field(type => String, {
        nullable: true
    })
    securityType: string;

    @Column({
        type: 'character varying',
        nullable: false
    })
    @Field(type => String, {
        nullable: true
    })
    cusip: string;

    @OneToMany(
        type => PoolInvestmentHolding,
        inverse => inverse.security
    )
    @Field(type => [PoolInvestmentHolding], { nullable: true })
    poolInvestmentHoldings: PoolInvestmentHolding[];

    @OneToMany(
        type => Holding,
        inverse => inverse.security
    )
    @Field(type => [Holding], { nullable: true })
    holdings: Holding[];

    @AfterLoad()
    decodeName() {
        if (this.name) {
            this.name = this.name.replace(/&amp;amp;/g, '&');
        }
    }
}
