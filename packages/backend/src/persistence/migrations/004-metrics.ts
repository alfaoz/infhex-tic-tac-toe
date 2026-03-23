import type { Document } from 'mongodb';
import type { DatabaseMigration } from './types';
import { METRICS_COLLECTION_NAME } from '../mongoCollections';

interface MetricDocument extends Document {
    _id: unknown;
}

export const metricsMigration: DatabaseMigration = {
    id: '004-metrics',
    description: 'Create metrics collection indexes',
    async up({ database }) {
        const collection = database.collection<MetricDocument>(METRICS_COLLECTION_NAME);
        await collection.createIndex({ timestamp: -1 });
        await collection.createIndex({ event: 1, timestamp: -1 });
    }
};
