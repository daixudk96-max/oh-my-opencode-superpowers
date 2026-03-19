import { homedir } from "node:os";
export function getHomeDirectory() {
    return process.env.HOME || process.env.USERPROFILE || homedir();
}
