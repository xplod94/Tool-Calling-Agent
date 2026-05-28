import winston from 'winston';
import { env } from '../config/env.js';
import { EEnvironments, ELoggerFormat } from '@/common/Enums.js';

const { combine, timestamp, colorize, printf, json, errors } = winston.format;

const prettyFormat = combine(
    colorize({ all: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    printf(({ timestamp, level, message, stack, ...meta }) => {
        const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
        return `${timestamp} [${level}]: ${stack ?? message}${metaStr}`;
    }),
);

const jsonFormat = combine(timestamp(), errors({ stack: true }), json());

export const logger = winston.createLogger({
    level: `${env.LOG_LEVEL}`,
    format: env.LOG_FORMAT === ELoggerFormat.json ? jsonFormat : prettyFormat,
    transports: [
        new winston.transports.Console(),
        ...(env.NODE_ENV === EEnvironments.production
            ? [
                new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
                new winston.transports.File({ filename: 'logs/combined.log' }),
            ]
            : []),
    ],
});
