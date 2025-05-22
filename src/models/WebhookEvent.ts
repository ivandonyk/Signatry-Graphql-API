import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    VersionColumn
} from 'typeorm';

export enum WebhookEventSource {
    STRIPE = 'STRIPE',
    IDONATE = 'IDONATE'
}

@Entity()
export class WebhookEvent {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({
        type: 'character varying',
        nullable: false
    })
    eventType: string;

    @Column({
        type: 'timestamp',
        nullable: false
    })
    eventCreatedAt: Date;

    @Column({
        type: 'json',
        nullable: false
    })
    eventData: any;

    @Column({
        type: 'character varying',
        nullable: false
    })
    source: WebhookEventSource;

    get data(): any {
        return JSON.parse(this.eventData);
    }

    set data(data: any) {
        this.data = JSON.stringify(data);
    }

    @CreateDateColumn({ default: () => 'CURRENT_TIMESTAMP' })
    createdOn: Date;

    @UpdateDateColumn({ default: () => 'CURRENT_TIMESTAMP' })
    updatedOn: Date;

    @VersionColumn({ default: 1 })
    version: number;
}
