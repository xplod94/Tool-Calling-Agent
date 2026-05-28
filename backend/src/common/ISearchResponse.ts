// Tavily web search response structure
export interface IWebSearchResponse {
    query: string;
    follow_up_questions?: string[];
    answer?: string;
    images: IImageResult[];
    results: IWebSearchResult[];
    response_time: number;
    request_id: string;
    auto_parameters?: IAutoParameters;
    usage?: IUsage;
}

export interface IImageResult {
    url: string;
    description: string;
}

export interface IWebSearchResult {
    title: string;
    url: string;
    content: string;
    score?: number;
    raw_content?: null;
    favicon?: string;
    images?: IImageResult[];
}

export interface IAutoParameters {
    topic: string;
    search_depth: string;
}

export interface IUsage {
    credits: number;
}
