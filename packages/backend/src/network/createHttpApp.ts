import express from 'express';
import cors from 'cors';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { GameTimeControl, SessionParticipant } from '@ih3t/shared';
import type { Logger } from 'pino';
import { inject, injectable } from 'tsyringe';
import { z } from 'zod';
import { AuthService } from '../auth/authService';
import { ServerConfig } from '../config/serverConfig';
import { ROOT_LOGGER } from '../logger';
import { GameHistoryRepository } from '../persistence/gameHistoryRepository';
import { SessionManager } from '../session/sessionManager';
import { CorsConfiguration } from './cors';
import { ApiRouter } from './rest/createApiRouter';

const DEFAULT_PAGE_TITLE = 'Infinity Hexagonal Tic-Tac-Toe';
const DEFAULT_PAGE_DESCRIPTION = 'Play Infinity Hexagonal Tic-Tac-Toe online, host a lobby, join live matches, and review finished games move by move.';
const DEFAULT_OG_DESCRIPTION = 'Host a lobby, join live matches, and review finished Infinity Hexagonal Tic-Tac-Toe games online.';

interface PageMetadata {
    title: string;
    description: string;
    url: string;
    imageUrl: string;
    ogType: 'website' | 'article';
    robots: string;
}

function escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, (character) => {
        switch (character) {
            case '&':
                return '&amp;';
            case '<':
                return '&lt;';
            case '>':
                return '&gt;';
            case '"':
                return '&quot;';
            case "'":
                return '&#39;';
            default:
                return character;
        }
    });
}

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function replaceOrInsertTag(html: string, pattern: RegExp, replacement: string): string {
    if (pattern.test(html)) {
        return html.replace(pattern, replacement);
    }

    return html.replace('</head>', `    ${replacement}\n</head>`);
}

function replaceOrInsertMetaName(html: string, name: string, content: string): string {
    return replaceOrInsertTag(
        html,
        new RegExp(`<meta\\s+[^>]*name=["']${escapeRegExp(name)}["'][^>]*>`, 'i'),
        `<meta name="${name}" content="${escapeHtml(content)}" />`
    );
}

function replaceOrInsertMetaProperty(html: string, property: string, content: string): string {
    return replaceOrInsertTag(
        html,
        new RegExp(`<meta\\s+[^>]*property=["']${escapeRegExp(property)}["'][^>]*>`, 'i'),
        `<meta property="${property}" content="${escapeHtml(content)}" />`
    );
}

