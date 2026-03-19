/**
 * Simple counting semaphore to limit concurrent process execution.
 * Used to prevent multiple ripgrep processes from saturating CPU.
 */
export class Semaphore {
    max;
    queue = [];
    running = 0;
    constructor(max) {
        this.max = max;
    }
    async acquire() {
        if (this.running < this.max) {
            this.running++;
            return;
        }
        return new Promise((resolve) => {
            this.queue.push(() => {
                this.running++;
                resolve();
            });
        });
    }
    release() {
        this.running--;
        const next = this.queue.shift();
        if (next)
            next();
    }
}
/** Global semaphore limiting concurrent ripgrep processes to 2 */
export const rgSemaphore = new Semaphore(2);
