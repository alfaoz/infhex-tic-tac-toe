import type { Db } from 'mongodb';
import type { Logger } from 'pino';

export interface DatabaseMigrationContext {
    database: Db;
    logger: Logger;
}

export interface DatabaseMigration {
    id: string;
    description: string;
    up(context: DatabaseMigrationContext): Promise<void>;
}
