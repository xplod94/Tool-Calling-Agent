import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { Express } from 'express-serve-static-core';
import morgan from 'morgan';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { searchRouter } from './routes/search.js';
import { EEnvironments } from './common/Enums.js';

export default function createApp(): Express {
    const app = express();

    // ─── Security ───────────────────────────────────────────
    app.use(helmet());
    app.use(
        cors({
            origin: env.CORS_ORIGIN,
            methods: ['GET', 'POST'],
            allowedHeaders: ['Content-Type', 'Authorization'],
        }),
    );

    // ─── Performance ────────────────────────────────────────
    app.use(compression());

    // ─── Body parsing ────────────────────────────────────────
    app.use(express.json({ limit: '1mb' }));
    app.use(express.urlencoded({ extended: true, limit: '1mb' }));

    // ─── Logging ────────────────────────────────────────────
    app.use(
        morgan(env.NODE_ENV === EEnvironments.production ? 'combined' : 'dev', {
            stream: { write: (msg) => logger.http(msg.trim()) },
        }),
    );

    // ─── Rate limiting ──────────────────────────────────────
    app.use(
        '/api',
        rateLimit({
            windowMs: env.RATE_LIMIT_WINDOW_MS,
            max: env.RATE_LIMIT_MAX_REQUESTS,
            standardHeaders: true,
            legacyHeaders: false,
            message: { error: 'Too many requests', statusCode: 429 },
        }),
    );

    // ─── Routes ─────────────────────────────────────────────
    app.get('/healthz', (_req, res) =>
        res.json({ status: 'ok', timestamp: new Date().toString() }),
    );

    // Route for talking to the LLM
    app.use('/search', searchRouter);

    return app;
}
