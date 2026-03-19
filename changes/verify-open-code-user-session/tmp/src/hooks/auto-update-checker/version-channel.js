export function isPrereleaseVersion(version) {
    return version.includes("-");
}
export function isDistTag(version) {
    const startsWithDigit = /^\d/.test(version);
    return !startsWithDigit;
}
export function isPrereleaseOrDistTag(pinnedVersion) {
    if (!pinnedVersion)
        return false;
    return isPrereleaseVersion(pinnedVersion) || isDistTag(pinnedVersion);
}
export function extractChannel(version) {
    if (!version)
        return "latest";
    if (isDistTag(version)) {
        return version;
    }
    if (isPrereleaseVersion(version)) {
        const prereleasePart = version.split("-")[1];
        if (prereleasePart) {
            const channelMatch = prereleasePart.match(/^(alpha|beta|rc|canary|next)/);
            if (channelMatch) {
                return channelMatch[1];
            }
        }
    }
    return "latest";
}
