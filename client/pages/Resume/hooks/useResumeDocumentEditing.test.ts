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
        expect(result.current.focusedContactField).toBe(`custom_${initialLen}`);
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

    it('moveExperienceUp moves the experience entry up in the list', () => {
        const { result } = getHook();
        act(() => { result.current.setResumeData({ ...result.current.resumeData, experience: [] }); });
        act(() => { result.current.insertExperienceAt(0); });
        act(() => { result.current.insertExperienceAt(1); });
        act(() => { result.current.insertExperienceAt(2); });
        
        const firstId = result.current.resumeData.experience[0].id;
        const secondId = result.current.resumeData.experience[1].id;
        const thirdId = result.current.resumeData.experience[2].id;

        act(() => { result.current.moveExperienceUp(firstId); });
        expect(result.current.resumeData.experience[0].id).toBe(firstId);

        act(() => { result.current.moveExperienceUp(secondId); });
        expect(result.current.resumeData.experience[0].id).toBe(secondId);
        expect(result.current.resumeData.experience[1].id).toBe(firstId);
    });

    it('moveExperienceDown moves the experience entry down in the list', () => {
        const { result } = getHook();
        act(() => { result.current.setResumeData({ ...result.current.resumeData, experience: [] }); });
        act(() => { result.current.insertExperienceAt(0); });
        act(() => { result.current.insertExperienceAt(1); });
        act(() => { result.current.insertExperienceAt(2); });
        
        const firstId = result.current.resumeData.experience[0].id;
        const secondId = result.current.resumeData.experience[1].id;
        const thirdId = result.current.resumeData.experience[2].id;

        act(() => { result.current.moveExperienceDown(thirdId); });
        expect(result.current.resumeData.experience[2].id).toBe(thirdId);

        act(() => { result.current.moveExperienceDown(secondId); });
        expect(result.current.resumeData.experience[1].id).toBe(thirdId);
        expect(result.current.resumeData.experience[2].id).toBe(secondId);
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

    it('retains an empty focused bullet until blur cleanup', () => {
        const { result } = getHook();
        act(() => { result.current.insertExperienceAt(0); });
        const expId = result.current.resumeData.experience[0].id;
        act(() => { result.current.addBulletWithText(expId, 'Original'); });
        const bulletId = result.current.resumeData.experience[0].bullets[0].id;
        act(() => { result.current.updateBulletText(expId, bulletId, '  '); });
        expect(result.current.resumeData.experience[0].bullets).toHaveLength(1);
        act(() => { result.current.removeBulletIfEmpty(expId, bulletId); });
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

    it('inserts a blank bullet after the active bullet and keeps the section focused', () => {
        const { result } = getHook();
        const expId = result.current.resumeData.experience[0].id;
        const bulletId = result.current.resumeData.experience[0].bullets[0].id;

        act(() => result.current.insertBulletAfter(expId, bulletId));

        expect(result.current.resumeData.experience[0].bullets[1].text).toBe('');
        expect(result.current.focusedField).toBe('experience.0.bullets.1');
        expect(result.current.activeDocumentSection).toBe('experience');
    });

    it('updates display titles while preserving section keys', () => {
        const { result } = getHook();
        act(() => result.current.updateSectionTitle('experience', 'Engineering Experience'));
        expect(result.current.resumeData.sectionTitles?.experience).toBe('Engineering Experience');
        expect(result.current.resumeData.experience).toBeDefined();
    });

    it('creates reusable colored tags and toggles bullet references by id', () => {
        const { result } = getHook();
        const expId = result.current.resumeData.experience[0].id;
        const bulletId = result.current.resumeData.experience[0].bullets[0].id;

        act(() => result.current.createAndAssignBulletTag(expId, bulletId, 'Backend'));
        const tag = result.current.resumeData.tagLibrary?.[0];
        expect(tag?.slug).toBe('backend');
        expect(tag?.colorToken).toBe('tag-teal');
        expect(result.current.resumeData.experience[0].bullets[0].tagIds).toEqual([tag?.id]);

        act(() => result.current.toggleBulletTag(expId, bulletId, tag!.id));
        expect(result.current.resumeData.experience[0].bullets[0].tagIds).toEqual([]);

        act(() => result.current.createAndAssignBulletTag(expId, bulletId, 'back-end'));
        expect(result.current.resumeData.tagLibrary).toHaveLength(1);
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

    it('retains an empty education detail until blur cleanup', () => {
        const { result } = getHook();
        act(() => { result.current.addEducation(); });
        const edId = result.current.resumeData.education[0].id;
        act(() => { result.current.addEducationDetailWithText(edId, 'Original'); });
        const detailId = result.current.resumeData.education[0].details[0].id;
        act(() => { result.current.updateEducationDetailText(edId, detailId, '  '); });
        expect(result.current.resumeData.education[0].details).toHaveLength(1);
        act(() => { result.current.removeEducationDetailIfEmpty(edId, detailId); });
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

        act(() => result.current.setHoveredEducationId('ed0'));
        expect(result.current.hoveredEducationId).toBe('ed0');
        
        act(() => result.current.setHoveredExperienceImproveId('e1'));
        expect(result.current.hoveredExperienceImproveId).toBe('e1');
        
        act(() => result.current.setHoveredExperienceClearId('e2'));
        expect(result.current.hoveredExperienceClearId).toBe('e2');

        act(() => result.current.setHoveredEducationClearId('ed2'));
        expect(result.current.hoveredEducationClearId).toBe('ed2');
        
        act(() => result.current.setHoveredExperienceDeleteId('e3'));
        expect(result.current.hoveredExperienceDeleteId).toBe('e3');
        
        act(() => result.current.setHoveredEducationDeleteId('ed1'));
        expect(result.current.hoveredEducationDeleteId).toBe('ed1');
        
        act(() => result.current.setHoveredSkillDeleteId('s1'));
        expect(result.current.hoveredSkillDeleteId).toBe('s1');
        
        act(() => result.current.setActiveDocumentSection('experience'));
        expect(result.current.activeDocumentSection).toBe('header');
        act(() => result.current.setFocusedNameSection(false));
        act(() => result.current.setFocusedContactField(null));
        act(() => result.current.setFocusedSummary(false));
        act(() => result.current.setFocusedField(null));
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
        expect(result.current.focusedField).toBe(bulletPath);
        expect(result.current.hoveredField).toBe(bulletPath);
        act(() => { result.current.removeBulletIfEmpty(expId, bulletId); });
        expect(result.current.resumeData.experience[0].bullets).toHaveLength(0);
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
        expect(result.current.focusedField).toBe(detailPath);
        expect(result.current.hoveredField).toBe(detailPath);
        act(() => { result.current.removeEducationDetailIfEmpty(edId, detailId); });
        expect(result.current.resumeData.education[0].details).toHaveLength(0);
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

    it('covers clear timers, retainExperienceSection, and resetEditorTransientState', () => {
        vi.useFakeTimers();
        const { result } = getHook();
        const expId = result.current.resumeData.experience[0].id;
        const bulletId = result.current.resumeData.experience[0].bullets[0].id;

        // retainExperienceSection is triggered by toggleBulletTag
        act(() => { result.current.toggleBulletTag(expId, bulletId, 'fake-tag'); });
        expect(result.current.activeDocumentSection).toBe('experience');
        
        // Fast forward timer
        act(() => { vi.advanceTimersByTime(6000); });
        expect(result.current.activeDocumentSection).toBeNull();

        // resetEditorTransientState
        act(() => {
            result.current.setHoveredContactField('email');
            result.current.setFocusedContactField('email');
            result.current.resetEditorTransientState();
        });
        expect(result.current.hoveredContactField).toBeNull();
        expect(result.current.focusedContactField).toBeNull();
        
        vi.useRealTimers();
    });

    it('covers focusedDocumentSection branches for skills and sectionTitles', () => {
        const { result } = getHook();
        
        act(() => { result.current.setFocusedField('skills.0.category'); });
        expect(result.current.focusedDocumentSection).toBe('skills');

        act(() => { result.current.setFocusedField('sectionTitles.experience'); });
        expect(result.current.focusedDocumentSection).toBe('experience');

        act(() => { result.current.setFocusedField('invalidFieldPattern'); });
        expect(result.current.focusedDocumentSection).toBeNull();
    });

    it('covers setActiveDocumentSection function arg and exit timeouts', () => {
        vi.useFakeTimers();
        const { result } = getHook();

        // functional state updater
        act(() => {
            result.current.setActiveDocumentSection((prev) => 'education');
        });
        expect(result.current.activeDocumentSection).toBe('education');

        // experience exit timeout branch
        act(() => {
            result.current.setActiveDocumentSection('experience');
        });
        expect(result.current.activeDocumentSection).toBe('experience');

        act(() => {
            result.current.setActiveDocumentSection(null);
        });
        // should still be experience due to exit timeout delay (150ms)
        expect(result.current.activeDocumentSection).toBe('experience');

        act(() => { vi.advanceTimersByTime(200); });
        expect(result.current.activeDocumentSection).toBeNull();

        vi.useRealTimers();
    });

    it('covers deleteBulletTag and remove tag reference from bullets', () => {
        const { result } = getHook();
        const expId = result.current.resumeData.experience[0].id;
        const bulletId = result.current.resumeData.experience[0].bullets[0].id;

        act(() => {
            result.current.createAndAssignBulletTag(expId, bulletId, 'Cloud');
        });
        const tag = result.current.resumeData.tagLibrary?.find(t => t.slug === 'cloud');
        expect(tag).toBeDefined();

        act(() => {
            result.current.deleteBulletTag(tag!.id);
        });
        expect(result.current.resumeData.tagLibrary?.find(t => t.id === tag!.id)).toBeUndefined();
        expect(result.current.resumeData.experience[0].bullets[0].tagIds).toEqual([]);
    });

    it('covers moveEducationUp, moveEducationDown, and clearEducation', () => {
        const { result } = getHook();
        act(() => {
            result.current.setResumeData({ ...result.current.resumeData, education: [] });
        });

        let ed1Id = '';
        let ed2Id = '';
        act(() => {
            ed1Id = result.current.addEducation();
            ed2Id = result.current.addEducation();
        });

        act(() => {
            result.current.updateEducationField(ed1Id, 'school', 'School 1');
            result.current.updateEducationField(ed2Id, 'school', 'School 2');
        });

        // move up (no-op for first)
        act(() => { result.current.moveEducationUp(ed1Id); });
        expect(result.current.resumeData.education[0].id).toBe(ed1Id);

        // move second up
        act(() => { result.current.moveEducationUp(ed2Id); });
        expect(result.current.resumeData.education[0].id).toBe(ed2Id);

        // move first down (no-op for last)
        act(() => { result.current.moveEducationDown(ed1Id); });
        expect(result.current.resumeData.education[1].id).toBe(ed1Id);

        // move second down
        act(() => { result.current.moveEducationDown(ed2Id); });
        expect(result.current.resumeData.education[1].id).toBe(ed2Id);

        // clear education
        act(() => { result.current.clearEducation(ed1Id); });
        expect(result.current.resumeData.education.find(e => e.id === ed1Id)?.school).toBe('');
    });

    it('covers insertEducationDetailAfter and edge cases', () => {
        const { result } = getHook();
        act(() => {
            result.current.setResumeData({ ...result.current.resumeData, education: [] });
        });

        let edId = '';
        act(() => {
            edId = result.current.addEducation();
        });

        act(() => {
            result.current.addEducationDetailWithText(edId, 'GPA 4.0');
        });
        const detailId = result.current.resumeData.education[0].details[0].id;

        act(() => {
            result.current.insertEducationDetailAfter(edId, detailId);
        });
        expect(result.current.resumeData.education[0].details).toHaveLength(2);
        expect(result.current.resumeData.education[0].details[1].text).toBe('');

        // non-existent
        act(() => {
            result.current.insertEducationDetailAfter('fake', 'fake');
        });
    });

    it('covers createSkillCategory, removeSkillCategoryIfEmpty, moveSkillCategoryUp/Down, and clearSkillCategory', () => {
        const { result } = getHook();
        act(() => {
            result.current.setResumeData({ ...result.current.resumeData, skills: [] });
        });

        let s1Id = '';
        let s2Id = '';
        act(() => {
            s1Id = result.current.createSkillCategory('Lang', 'Python, Rust');
            s2Id = result.current.createSkillCategory('Cloud', 'AWS, GCP');
        });

        expect(result.current.resumeData.skills).toHaveLength(2);
        expect(result.current.resumeData.skills[0].category).toBe('Lang');

        // move up (no-op for first)
        act(() => { result.current.moveSkillCategoryUp(s1Id); });
        expect(result.current.resumeData.skills[0].id).toBe(s1Id);

        // move second up
        act(() => { result.current.moveSkillCategoryUp(s2Id); });
        expect(result.current.resumeData.skills[0].id).toBe(s2Id);

        // move first down (no-op for last)
        act(() => { result.current.moveSkillCategoryDown(s1Id); });
        expect(result.current.resumeData.skills[1].id).toBe(s1Id);

        // move second down
        act(() => { result.current.moveSkillCategoryDown(s2Id); });
        expect(result.current.resumeData.skills[1].id).toBe(s2Id);

        // clear skill category
        act(() => { result.current.clearSkillCategory(s1Id); });
        expect(result.current.resumeData.skills.find(s => s.id === s1Id)?.category).toBe('');

        // remove if empty
        act(() => { result.current.removeSkillCategoryIfEmpty(s1Id); });
        expect(result.current.resumeData.skills.find(s => s.id === s1Id)).toBeUndefined();
    });
});

