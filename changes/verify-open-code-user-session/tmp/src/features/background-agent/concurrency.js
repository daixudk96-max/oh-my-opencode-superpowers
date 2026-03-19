export class ConcurrencyManager {
    config;
    counts = new Map();
    queues = new Map();
    constructor(config) {
        this.config = config;
    }
    getConcurrencyLimit(model) {
        const modelLimit = this.config?.modelConcurrency?.[model];
        if (modelLimit !== undefined) {
            return modelLimit === 0 ? Infinity : modelLimit;
        }
        const provider = model.split('/')[0];
        const providerLimit = this.config?.providerConcurrency?.[provider];
        if (providerLimit !== undefined) {
            return providerLimit === 0 ? Infinity : providerLimit;
        }
        const defaultLimit = this.config?.defaultConcurrency;
        if (defaultLimit !== undefined) {
            return defaultLimit === 0 ? Infinity : defaultLimit;
        }
        return 5;
    }
    async acquire(model) {
        const limit = this.getConcurrencyLimit(model);
        if (limit === Infinity) {
            return;
        }
        const current = this.counts.get(model) ?? 0;
        if (current < limit) {
            this.counts.set(model, current + 1);
            return;
        }
        return new Promise((resolve, reject) => {
            const queue = this.queues.get(model) ?? [];
            const entry = {
                resolve: () => {
                    if (entry.settled)
                        return;
                    entry.settled = true;
                    resolve();
                },
                rawReject: reject,
                settled: false,
            };
            queue.push(entry);
            this.queues.set(model, queue);
        });
    }
    release(model) {
        const limit = this.getConcurrencyLimit(model);
        if (limit === Infinity) {
            return;
        }
        const queue = this.queues.get(model);
        // Try to hand off to a waiting entry (skip any settled entries from cancelWaiters)
        while (queue && queue.length > 0) {
            const next = queue.shift();
            if (!next.settled) {
                // Hand off the slot to this waiter (count stays the same)
                next.resolve();
                return;
            }
        }
        // No handoff occurred - decrement the count to free the slot
        const current = this.counts.get(model) ?? 0;
        if (current > 0) {
            this.counts.set(model, current - 1);
        }
    }
    /**
     * Cancel all waiting acquires for a model. Used during cleanup.
     */
    cancelWaiters(model) {
        const queue = this.queues.get(model);
        if (queue) {
            for (const entry of queue) {
                if (!entry.settled) {
                    entry.settled = true;
                    entry.rawReject(new Error(`Concurrency queue cancelled for model: ${model}`));
                }
            }
            this.queues.delete(model);
        }
    }
    /**
     * Clear all state. Used during manager cleanup/shutdown.
     * Cancels all pending waiters.
     */
    clear() {
        for (const [model] of this.queues) {
            this.cancelWaiters(model);
        }
        this.counts.clear();
        this.queues.clear();
    }
    /**
     * Get current count for a model (for testing/debugging)
     */
    getCount(model) {
        return this.counts.get(model) ?? 0;
    }
    /**
     * Get queue length for a model (for testing/debugging)
     */
    getQueueLength(model) {
        return this.queues.get(model)?.length ?? 0;
    }
}
