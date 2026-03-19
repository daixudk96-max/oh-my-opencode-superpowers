import { chmodSync, existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { getOpenCodeConfigDir } from "../../shared";
const STORAGE_FILE_NAME = "mcp-oauth.json";
export function getMcpOauthStoragePath() {
    return join(getOpenCodeConfigDir({ binary: "opencode" }), STORAGE_FILE_NAME);
}
function normalizeHost(serverHost) {
    let host = serverHost.trim();
    if (!host)
        return host;
    if (host.includes("://")) {
        try {
            host = new URL(host).hostname;
        }
        catch {
            host = host.split("/")[0];
        }
    }
    else {
        host = host.split("/")[0];
    }
    if (host.startsWith("[")) {
        const closing = host.indexOf("]");
        if (closing !== -1) {
            host = host.slice(0, closing + 1);
        }
        return host;
    }
    if (host.includes(":")) {
        host = host.split(":")[0];
    }
    return host;
}
function normalizeResource(resource) {
    return resource.replace(/^\/+/, "");
}
function buildKey(serverHost, resource) {
    const host = normalizeHost(serverHost);
    const normalizedResource = normalizeResource(resource);
    return `${host}/${normalizedResource}`;
}
function readStore() {
    const filePath = getMcpOauthStoragePath();
    if (!existsSync(filePath)) {
        return null;
    }
    try {
        const content = readFileSync(filePath, "utf-8");
        return JSON.parse(content);
    }
    catch {
        return null;
    }
}
function writeStore(store) {
    const filePath = getMcpOauthStoragePath();
    try {
        const dir = dirname(filePath);
        if (!existsSync(dir)) {
            mkdirSync(dir, { recursive: true });
        }
        writeFileSync(filePath, JSON.stringify(store, null, 2), { encoding: "utf-8", mode: 0o600 });
        chmodSync(filePath, 0o600);
        return true;
    }
    catch {
        return false;
    }
}
export function loadToken(serverHost, resource) {
    const store = readStore();
    if (!store)
        return null;
    const key = buildKey(serverHost, resource);
    return store[key] ?? null;
}
export function saveToken(serverHost, resource, token) {
    const store = readStore() ?? {};
    const key = buildKey(serverHost, resource);
    store[key] = token;
    return writeStore(store);
}
export function deleteToken(serverHost, resource) {
    const store = readStore();
    if (!store)
        return true;
    const key = buildKey(serverHost, resource);
    if (!(key in store)) {
        return true;
    }
    delete store[key];
    if (Object.keys(store).length === 0) {
        try {
            const filePath = getMcpOauthStoragePath();
            if (existsSync(filePath)) {
                unlinkSync(filePath);
            }
            return true;
        }
        catch {
            return false;
        }
    }
    return writeStore(store);
}
export function listTokensByHost(serverHost) {
    const store = readStore();
    if (!store)
        return {};
    const host = normalizeHost(serverHost);
    const prefix = `${host}/`;
    const result = {};
    for (const [key, value] of Object.entries(store)) {
        if (key.startsWith(prefix)) {
            result[key] = value;
        }
    }
    return result;
}
export function listAllTokens() {
    return readStore() ?? {};
}