function replaceOrInsertCanonicalLink(html: string, href: string): string {
    return replaceOrInsertTag(
        html,
        /<link\s+[^>]*rel=["']canonical["'][^>]*>/i,
        `<link rel="canonical" href="${escapeHtml(href)}" />`
    );
}

function getSingleQueryValue(value: unknown): string | null {
    if (typeof value === 'string' && value.trim().length > 0) {
        return value.trim();
    }

    if (Array.isArray(value) && typeof value[0] === 'string' && value[0].trim().length > 0) {
        return value[0].trim();
    }

    return null;
}

function formatTimeControl(timeControl: GameTimeControl): string {
    if (timeControl.mode === 'unlimited') {
        return 'no';
    }

    const formatSeconds = (totalSeconds: number): string => {
        if (totalSeconds % 60 === 0) {
            return `${totalSeconds / 60}m`;
        }

        return `${totalSeconds}s`;
    };

    if (timeControl.mode === 'turn') {
        return `${formatSeconds(Math.round(timeControl.turnTimeMs / 1000))} turn based`;
    }

    return `${formatSeconds(Math.round(timeControl.mainTimeMs / 1000))} +${formatSeconds(Math.round(timeControl.incrementMs / 1000))} clock based`;
}

function getNormalizedPlayerNames(players: SessionParticipant[]): string[] {
    return players
        .map((player) => player.displayName.trim())
        .filter((playerName) => playerName.length > 0);
}

function describePlayersWaiting(players: SessionParticipant[], visibility: string): string {
    const [firstPlayerName] = getNormalizedPlayerNames(players);
    if (firstPlayerName) {
        return `${firstPlayerName} is waiting for you in a ${visibility} lobby`;
    }

    return `A ${visibility} lobby is waiting for you`;
}

function describePlayersInMatch(players: SessionParticipant[], visibility: string): string {
    const normalizedPlayerNames = getNormalizedPlayerNames(players);
    if (normalizedPlayerNames.length === 1) {
        return `${normalizedPlayerNames[0]} is already playing in a ${visibility} Infinity Hexagonal Tic-Tac-Toe match`;
    }

    if (normalizedPlayerNames.length === 2) {
        return `${normalizedPlayerNames[0]} and ${normalizedPlayerNames[1]} are already playing in a ${visibility} Infinity Hexagonal Tic-Tac-Toe match`;
    }

    if (normalizedPlayerNames.length > 2) {
        return `${normalizedPlayerNames[0]}, ${normalizedPlayerNames[1]}, and ${normalizedPlayerNames.length - 2} more are already playing in a ${visibility} Infinity Hexagonal Tic-Tac-Toe match`;
    }

    return `A ${visibility} Infinity Hexagonal Tic-Tac-Toe match is underway`;
}

@injectable()
export class HttpApplication {
    readonly app: express.Application;
    private readonly logger: Logger;
    private readonly frontendDistPath: string;
    private frontendIndexHtmlPromise: Promise<string> | null = null;

    constructor(
        @inject(ROOT_LOGGER) rootLogger: Logger,
        @inject(AuthService) authService: AuthService,
        @inject(ApiRouter) apiRouter: ApiRouter,
        @inject(CorsConfiguration) corsConfiguration: CorsConfiguration,
        @inject(ServerConfig) serverConfig: ServerConfig,
        @inject(SessionManager) private readonly sessionManager: SessionManager,
        @inject(GameHistoryRepository) private readonly gameHistoryRepository: GameHistoryRepository
    ) {
        const app = express();
        const logger = rootLogger.child({ component: 'http-application' });
        const corsOptions = corsConfiguration.options;
        const frontendDistPath = serverConfig.frontendDistPath;
        this.logger = logger;
        this.frontendDistPath = frontendDistPath;

        app.set('trust proxy', true);

        if (corsOptions) {
            app.use(cors(corsOptions));
        }

        app.use((req, res, next) => {
            const requestId = randomUUID();
            const startedAt = process.hrtime.bigint();
            const requestLogger = logger.child({
                requestId,
                method: req.method,
                path: req.originalUrl,
                remoteAddress: req.ip
            });

            res.on('finish', () => {
                const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
                requestLogger.trace({
                    event: 'http.request.completed',
                    statusCode: res.statusCode,
                    durationMs: Number(durationMs.toFixed(3)),
                    contentLength: res.getHeader('content-length') ?? null,
                    userAgent: req.get('user-agent') ?? null
                }, 'HTTP request completed');
            });

            next();
        });

        app.use('/auth', express.urlencoded({ extended: false }), express.json(), authService.handler);
        app.use('/api', apiRouter.router);
        app.use((error: unknown, req: express.Request, res: express.Response, next: express.NextFunction) => {
            if (!(error instanceof z.ZodError)) {
                next(error);
                return;
            }

            logger.warn({
                err: error,
                event: 'http.request.invalid',
                method: req.method,
                path: req.originalUrl,
                issues: error.issues
            }, 'HTTP request validation failed');

            res.status(400).json({
                error: error.message,
                issues: error.issues
            });
        });

        if (process.env.NODE_ENV === 'production' && existsSync(frontendDistPath)) {
            app.use(express.static(frontendDistPath, { index: false }));
            app.get(/^(?!\/api(?:\/|$)|\/socket\.io(?:\/|$)).*/, async (req, res) => {
                const metadata = await this.resolvePageMetadata(req);
                const html = this.renderHtmlDocument(await this.getFrontendIndexHtml(), metadata);
                res.type('html').send(html);
            });
        }

        this.app = app;
    }

    private async getFrontendIndexHtml(): Promise<string> {
        if (this.frontendIndexHtmlPromise) {
            return this.frontendIndexHtmlPromise;
        }

        this.frontendIndexHtmlPromise = readFile(join(this.frontendDistPath, 'index.html'), 'utf8')
            .catch((error: unknown) => {
                this.frontendIndexHtmlPromise = null;
                this.logger.error({
                    err: error,
                    event: 'frontend.index.read.failed',
                    frontendDistPath: this.frontendDistPath
                }, 'Failed to read frontend index.html');
                throw error;
            });

        return this.frontendIndexHtmlPromise;
    }

    private renderHtmlDocument(html: string, metadata: PageMetadata): string {
        let renderedHtml = html;

        renderedHtml = replaceOrInsertTag(
            renderedHtml,
            /<title>.*?<\/title>/is,
            `<title>${escapeHtml(metadata.title)}</title>`
        );
        renderedHtml = replaceOrInsertMetaName(renderedHtml, 'description', metadata.description);
        renderedHtml = replaceOrInsertMetaName(renderedHtml, 'robots', metadata.robots);
        renderedHtml = replaceOrInsertMetaProperty(renderedHtml, 'og:type', metadata.ogType);
        renderedHtml = replaceOrInsertMetaProperty(renderedHtml, 'og:title', metadata.title);
        renderedHtml = replaceOrInsertMetaProperty(renderedHtml, 'og:description', metadata.description);
        renderedHtml = replaceOrInsertMetaProperty(renderedHtml, 'og:image', metadata.imageUrl);
        renderedHtml = replaceOrInsertMetaProperty(renderedHtml, 'og:url', metadata.url);
        renderedHtml = replaceOrInsertMetaName(renderedHtml, 'twitter:card', 'summary');
        renderedHtml = replaceOrInsertMetaName(renderedHtml, 'twitter:title', metadata.title);
        renderedHtml = replaceOrInsertMetaName(renderedHtml, 'twitter:description', metadata.description);
        renderedHtml = replaceOrInsertMetaName(renderedHtml, 'twitter:image', metadata.imageUrl);
        renderedHtml = replaceOrInsertCanonicalLink(renderedHtml, metadata.url);

        return renderedHtml;
    }

    private async resolvePageMetadata(req: express.Request): Promise<PageMetadata> {
        const origin = `${req.protocol}://${req.get('host')}`;
        const url = new URL(req.originalUrl || req.url, origin);
        const defaultMetadata: PageMetadata = {
            title: DEFAULT_PAGE_TITLE,
            description: DEFAULT_OG_DESCRIPTION,
            url: url.toString(),
            imageUrl: new URL('/favicon.png', origin).toString(),
            ogType: 'website',
            robots: 'index, follow'
        };

        if (req.path === '/games') {
            return {
                ...defaultMetadata,
                title: `Finished Games Archive • ${DEFAULT_PAGE_TITLE}`,
                description: 'Browse finished Infinity Hexagonal Tic-Tac-Toe matches and review their move history.',
            };
        }

        if (req.path === '/account/games') {
            return {
                ...defaultMetadata,
                title: `My Match History • ${DEFAULT_PAGE_TITLE}`,
                description: 'Review your own finished Infinity Hexagonal Tic-Tac-Toe matches while signed in.',
                robots: 'noindex, nofollow'
            };
        }

        if (req.path === '/admin') {
            return {
                ...defaultMetadata,
                title: `Admin Dashboard • ${DEFAULT_PAGE_TITLE}`,
                description: 'Administrative statistics for Infinity Hexagonal Tic-Tac-Toe.',
                robots: 'noindex, nofollow'
            };
        }

        const finishedGameMatch = req.path.match(/^\/games\/([^/]+)$/);
        if (finishedGameMatch) {
            const finishedGame = await this.gameHistoryRepository.getFinishedGame(decodeURIComponent(finishedGameMatch[1]));
            if (!finishedGame) {
                return {
                    ...defaultMetadata,
                    title: `Replay Not Found • ${DEFAULT_PAGE_TITLE}`,
                    description: 'The requested finished match could not be found.',
                    ogType: 'article',
                    robots: 'noindex, nofollow'
                };
            }

            return {
                ...defaultMetadata,
                title: `Replay ${finishedGame.sessionId} • ${DEFAULT_PAGE_TITLE}`,
                description: `Review finished match ${finishedGame.sessionId}: ${finishedGame.moveCount} moves, ${finishedGame.players.length} players, ended ${this.formatFinishReason(finishedGame.gameResult?.reason)}.`,
                ogType: 'article'
            };
        }

        const accountFinishedGameMatch = req.path.match(/^\/account\/games\/([^/]+)$/);
        if (accountFinishedGameMatch) {
            const finishedGame = await this.gameHistoryRepository.getFinishedGame(decodeURIComponent(accountFinishedGameMatch[1]));
            if (!finishedGame) {
                return {
                    ...defaultMetadata,
                    title: `Replay Not Found • ${DEFAULT_PAGE_TITLE}`,
                    description: 'The requested finished match could not be found.',
                    ogType: 'article',
                    robots: 'noindex, nofollow'
                };
            }

            return {
                ...defaultMetadata,
                title: `My Replay ${finishedGame.sessionId} • ${DEFAULT_PAGE_TITLE}`,
                description: `Review your finished match ${finishedGame.sessionId}: ${finishedGame.moveCount} moves, ${finishedGame.players.length} players, ended ${this.formatFinishReason(finishedGame.gameResult?.reason)}.`,
                ogType: 'article',
                robots: 'noindex, nofollow'
            };
        }

        const inviteSessionId = getSingleQueryValue(req.query.join);
        if (req.path === '/' && inviteSessionId) {
            const inviteSession = this.sessionManager.getSessionInfo(inviteSessionId);
            if (!inviteSession) {
                return {
                    ...defaultMetadata,
                    title: `Invite Expired • ${DEFAULT_PAGE_TITLE}`,
                    description: `Session ${inviteSessionId} is no longer active. Open the lobby to host or join another match.`,
                    robots: 'noindex, nofollow'
                };
            }

            const canJoin = canJoinSession(inviteSession);
            return {
                ...defaultMetadata,
                title: canJoin
                    ? `Join Lobby ${inviteSession.id} • ${DEFAULT_PAGE_TITLE}`
                    : `Spectate Match ${inviteSession.id} • ${DEFAULT_PAGE_TITLE}`,
                description: canJoin
                    ? `${describePlayersWaiting(inviteSession.players, inviteSession.gameOptions.visibility)} with ${formatTimeControl(inviteSession.gameOptions.timeControl)} time control. Click to join the match.`
                    : `${describePlayersInMatch(inviteSession.players, inviteSession.gameOptions.visibility)} with ${formatTimeControl(inviteSession.gameOptions.timeControl)} time control. Open to spectate it live.`,
                robots: 'noindex, nofollow'
            };
        }

        return {
            ...defaultMetadata,
            description: DEFAULT_PAGE_DESCRIPTION
        };
    }

    private formatFinishReason(reason: string | null | undefined): string {
        switch (reason) {
            case 'six-in-a-row':
                return 'with a six-in-a-row win';
            case 'disconnect':
                return 'after a disconnect';
            case 'surrender':
                return 'after a surrender';
            case 'timeout':
                return 'after a timeout';
            case 'terminated':
                return 'when the session was terminated';
            default:
                return 'after the match ended';
        }
    }
}
function canJoinSession(session: { state: string; players: SessionParticipant[] }): boolean {
    return session.state === 'lobby' && session.players.length < 2;
}
