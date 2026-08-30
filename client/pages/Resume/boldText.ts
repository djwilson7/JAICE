import type { BoldRange } from "./types";

export const normalizeBoldRanges = (
    ranges: BoldRange[] | undefined,
    textLength: number
): BoldRange[] => {
    const sorted = (Array.isArray(ranges) ? ranges : [])
        .map(({ start, end }) => ({
            start: Math.max(0, Math.min(textLength, Math.trunc(Number(start)))),
            end: Math.max(0, Math.min(textLength, Math.trunc(Number(end))))
        }))
        .filter(({ start, end }) => Number.isFinite(start) && Number.isFinite(end) && start < end)
        .sort((left, right) => left.start - right.start || left.end - right.end);

    return sorted.reduce<BoldRange[]>((result, range) => {
        const previous = result.at(-1);
        if (previous && range.start <= previous.end) {
            previous.end = Math.max(previous.end, range.end);
        } else {
            result.push({ ...range });
        }
        return result;
    }, []);
};

export const toggleBoldRange = (
    ranges: BoldRange[] | undefined,
    selectionStart: number,
    selectionEnd: number,
    textLength: number
): BoldRange[] => {
    const start = Math.max(0, Math.min(textLength, selectionStart));
    const end = Math.max(start, Math.min(textLength, selectionEnd));
    const normalized = normalizeBoldRanges(ranges, textLength);
    if (start === end) return normalized;

    const overlapsBold = normalized.some((range) => range.start < end && range.end > start);
    if (!overlapsBold) return normalizeBoldRanges([...normalized, { start, end }], textLength);

    return normalized.flatMap((range) => {
        if (range.end <= start || range.start >= end) return [range];
        return [
            ...(range.start < start ? [{ start: range.start, end: start }] : []),
            ...(range.end > end ? [{ start: end, end: range.end }] : [])
        ];
    });
};

export const remapBoldRanges = (
    oldText: string,
    newText: string,
    ranges: BoldRange[] | undefined
): BoldRange[] => {
    if (oldText === newText) return normalizeBoldRanges(ranges, newText.length);
    let prefix = 0;
    while (prefix < oldText.length && prefix < newText.length && oldText[prefix] === newText[prefix]) prefix += 1;

    let suffix = 0;
    while (
        suffix < oldText.length - prefix
        && suffix < newText.length - prefix
        && oldText[oldText.length - 1 - suffix] === newText[newText.length - 1 - suffix]
    ) suffix += 1;

    const oldEnd = oldText.length - suffix;
    const newEnd = newText.length - suffix;
    const delta = newEnd - oldEnd;
    const insertedLength = newEnd - prefix;

    const remapped = normalizeBoldRanges(ranges, oldText.length).flatMap((range) => {
        if (range.end <= prefix) return [range];
        if (range.start >= oldEnd) return [{ start: range.start + delta, end: range.end + delta }];

        const startsBeforeEdit = range.start < prefix;
        const endsAfterEdit = range.end > oldEnd;
        return [{
            start: startsBeforeEdit ? range.start : prefix,
            end: endsAfterEdit ? range.end + delta : prefix + (startsBeforeEdit ? insertedLength : 0)
        }];
    });

    return normalizeBoldRanges(remapped, newText.length);
};

export const splitBoldText = (text: string, ranges: BoldRange[] | undefined) => {
    const normalized = normalizeBoldRanges(ranges, text.length);
    const segments: Array<{ text: string; bold: boolean }> = [];
    let cursor = 0;
    normalized.forEach((range) => {
        if (range.start > cursor) segments.push({ text: text.slice(cursor, range.start), bold: false });
        segments.push({ text: text.slice(range.start, range.end), bold: true });
        cursor = range.end;
    });
    if (cursor < text.length) segments.push({ text: text.slice(cursor), bold: false });
    return segments;
};

export const trimBoldRanges = (text: string, ranges: BoldRange[] | undefined): BoldRange[] => {
    const leadingLength = text.length - text.trimStart().length;
    const trimmedLength = text.trim().length;
    return normalizeBoldRanges(ranges, text.length)
        .map((range) => ({
            start: range.start - leadingLength,
            end: range.end - leadingLength
        }))
        .map((range) => ({
            start: Math.max(0, range.start),
            end: Math.min(trimmedLength, range.end)
        }))
        .filter((range) => range.start < range.end);
};
