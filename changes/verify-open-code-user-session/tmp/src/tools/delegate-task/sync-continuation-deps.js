import { pollSyncSession } from "./sync-session-poller";
import { fetchSyncResult } from "./sync-result-fetcher";
export const syncContinuationDeps = {
    pollSyncSession,
    fetchSyncResult,
};
