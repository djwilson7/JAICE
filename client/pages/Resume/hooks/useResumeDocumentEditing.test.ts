import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useResumeDocumentEditing } from './useResumeDocumentEditing';

vi.mock('../resumeDiagnostics', () => ({ isResumeDebugEnabled: () => false }));

describe('useResumeDocumentEditing', () => {
    const getHook = () => renderHook(() => useResumeDocumentEditing());

    // ── Basic init ────────────────────────────────────────────────────────────
    it('initialises with defaultResumeData', () => {
        const { result } = getHook();
        expect(result.current.resumeData).toBeDefined();
        expect(Array.isArray(result.current.resumeData.experience)).toBe(true);
    });

    // ── updateField ───────────────────────────────────────────────────────────
    it('updateField updates a top-level field', () => {
        const { result } = getHook();
        act(() => { result.current.updateField('fullName', 'Alice'); });
        expect(result.current.resumeData.fullName).toBe('Alice');
    });

    // ── customContact ─────────────────────────────────────────────────────────
    it('addCustomContactField appends a new contact', () => {
        const { result } = getHook();
        const initialLen = result.current.resumeData.customContact?.length || 0;
        act(() => { result.current.addCustomContactField(); });
        expect(result.current.resumeData.customContact?.length).toBe(initialLen + 1);
    });

    it('updateCustomContactField updates label and value', () => {
        const { result } = getHook();
        act(() => { result.current.addCustomContactField(); });
        const index = (result.current.resumeData.customContact?.length || 1) - 1;
        act(() => { result.current.updateCustomContactField(index, 'label', 'LinkedIn'); });
        expect(result.current.resumeData.customContact?.[index].label).toBe('LinkedIn');
        act(() => { result.current.updateCustomContactField(index, 'value', 'https://li.com'); });
        expect(result.current.resumeData.customContact?.[index].value).toBe('https://li.com');
    });

    it('updateCustomContactField is a no-op for out-of-bounds index', () => {
        const { result } = getHook();
        expect(() => act(() => { result.current.updateCustomContactField(99, 'label', 'x'); })).not.toThrow();
    });

    it('removeCustomContactField removes by index', () => {
        const { result } = getHook();
        act(() => { result.current.addCustomContactField(); });
        const initialLen = result.current.resumeData.customContact?.length || 1;
        act(() => { result.current.removeCustomContactField(initialLen - 1); });
        expect(result.current.resumeData.customContact?.length).toBe(initialLen - 1);
    });

    // ── removeStandardContactField ────────────────────────────────────────────
    it('removeStandardContactField blanks field and adds to hiddenContactFields', () => {
        const { result } = getHook();
        act(() => { result.current.updateField('email', 'test@test.com'); });
        act(() => { result.current.removeStandardContactField('email'); });
        expect(result.current.resumeData.email).toBe('');
        expect(result.current.resumeData.hiddenContactFields).toContain('email');
    });

    // ── experience ────────────────────────────────────────────────────────────
    it('insertExperienceAt inserts at the given index', () => {
        const { result } = getHook();
        const initialLen = result.current.resumeData.experience.length;
        act(() => { result.current.insertExperienceAt(0); });
        expect(result.current.resumeData.experience).toHaveLength(initialLen + 1);
    });

    it('updateExperienceField updates a field on the matching experience', () => {
        const { result } = getHook();
        act(() => { result.current.insertExperienceAt(0); });
        const id = result.current.resumeData.experience[0].id;
        act(() => { result.current.updateExperienceField(id, 'jobTitle', 'Engineer'); });
        expect(result.current.resumeData.experience.find(e => e.id === id)?.jobTitle).toBe('Engineer');
    });

    it('removeExperience removes the matching entry', () => {
        const { result } = getHook();
        act(() => { result.current.insertExperienceAt(0); });
        const initialLen = result.current.resumeData.experience.length;
        const id = result.current.resumeData.experience[0].id;
        act(() => { result.current.removeExperience(id); });
        expect(result.current.resumeData.experience).toHaveLength(initialLen - 1);
    });

    it('clearExperience blanks fields and bullets', () => {
        const { result } = getHook();
        act(() => { result.current.insertExperienceAt(0); });
        const id = result.current.resumeData.experience[0].id;
        act(() => { result.current.updateExperienceField(id, 'jobTitle', 'Engineer'); });
        act(() => { result.current.clearExperience(id); });
        const exp = result.current.resumeData.experience.find(e => e.id === id);
        expect(exp?.jobTitle).toBe('');
        expect(exp?.bullets).toHaveLength(0);
    });

    // ── bullets ───────────────────────────────────────────────────────────────
    it('addBulletWithText appends a bullet', () => {
        const { result } = getHook();
        act(() => { result.current.insertExperienceAt(0); });
        const id = result.current.resumeData.experience[0].id;
        act(() => { result.current.addBulletWithText(id, 'Did something great'); });
        expect(result.current.resumeData.experience[0].bullets).toHaveLength(1);
    });

    it('addBulletWithText is a no-op for empty/whitespace text', () => {
        const { result } = getHook();
        act(() => { result.current.insertExperienceAt(0); });
        const id = result.current.resumeData.experience[0].id;
        act(() => { result.current.addBulletWithText(id, '   '); });
        expect(result.current.resumeData.experience[0].bullets).toHaveLength(0);
    });

    it('updateBulletText updates existing bullet', () => {
        const { result } = getHook();
        act(() => { result.current.insertExperienceAt(0); });
        const expId = result.current.resumeData.experience[0].id;
        act(() => { result.current.addBulletWithText(expId, 'Original'); });
        const bulletId = result.current.resumeData.experience[0].bullets[0].id;
        act(() => { result.current.updateBulletText(expId, bulletId, 'Updated'); });
        expect(result.current.resumeData.experience[0].bullets[0].text).toBe('Updated');
    });

    it('updateBulletText removes bullet when value is empty', () => {
        const { result } = getHook();
        act(() => { result.current.insertExperienceAt(0); });
        const expId = result.current.resumeData.experience[0].id;
        act(() => { result.current.addBulletWithText(expId, 'Original'); });
        const bulletId = result.current.resumeData.experience[0].bullets[0].id;
        act(() => { result.current.updateBulletText(expId, bulletId, '  '); });
        expect(result.current.resumeData.experience[0].bullets).toHaveLength(0);
    });

    it('removeBullet removes by id', () => {
        const { result } = getHook();
        act(() => { result.current.insertExperienceAt(0); });
        const expId = result.current.resumeData.experience[0].id;
        act(() => { result.current.addBulletWithText(expId, 'Bullet'); });
        const bulletId = result.current.resumeData.experience[0].bullets[0].id;
        act(() => { result.current.removeBullet(expId, bulletId); });
        expect(result.current.resumeData.experience[0].bullets).toHaveLength(0);
    });

    // ── education ─────────────────────────────────────────────────────────────
    it('addEducation appends a new education entry', () => {
        const { result } = getHook();
        const initialLen = result.current.resumeData.education.length;
        act(() => { result.current.addEducation(); });
        expect(result.current.resumeData.education).toHaveLength(initialLen + 1);
    });

    it('updateEducationField updates a field', () => {
        const { result } = getHook();
        act(() => { result.current.addEducation(); });
        const id = result.current.resumeData.education[0].id;
        act(() => { result.current.updateEducationField(id, 'school', 'MIT'); });
        expect(result.current.resumeData.education.find(e => e.id === id)?.school).toBe('MIT');
    });

    it('removeEducation removes by id', () => {
        const { result } = getHook();
        act(() => { result.current.addEducation(); });
        const initialLen = result.current.resumeData.education.length;
        const id = result.current.resumeData.education[0].id;
        act(() => { result.current.removeEducation(id); });
        expect(result.current.resumeData.education).toHaveLength(initialLen - 1);
    });

    it('addEducationDetailWithText appends a detail', () => {
        const { result } = getHook();
        act(() => { result.current.addEducation(); });
        const id = result.current.resumeData.education[0].id;
        act(() => { result.current.addEducationDetailWithText(id, 'Honors'); });
        expect(result.current.resumeData.education[0].details).toHaveLength(1);
    });

    it('addEducationDetailWithText is a no-op for empty text', () => {
        const { result } = getHook();
        act(() => { result.current.addEducation(); });
        const id = result.current.resumeData.education[0].id;
        act(() => { result.current.addEducationDetailWithText(id, '  '); });
        expect(result.current.resumeData.education[0].details).toHaveLength(0);
    });

    it('updateEducationDetailText updates existing detail', () => {
        const { result } = getHook();
        act(() => { result.current.addEducation(); });
        const edId = result.current.resumeData.education[0].id;
        act(() => { result.current.addEducationDetailWithText(edId, 'Original'); });
        const detailId = result.current.resumeData.education[0].details[0].id;
        act(() => { result.current.updateEducationDetailText(edId, detailId, 'Updated'); });
        expect(result.current.resumeData.education[0].details[0].text).toBe('Updated');
    });

    it('updateEducationDetailText removes detail when value is empty', () => {
        const { result } = getHook();
        act(() => { result.current.addEducation(); });
        const edId = result.current.resumeData.education[0].id;
        act(() => { result.current.addEducationDetailWithText(edId, 'Original'); });
        const detailId = result.current.resumeData.education[0].details[0].id;
        act(() => { result.current.updateEducationDetailText(edId, detailId, '  '); });
        expect(result.current.resumeData.education[0].details).toHaveLength(0);
    });

    it('removeEducationDetail removes by id', () => {
        const { result } = getHook();
        act(() => { result.current.addEducation(); });
        const edId = result.current.resumeData.education[0].id;
        act(() => { result.current.addEducationDetailWithText(edId, 'Honors'); });
        const detailId = result.current.resumeData.education[0].details[0].id;
        act(() => { result.current.removeEducationDetail(edId, detailId); });
        expect(result.current.resumeData.education[0].details).toHaveLength(0);
    });

    // ── skills ────────────────────────────────────────────────────────────────
    it('addSkillCategory appends a new category', () => {
        const { result } = getHook();
        const initialLen = result.current.resumeData.skills.length;
        act(() => { result.current.addSkillCategory(); });
        expect(result.current.resumeData.skills).toHaveLength(initialLen + 1);
    });

    it('updateSkillCategoryName updates the category name', () => {
        const { result } = getHook();
        act(() => { result.current.addSkillCategory(); });
        const id = result.current.resumeData.skills[result.current.resumeData.skills.length - 1].id;
        act(() => { result.current.updateSkillCategoryName(id, 'Languages'); });
        const skill = result.current.resumeData.skills.find(s => s.id === id);
        expect(skill?.category).toBe('Languages');
    });

    it('updateSkillCategoryItems parses and stores items', () => {
        const { result } = getHook();
        act(() => { result.current.addSkillCategory(); });
        const id = result.current.resumeData.skills[result.current.resumeData.skills.length - 1].id;
        act(() => { result.current.updateSkillCategoryItems(id, 'Python, Go, Rust'); });
        const skill = result.current.resumeData.skills.find(s => s.id === id);
        expect(skill?.items).toEqual(['Python', 'Go', 'Rust']);
        expect(skill?.rawItems).toBe('Python, Go, Rust');
    });

    it('removeSkillCategory removes by id', () => {
        const { result } = getHook();
        act(() => { result.current.addSkillCategory(); });
        const id = result.current.resumeData.skills[result.current.resumeData.skills.length - 1].id;
        const prevLen = result.current.resumeData.skills.length;
        act(() => { result.current.removeSkillCategory(id); });
        expect(result.current.resumeData.skills).toHaveLength(prevLen - 1);
    });

    // ── hover/focus state setters ─────────────────────────────────────────────
    it('hover and focus setters work', () => {
        const { result } = getHook();
        
        act(() => result.current.setHoveredDeleteIndex('1'));
        expect(result.current.hoveredDeleteIndex).toBe('1');
        
        act(() => result.current.setHoveredContactField('email'));
        expect(result.current.hoveredContactField).toBe('email');
        
        act(() => result.current.setFocusedContactField('phone'));
        expect(result.current.focusedContactField).toBe('phone');
        
        act(() => result.current.setHoveredNameSection(true));
        expect(result.current.hoveredNameSection).toBe(true);
        
        act(() => result.current.setFocusedNameSection(true));
        expect(result.current.focusedNameSection).toBe(true);
        
        act(() => result.current.setHoveredSummary(true));
        expect(result.current.hoveredSummary).toBe(true);
        
        act(() => result.current.setFocusedSummary(true));
        expect(result.current.focusedSummary).toBe(true);
        
        act(() => result.current.setIsSummaryImproveHovered(true));
        expect(result.current.isSummaryImproveHovered).toBe(true);
        
        act(() => result.current.setHoveredField('f1'));
        expect(result.current.hoveredField).toBe('f1');
        
        act(() => result.current.setFocusedField('f2'));
        expect(result.current.focusedField).toBe('f2');
        
        act(() => result.current.setHoveredJobId('j1'));
        expect(result.current.hoveredJobId).toBe('j1');
        
        act(() => result.current.setHoveredExperienceImproveId('e1'));
        expect(result.current.hoveredExperienceImproveId).toBe('e1');
        
        act(() => result.current.setHoveredExperienceClearId('e2'));
        expect(result.current.hoveredExperienceClearId).toBe('e2');
        
        act(() => result.current.setHoveredExperienceDeleteId('e3'));
        expect(result.current.hoveredExperienceDeleteId).toBe('e3');
        
        act(() => result.current.setHoveredEducationDeleteId('ed1'));
        expect(result.current.hoveredEducationDeleteId).toBe('ed1');
        
        act(() => result.current.setHoveredSkillDeleteId('s1'));
        expect(result.current.hoveredSkillDeleteId).toBe('s1');
        
        act(() => result.current.setActiveDocumentSection('experience'));
        expect(result.current.activeDocumentSection).toBe('experience');
    });

    it('updateBulletText handles edge cases', () => {
        const { result } = getHook();
        act(() => { result.current.insertExperienceAt(0); });
        const expId = result.current.resumeData.experience[0].id;
        
        // Non-existent expId
        act(() => { result.current.updateBulletText('fake', 'fake', 'val'); });
        
        // Empty text with path matching focused/hovered field
        act(() => { result.current.addBulletWithText(expId, 'Bullet'); });
        const bulletId = result.current.resumeData.experience[0].bullets[0].id;
        const bulletPath = `experience.0.bullets.0`;
        act(() => { result.current.setFocusedField(bulletPath); });
        act(() => { result.current.setHoveredField(bulletPath); });
        
        act(() => { result.current.updateBulletText(expId, bulletId, '  '); });
        expect(result.current.focusedField).toBe(null);
        expect(result.current.hoveredField).toBe(null);
    });

    it('updateEducationDetailText handles edge cases', () => {
        const { result } = getHook();
        act(() => { result.current.addEducation(); });
        const edId = result.current.resumeData.education[0].id;

        // Non-existent edId
        act(() => { result.current.updateEducationDetailText('fake', 'fake', 'val'); });

        // Empty text with path matching focused/hovered field
        act(() => { result.current.addEducationDetailWithText(edId, 'Detail'); });
        const detailId = result.current.resumeData.education[0].details[0].id;
        const detailPath = `education.${edId}.details.0`;
        act(() => { result.current.setFocusedField(detailPath); });
        act(() => { result.current.setHoveredField(detailPath); });

        act(() => { result.current.updateEducationDetailText(edId, detailId, '  '); });
        expect(result.current.focusedField).toBe(null);
        expect(result.current.hoveredField).toBe(null);
    });

    it('handles missing arrays in resumeData for branch coverage', () => {
        const { result } = getHook();
        act(() => {
            result.current.setResumeData({ 
                fullName: '', 
                contact: {}, 
                experience: undefined as any, 
                education: undefined as any,
                skills: undefined as any,
                customContact: undefined as any,
                hiddenContactFields: undefined as any
            } as any);
        });

        // Test adders when arrays are missing
        act(() => { result.current.addCustomContactField(); });
        expect(result.current.resumeData.customContact).toHaveLength(1);

        act(() => { result.current.addSkillCategory(); });
        expect(result.current.resumeData.skills).toHaveLength(1);

        act(() => { result.current.addEducation(); });
        expect(result.current.resumeData.education).toHaveLength(1);

        act(() => { result.current.insertExperienceAt(0); });
        expect(result.current.resumeData.experience).toHaveLength(1);
        
        act(() => { result.current.removeStandardContactField('email'); });
        expect(result.current.resumeData.hiddenContactFields).toContain('email');
    });

    it('hits branches for missing experience items and bullets', () => {
        const { result } = getHook();
        act(() => {
            result.current.setResumeData({ ...result.current.resumeData, experience: undefined } as any);
        });
        
        act(() => { result.current.updateExperienceField('1', 'jobTitle', 'x'); });
        act(() => { result.current.removeExperience('1'); });
        act(() => { result.current.clearExperience('1'); });
        act(() => { result.current.addBulletWithText('1', 'x'); });
        act(() => { result.current.removeBullet('1', '1'); });
        act(() => { result.current.updateBulletText('1', '1', 'x'); });
        
        expect(result.current.resumeData.experience).toEqual([]);
    });

    it('hits branches for missing education items and details', () => {
        const { result } = getHook();
        act(() => {
            result.current.setResumeData({ ...result.current.resumeData, education: undefined } as any);
        });
        
        act(() => { result.current.updateEducationField('1', 'school', 'x'); });
        act(() => { result.current.removeEducation('1'); });
        act(() => { result.current.addEducationDetailWithText('1', 'x'); });
        act(() => { result.current.removeEducationDetail('1', '1'); });
        act(() => { result.current.updateEducationDetailText('1', '1', 'x'); });
        
        expect(result.current.resumeData.education).toEqual([]);
    });

    it('hits branches for missing skill items', () => {
        const { result } = getHook();
        act(() => {
            result.current.setResumeData({ ...result.current.resumeData, skills: undefined } as any);
        });
        
        act(() => { result.current.updateSkillCategoryName('1', 'x'); });
        act(() => { result.current.updateSkillCategoryItems('1', 'x'); });
        act(() => { result.current.removeSkillCategory('1'); });
        
        expect(result.current.resumeData.skills).toEqual([]);
    });
});
