import { Resolver, Query, Ctx, Arg } from 'type-graphql';

import StorageClient, { BUCKETS } from '../storage/client';
import { BaseResolver } from './core/BaseResolver';
import { GraphQLContext } from '../context';
import { Document as DocType, ReturnDocument } from '../models/Document';
import { DocumentTypes } from '../types/documentTypes';

@Resolver()
export class DocumentResolver extends BaseResolver {
    @Query(() => ReturnDocument, { nullable: true })
    async documents(
        @Ctx() context: GraphQLContext,
        @Arg('type') type: 'users' | 'funds',
        @Arg('code') code: string
    ): Promise<{ [documentType: string]: DocType[] } | void> {
        const client = new StorageClient();
        const documents = await client.getDocuments(type, code);

        if (!documents) return null;

        // reformat to key-value pair
        return documents.reduce((acc: { [docType: string]: DocType[] }, doc: DocType) => {
            if (doc.type) acc[doc.type] = (acc[doc.type] || []).concat(doc);
            else acc.other = (acc.other || []).concat(doc);
            return acc;
        }, {});
    }

    @Query(() => [DocType], { nullable: true })
    async documentsByType(
        @Ctx() context: GraphQLContext,
        @Arg('type') type: 'users' | 'funds',
        @Arg('code') code: string,
        @Arg('documentType', () => DocumentTypes) documentType: DocumentTypes
    ): Promise<DocType[] | void> {
        const client = new StorageClient();
        const documents = await client.getDocuments(type, code);

        const filtered = (documents || []).filter(doc => doc.type === documentType);

        if (!filtered.length) return null;
        return filtered;
    }

    @Query(() => String, { nullable: true })
    async getForm(
        @Ctx() context: GraphQLContext,
        @Arg('name', () => DocumentTypes) name: DocumentTypes
    ): Promise<string> {
        const client = new StorageClient();
        const document = await client.getDocument('forms', name, BUCKETS.documentsGlobal);

        if (!document) return null;
        return document.url;
    }
}
