export declare function getFingerprint(text: string): string;
export declare function analyzeSentiment(text: string): {
    label: 'positive' | 'negative' | 'neutral' | 'mixed';
    valence: number;
};
export declare function extractAspects(text: string): {
    name: string;
    sentiment: 'positive' | 'negative' | 'neutral';
    snippet: string;
}[];
export declare function findThemeId(text: string): number;
export declare function scrapeReddit(): Promise<{
    fetched: number;
    processed: number;
    errors: number;
    log: string;
}>;
//# sourceMappingURL=reddit.d.ts.map