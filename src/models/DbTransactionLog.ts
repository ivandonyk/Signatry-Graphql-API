import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';
import { ObjectType, Field } from 'type-graphql';

@Entity()
@ObjectType()
export class DbTransactionLog {
    @PrimaryGeneratedColumn('uuid')
    @Field()
    id: string;

    @CreateDateColumn({ default: () => 'CURRENT_TIMESTAMP' })
    @Field()
    createdOn: Date;

    // Created By jwt sub if available
    @Column({ type: 'character varying', nullable: true })
    @Field(type => String, { nullable: true })
    createdBy: string;

    @Column({ type: 'uuid' })
    @Field()
    dbTransactionId: string;

    @Column({ type: 'character varying', nullable: true })
    @Field(type => String, { nullable: true })
    descriptor: string;

    @Column({ type: 'character varying' })
    @Field()
    state: string;

    @Column({ type: 'character varying', nullable: true })
    @Field(type => String, { nullable: true })
    firstError: string;
}
