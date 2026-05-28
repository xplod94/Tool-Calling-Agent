export type TChatResponse = {
    answer: string;
    sources: string[];
}

export type TMessage = {
    sender: string;
    text: string;
    sources: string[];
    timeElapsed?: number;
}
