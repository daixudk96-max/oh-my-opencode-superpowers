export function truncateDescription(description, maxLength = 120) {
    if (!description) {
        return description;
    }
    if (description.length <= maxLength) {
        return description;
    }
    return description.slice(0, maxLength - 3) + "...";
}
