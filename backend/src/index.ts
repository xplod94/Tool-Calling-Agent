import createApp from './app.js';
import { PROVIDER_MODEL_MAP } from './common/Constants.js';
import { EModelProviders } from './common/Enums.js';
import { env, isDebugMode } from './config/env.js';
import { logger } from './utils/logger.js';

const app = createApp();

const server = app.listen(env.PORT, env.HOST, async () => {
    if (isDebugMode()) logger.info('****** Running in Debug Mode ******');
    // If Ollama is the provider, start the ollama server first
    if (env.MODEL_PROVIDER === EModelProviders.ollama) await loadOllamaModel();
    logger.info(`🚀 Server running at http://${env.HOST}:${env.PORT}`);
    logger.info(`🤖 Large Language Model: ${PROVIDER_MODEL_MAP[env.MODEL_PROVIDER]} (${env.MODEL_PROVIDER})`);
    logger.info(`🌍 Environment: ${env.NODE_ENV}`);
});

// ─── Graceful shutdown ────────────────────────────────────
const signals: NodeJS.Signals[] = ['SIGTERM', 'SIGINT'];

signals.forEach((signal) => {
    process.on(signal, async () => {
        logger.info(`Received ${signal}, shutting down gracefully...`);
        await unloadOllamaModel();
        server.close((err) => {
            if (err) {
                logger.error('Error during server shutdown', { error: err.message });
                process.exit(1);
            }
            logger.info('Server closed cleanly');
            process.exit(0);
        });

        // Force exit after 10s
        setTimeout(() => {
            logger.warn('Forcing shutdown after timeout');
            process.exit(1);
        }, 10_000).unref();
    });
});

process.on('uncaughtException', async (err) => {
    logger.error('Uncaught exception', { error: err.message, stack: err.stack });
    await unloadOllamaModel();
    process.exit(1);
});

process.on('unhandledRejection', async (reason) => {
    logger.error('Unhandled rejection', { reason });
    await unloadOllamaModel();
    process.exit(1);
});

// ─── Ollama Server ────────────────────────────────────
const loadOllamaModel = async () => {
    try {
        await fetch(`${env.OLLAMA_BASE_URL}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: PROVIDER_MODEL_MAP[env.MODEL_PROVIDER],
                prompt: '',
                keep_alive: -1   // keep loaded until explicitly unloaded
            })
        });
        logger.info(`🌐 Ollama running @ ${env.OLLAMA_BASE_URL}`);
    } catch (err) {
        logger.error('Failed to start Ollama server:', err);
    }
}

export const unloadOllamaModel = async () => {
    await fetch(`${env.OLLAMA_BASE_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: PROVIDER_MODEL_MAP[env.MODEL_PROVIDER],
            keep_alive: 0   // 0 = unload immediately
        })
    });
    logger.info(`🌐 Ollama server stopped.`);
}

export default server;
