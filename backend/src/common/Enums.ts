export enum EEnvironments {
    development = 'development',
    staging = 'staging',
    production = 'production',
    test = 'test',
}

export enum ERunMode {
    debug,
    no_debug,
}

export enum ELoggerLevel {
    error = 'error',        // 1
    warn = 'warn',          // 2
    info = 'info',          // 3
    http = 'http',          // 4
    verbose = 'verbose',    // 5
    debug = 'debug',        // 6
    silly = 'silly',        // 7
}

export enum ELoggerFormat {
    pretty,
    json,
}

export enum EModelProviders {
    ollama = 'ollama',
    google = 'google',
    openai = 'openai',
    groq = 'groq',
}

export enum ERouteStrategies {
    basic = 'basic',
    advanced = 'advanced',
}

export enum ERoute {
    web = 'web',
    direct = 'direct',
}

export enum ESummaryFallback {
    no_results = 'no results',
    snippets = 'snippets',
    none = 'none',
}
