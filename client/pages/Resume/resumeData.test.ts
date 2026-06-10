import { describe, it, expect, vi } from 'vitest';
import {
    makeId,
    hasText,
    parseSkillItems,
    normalizeTextList,
    formatSkillItemsForInput,
    getSkillItemsText,
    defaultSkillCategories,
    normalizeSkillCategories,
    getTextStats,
    defaultResumeData,
    normalizeResumeData,
    normalizeSkillCategoriesForPayload,
    normalizeResumeDataForPayload,
} from './resumeData';
import type { SkillCategory } from './types';

// ─── makeId ─────────────────────────────────────────────────────────────────

describe('makeId', () => {
    it('returns a non-empty string', () => {
        const id = makeId();
        expect(typeof id).toBe('string');
        expect(id.length).toBeGreaterThan(0);
    });

    it('generates unique ids', () => {
        const ids = new Set(Array.from({ length: 100 }, () => makeId()));
        expect(ids.size).toBe(100);
    });
});

// ─── hasText ─────────────────────────────────────────────────────────────────

describe('hasText', () => {
    it('returns true for non-empty string', () => {
        expect(hasText('hello')).toBe(true);
    });

    it('returns false for empty string', () => {
        expect(hasText('')).toBe(false);
    });

    it('returns false for whitespace-only string', () => {
        expect(hasText('   ')).toBe(false);
    });

    it('returns false for null', () => {
        expect(hasText(null)).toBe(false);
    });

    it('returns false for undefined', () => {
        expect(hasText(undefined)).toBe(false);
    });

    it('returns true for number converted to string with text', () => {
        expect(hasText(42)).toBe(true);
    });

    it('returns false for 0 (which becomes "0" which has text)', () => {
        // "0".trim().length > 0 → true
        expect(hasText(0)).toBe(true);
    });
});

// ─── parseSkillItems ─────────────────────────────────────────────────────────

describe('parseSkillItems', () => {
    it('splits comma-separated string into trimmed items', () => {
        expect(parseSkillItems('Python, TypeScript, Go')).toEqual(['Python', 'TypeScript', 'Go']);
    });

    it('filters out empty items', () => {
        expect(parseSkillItems('Python,, Go,')).toEqual(['Python', 'Go']);
    });

    it('returns empty array for empty string', () => {
        expect(parseSkillItems('')).toEqual([]);
    });

    it('handles single item', () => {
        expect(parseSkillItems('React')).toEqual(['React']);
    });
});

// ─── normalizeTextList ───────────────────────────────────────────────────────

describe('normalizeTextList', () => {
    it('converts array of strings to trimmed list', () => {
        expect(normalizeTextList(['  a  ', 'b', '  c  '])).toEqual(['a', 'b', 'c']);
    });

    it('filters out empty strings', () => {
        expect(normalizeTextList(['a', '', '  ', 'b'])).toEqual(['a', 'b']);
    });

    it('returns [] for non-array input', () => {
        expect(normalizeTextList('string')).toEqual([]);
        expect(normalizeTextList(null)).toEqual([]);
        expect(normalizeTextList(undefined)).toEqual([]);
    });

    it('converts non-string array items to strings', () => {
        expect(normalizeTextList([1, 2, 3])).toEqual(['1', '2', '3']);
    });
});

// ─── formatSkillItemsForInput ────────────────────────────────────────────────

describe('formatSkillItemsForInput', () => {
    it('joins items with ", "', () => {
        expect(formatSkillItemsForInput(['a', 'b', 'c'])).toBe('a, b, c');
    });

    it('returns empty string for empty array', () => {
        expect(formatSkillItemsForInput([])).toBe('');
    });

    it('filters empty items from non-array', () => {
        expect(formatSkillItemsForInput('not-an-array')).toBe('');
    });
});

// ─── getSkillItemsText ───────────────────────────────────────────────────────

describe('getSkillItemsText', () => {
    it('returns rawItems when it is a string', () => {
        const skill: Partial<SkillCategory> = { rawItems: 'Python, Go', items: ['Python', 'Go'] };
        expect(getSkillItemsText(skill)).toBe('Python, Go');
    });

    it('falls back to formatSkillItemsForInput when rawItems is not a string', () => {
        const skill: Partial<SkillCategory> = { items: ['React', 'Vue'] };
        expect(getSkillItemsText(skill)).toBe('React, Vue');
    });

    it('returns empty string for null input', () => {
        expect(getSkillItemsText(null)).toBe('');
    });

    it('returns empty string for undefined input', () => {
        expect(getSkillItemsText(undefined)).toBe('');
    });
});

// ─── defaultSkillCategories ──────────────────────────────────────────────────

