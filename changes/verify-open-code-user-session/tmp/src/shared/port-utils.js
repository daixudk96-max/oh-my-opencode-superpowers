const DEFAULT_SERVER_PORT = 4096;
const MAX_PORT_ATTEMPTS = 20;
export async function isPortAvailable(port, hostname = "127.0.0.1") {
    try {
        const server = Bun.serve({
            port,
            hostname,
            fetch: () => new Response(),
        });
        server.stop(true);
        return true;
    }
    catch {
        return false;
    }
}
export async function findAvailablePort(startPort = DEFAULT_SERVER_PORT, hostname = "127.0.0.1") {
    for (let attempt = 0; attempt < MAX_PORT_ATTEMPTS; attempt++) {
        const port = startPort + attempt;
        if (await isPortAvailable(port, hostname)) {
            return port;
        }
    }
    throw new Error(`No available port found in range ${startPort}-${startPort + MAX_PORT_ATTEMPTS - 1}`);
}
export async function getAvailableServerPort(preferredPort = DEFAULT_SERVER_PORT, hostname = "127.0.0.1") {
    if (await isPortAvailable(preferredPort, hostname)) {
        return { port: preferredPort, wasAutoSelected: false };
    }
    const port = await findAvailablePort(preferredPort + 1, hostname);
    return { port, wasAutoSelected: true };
}
export { DEFAULT_SERVER_PORT };
