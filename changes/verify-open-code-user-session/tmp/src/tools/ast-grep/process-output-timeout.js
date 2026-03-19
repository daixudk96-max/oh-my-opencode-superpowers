export async function collectProcessOutputWithTimeout(process, timeoutMs) {
    const timeoutPromise = new Promise((_, reject) => {
        const timeoutId = setTimeout(() => {
            process.kill();
            reject(new Error(`Search timeout after ${timeoutMs}ms`));
        }, timeoutMs);
        process.exited.then(() => clearTimeout(timeoutId));
    });
    const stdoutPromise = process.stdout ? new Response(process.stdout).text() : Promise.resolve("");
    const stderrPromise = process.stderr ? new Response(process.stderr).text() : Promise.resolve("");
    const stdout = await Promise.race([stdoutPromise, timeoutPromise]);
    const stderr = await stderrPromise;
    const exitCode = await process.exited;
    return { stdout, stderr, exitCode };
}
