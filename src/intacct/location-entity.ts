import { LocationEntityInterface } from '../accounting';
import { Functions, Xml } from '@intacct/intacct-sdk';

class IntacctLocationEntity implements LocationEntityInterface {
    locationId: string;
    name: string;

    constructor(locationId: string, name: string) {
        this.locationId = locationId;
        this.name = name;
    }

    public getLocationId(): string {
        return this.locationId;
    }

    public getName(): string {
        return this.name;
    }
}

class IntacctLocationEntityFactory {
    static create(result: Xml.Response.Result) {
        const entity = new IntacctLocationEntity(result['LOCATIONID'], result['NAME']);
        return entity;
    }
}

export { IntacctLocationEntity, IntacctLocationEntityFactory };