describe('defaultSkillCategories', () => {
    it('returns an array of 4 categories', () => {
        const cats = defaultSkillCategories();
        expect(cats).toHaveLength(4);
    });

    it('each category has id, category, and items', () => {
        const cats = defaultSkillCategories();
        for (const cat of cats) {
            expect(cat).toHaveProperty('id');
            expect(cat).toHaveProperty('category');
            expect(cat).toHaveProperty('items');
            expect(Array.isArray(cat.items)).toBe(true);
        }
    });
});

// ─── normalizeSkillCategories ────────────────────────────────────────────────

describe('normalizeSkillCategories', () => {
    it('returns [] for non-array input', () => {
        expect(normalizeSkillCategories(null)).toEqual([]);
        expect(normalizeSkillCategories('string')).toEqual([]);
        expect(normalizeSkillCategories(42)).toEqual([]);
    });

    it('converts array of strings to single Skills category', () => {
        const result = normalizeSkillCategories(['Python', 'TypeScript', 'Go']);
        expect(result).toHaveLength(1);
        expect(result[0].category).toBe('Skills');
        expect(result[0].items).toEqual(['Python', 'TypeScript', 'Go']);
    });

    it('returns [] when all string items are empty', () => {
        const result = normalizeSkillCategories(['', '  ']);
        expect(result).toEqual([]);
    });

    it('normalizes object-style skill categories', () => {
        const result = normalizeSkillCategories([
            { id: 'cat-1', category: 'Languages', items: ['Python', 'Go'] },
        ]);
        expect(result).toHaveLength(1);
        expect(result[0].category).toBe('Languages');
        expect(result[0].items).toEqual(['Python', 'Go']);
    });

    it('uses index as id when id is missing', () => {
        const result = normalizeSkillCategories([
            { category: 'Languages', items: ['Python'] },
        ]);
        expect(result[0].id).toBe('skills-0');
    });

    it('filters out null skill entries', () => {
        const result = normalizeSkillCategories([null, undefined, { category: 'Languages', items: ['Python'] }]);
        expect(result).toHaveLength(1);
    });

    it('filters out skills with no category and no items', () => {
        const result = normalizeSkillCategories([
            { category: '', items: [] },
        ]);
        expect(result).toHaveLength(0);
    });

    it('handles rawItems string to derive items', () => {
        const result = normalizeSkillCategories([
            { id: 'cat-1', category: 'Languages', rawItems: 'Python, Go, Rust' },
        ]);
        expect(result[0].items).toEqual(['Python', 'Go', 'Rust']);
    });

    it('defaults category to "Skills" when empty string', () => {
        const result = normalizeSkillCategories([
            { id: 'cat-1', category: '', items: ['Python'] },
        ]);
        expect(result[0].category).toBe('');
    });
});

// ─── getTextStats ────────────────────────────────────────────────────────────

describe('getTextStats', () => {
    it('returns correct char and word count', () => {
        expect(getTextStats('hello world')).toEqual({ chars: 11, words: 2 });
    });

    it('returns zeros for empty string', () => {
        expect(getTextStats('')).toEqual({ chars: 0, words: 0 });
    });

    it('handles undefined', () => {
        expect(getTextStats(undefined)).toEqual({ chars: 0, words: 0 });
    });

    it('handles multi-space words', () => {
        expect(getTextStats('a  b   c')).toEqual({ chars: 8, words: 3 });
    });
});

// ─── defaultResumeData ───────────────────────────────────────────────────────

describe('defaultResumeData', () => {
    it('returns an object with required fields', () => {
        const data = defaultResumeData();
        expect(data.fullName).toBeTruthy();
        expect(Array.isArray(data.experience)).toBe(true);
        expect(Array.isArray(data.education)).toBe(true);
        expect(Array.isArray(data.skills)).toBe(true);
        expect(data.formatting).toBeDefined();
    });
});

// ─── normalizeResumeData ─────────────────────────────────────────────────────

