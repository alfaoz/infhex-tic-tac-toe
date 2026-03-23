import type { DatabaseMigration } from './types';
import { authCollectionsMigration } from './001-auth-collections';
import { gameHistoryMigration } from './002-game-history';
import { eloUsersIndexMigration } from './003-elo-users-index';
import { metricsMigration } from './004-metrics';
import { sandboxPositionsMigration } from './005-sandbox-positions';
import { serverSettingsMigration } from './006-server-settings';

export const databaseMigrations: readonly DatabaseMigration[] = [
    authCollectionsMigration,
    gameHistoryMigration,
    eloUsersIndexMigration,
    metricsMigration,
    sandboxPositionsMigration,
    serverSettingsMigration,
];
