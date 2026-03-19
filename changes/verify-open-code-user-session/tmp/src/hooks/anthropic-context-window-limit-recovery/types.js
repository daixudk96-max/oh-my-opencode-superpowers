export const RETRY_CONFIG = {
    maxAttempts: 2,
    initialDelayMs: 2000,
    backoffFactor: 2,
    maxDelayMs: 30000,
};
export const TRUNCATE_CONFIG = {
    maxTruncateAttempts: 20,
    minOutputSizeToTruncate: 500,
    targetTokenRatio: 0.5,
    charsPerToken: 4,
};
