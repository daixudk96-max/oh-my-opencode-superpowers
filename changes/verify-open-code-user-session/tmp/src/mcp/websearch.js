export function createWebsearchConfig(config) {
    const provider = config?.provider || "exa";
    if (provider === "tavily") {
        const tavilyKey = process.env.TAVILY_API_KEY;
        if (!tavilyKey) {
            throw new Error("TAVILY_API_KEY environment variable is required for Tavily provider");
        }
        return {
            type: "remote",
            url: "https://mcp.tavily.com/mcp/",
            enabled: true,
            headers: {
                Authorization: `Bearer ${tavilyKey}`,
            },
            oauth: false,
        };
    }
    // Default to Exa
    return {
        type: "remote",
        url: process.env.EXA_API_KEY
            ? `https://mcp.exa.ai/mcp?tools=web_search_exa&exaApiKey=${encodeURIComponent(process.env.EXA_API_KEY)}`
            : "https://mcp.exa.ai/mcp?tools=web_search_exa",
        enabled: true,
        ...(process.env.EXA_API_KEY ? { headers: { "x-api-key": process.env.EXA_API_KEY } } : {}),
        oauth: false,
    };
}
// Backward compatibility: export static instance using default config
export const websearch = createWebsearchConfig();
