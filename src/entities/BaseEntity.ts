import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    VersionColumn
} from 'typeorm';
import { ObjectType, Field } from 'type-graphql';

@Entity()
@ObjectType()
export abstract class BaseEntity {
    // Id
    @PrimaryGeneratedColumn('uuid')
    @Field()
    id: string;

    // Enabled
    @Column({
        type: 'boolean',
        default: () => true
    })
    @Field(type => Boolean)
    enabled: boolean;

    // Created On
    @CreateDateColumn({ default: () => 'CURRENT_TIMESTAMP' })
    @Field()
    createdOn: Date;

    // Created By
    @Column({ type: 'character varying' })
    createdBy: string;

    // Updated On
    @UpdateDateColumn({ default: () => 'CURRENT_TIMESTAMP' })
    @Field()
    updatedOn: Date;

    // Updated By
    @Column({ type: 'character varying' })
    updatedBy: string;

    // Version
    @VersionColumn({ default: 1 })
    @Field()
    version: number;
}