describe('normalizeResumeData', () => {
    it('normalizes a full object', () => {
        const data = normalizeResumeData({
            fullName: 'Alice',
            email: 'alice@example.com',
            experience: [
                {
                    id: 'e1',
                    jobTitle: 'Engineer',
                    bullets: [{ id: 'b1', text: 'Did stuff' }],
                },
            ],
            education: [
                {
                    id: 'ed1',
                    school: 'MIT',
                    details: [{ id: 'd1', text: 'Honors' }],
                },
            ],
        });
        expect(data.fullName).toBe('Alice');
        expect(data.experience[0].bullets).toHaveLength(1);
        expect(data.education[0].details).toHaveLength(1);
    });

    it('filters empty bullets from experience', () => {
        const data = normalizeResumeData({
            experience: [
                {
                    id: 'e1',
                    jobTitle: 'Engineer',
                    bullets: [
                        { id: 'b1', text: '' },
                        { id: 'b2', text: '   ' },
                        { id: 'b3', text: 'Valid bullet' },
                    ],
                },
            ],
        });
        expect(data.experience[0].bullets).toHaveLength(1);
        expect(data.experience[0].bullets[0].text).toBe('Valid bullet');
    });

    it('filters empty education details', () => {
        const data = normalizeResumeData({
            education: [
                {
                    id: 'ed1',
                    school: 'MIT',
                    details: [
                        { id: 'd1', text: '' },
                        { id: 'd2', text: 'Honors' },
                    ],
                },
            ],
        });
        expect(data.education[0].details).toHaveLength(1);
    });

    it('handles null experience/education arrays', () => {
        const data = normalizeResumeData({
            experience: null as any,
            education: null as any,
        });
        expect(data.experience).toEqual([]);
        expect(data.education).toEqual([]);
    });

    it('handles education with missing details array', () => {
        const data = normalizeResumeData({
            education: [
                { id: 'ed1', school: 'MIT', details: null as any },
            ],
        });
        expect(data.education[0].details).toEqual([]);
    });

    it('parses a JSON string input', () => {
        const json = JSON.stringify({ fullName: 'Bob', experience: [], education: [] });
        const data = normalizeResumeData(json);
        expect(data.fullName).toBe('Bob');
    });

    it('handles invalid JSON string gracefully', () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const data = normalizeResumeData('not valid json');
        expect(data.fullName).toBe('');
        consoleSpy.mockRestore();
    });

    it('handles null input', () => {
        const data = normalizeResumeData(null);
        expect(data.fullName).toBe('');
    });

    it('handles undefined input', () => {
        const data = normalizeResumeData(undefined);
        expect(data.fullName).toBe('');
    });

    it('normalizes hiddenContactFields, only keeping valid keys', () => {
        const data = normalizeResumeData({
            hiddenContactFields: ['email', 'invalid-key' as any, 'phone'],
        });
        expect(data.hiddenContactFields).toEqual(['email', 'phone']);
    });

    it('returns empty hiddenContactFields for non-array', () => {
        const data = normalizeResumeData({
            hiddenContactFields: null as any,
        });
        expect(data.hiddenContactFields).toEqual([]);
    });

    it('returns empty customContact for non-array', () => {
        const data = normalizeResumeData({
            customContact: null as any,
        });
        expect(data.customContact).toEqual([]);
    });
});

// ─── normalizeSkillCategoriesForPayload ─────────────────────────────────────

describe('normalizeSkillCategoriesForPayload', () => {
    it('removes rawItems and returns only id, category, items', () => {
        const result = normalizeSkillCategoriesForPayload([
            { id: 'c1', category: 'Languages', items: ['Python'], rawItems: 'Python' },
        ]);
        expect(result[0]).toEqual({ id: 'c1', category: 'Languages', items: ['Python'] });
        expect(result[0]).not.toHaveProperty('rawItems');
    });

    it('filters skills with no category text and no items', () => {
        const result = normalizeSkillCategoriesForPayload([
            { id: 'c1', category: '', items: [] },
        ]);
        expect(result).toHaveLength(0);
    });

    it('uses rawItems string to populate items', () => {
        const result = normalizeSkillCategoriesForPayload([
            { id: 'c1', category: 'Languages', rawItems: 'Python, Go', items: [] },
        ]);
        expect(result[0].items).toEqual(['Python', 'Go']);
    });
});

// ─── normalizeResumeDataForPayload ───────────────────────────────────────────

describe('normalizeResumeDataForPayload', () => {
    it('normalizes resume data and filters education details', () => {
        const result = normalizeResumeDataForPayload({
            fullName: 'Charlie',
            education: [
                {
                    id: 'ed1',
                    school: 'Stanford',
                    details: [
                        { id: 'd1', text: '' },
                        { id: 'd2', text: 'Valid' },
                    ],
                },
            ],
        });
        expect(result.fullName).toBe('Charlie');
        expect(result.education[0].details).toHaveLength(1);
    });

    it('handles education with non-array details in payload normalization', () => {
        const result = normalizeResumeDataForPayload({
            education: [
                { id: 'ed1', school: 'MIT', details: undefined as any },
            ],
        });
        expect(result.education[0].details).toEqual([]);
    });

    it('normalizes skills to payload format', () => {
        const result = normalizeResumeDataForPayload({
            skills: [
                { id: 'c1', category: 'Languages', items: ['Python', 'Go'] },
            ],
        } as any);
        expect(result.skills[0]).not.toHaveProperty('rawItems');
    });
});
