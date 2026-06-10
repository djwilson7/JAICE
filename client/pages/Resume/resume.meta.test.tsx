import { describe, it, expect, vi } from 'vitest';

// Mock the Resume component so we don't need the full render tree
vi.mock('@/pages/Resume/Resume', () => ({
    Resume: () => null,
}));

import { ResumeRoute } from './resume.meta';

describe('resume.meta', () => {
    it('exports a ResumeRoute with path /resume', () => {
        expect(ResumeRoute.path).toBe('/resume');
    });

    it('exports a ResumeRoute with an element', () => {
        expect(ResumeRoute.element).toBeDefined();
    });
});
