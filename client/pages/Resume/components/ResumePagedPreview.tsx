import React from "react";
import type { FontPreviewTarget, PaperMetrics, ResumeData, ResumeFormatting } from "../types";
import { buildResumeRenderTokens } from "../formatting";
import { getSectionTitle, hasText } from "../resumeData";
import { RESUME_DOCUMENT_TYPOGRAPHY } from "../resumeTypography";
import { ptToPx, pxToPt } from "../utils/documentUnits";

type ResumePagedPreviewProps = {
    resumeData: ResumeData;
    formatting: ResumeFormatting;
    paperMetrics: PaperMetrics;
    layoutKey: string;
    pageCount: number;
    pageGapPx: number;
    columnCount: number;
    fontPreviewTarget: FontPreviewTarget | null;
    isMarginPreviewVisible: boolean;
    isPageFormatPreviewVisible: boolean;
    isSectionGapPreviewVisible: boolean;
    registerResumeDocumentContentElement: (element: HTMLDivElement | null) => void;
    onRenderedPageCountChange: (pageCount: number) => void;
};

type PageSegment = {
    id: string;
    estimatedHeight: number;
    render: (key: string) => React.ReactNode;
    split?: (availableHeight: number) => { head: PageSegment | null; tail: PageSegment | null };
};

type MeasuredSegmentHeightsState = {
    layoutKey: string;
    heights: Record<string, number>;
};

const MIN_SPLITTABLE_TEXT_HEIGHT_PT = 18;

const renderMeasuredSegment = (segment: PageSegment, key: string) => {
    const node = segment.render(key);
    if (React.isValidElement(node)) {
        return React.cloneElement(
            node as React.ReactElement<Record<string, unknown>>,
            { "data-preview-segment-id": segment.id }
        );
    }

    return (
        <div key={key} data-preview-segment-id={segment.id}>
            {node}
        </div>
    );
};

const estimateWrappedTextHeight = (text: string, widthPt: number, fontSizePt: number, lineHeight: number, verticalPaddingPt = 0) => {
    const averageCharacterWidth = fontSizePt * 0.62;
    const charactersPerLine = Math.max(12, Math.floor(widthPt / averageCharacterWidth));
    const lineCount = Math.max(1, Math.ceil(String(text || " ").length / charactersPerLine));
    return lineCount * fontSizePt * lineHeight + verticalPaddingPt;
};

const splitWordsForHeight = (
    text: string,
    availableHeight: number,
    widthPt: number,
    fontSizePt: number,
    lineHeight: number,
    verticalPaddingPt = 0
) => {
    const words = text.trim().split(/\s+/).filter(Boolean);
    if (words.length <= 1) return { head: "", tail: text };

    let low = 1;
    let high = words.length - 1;
    let best = 0;

    while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        const candidate = words.slice(0, mid).join(" ");
        const height = estimateWrappedTextHeight(candidate, widthPt, fontSizePt, lineHeight, verticalPaddingPt);
        if (height <= availableHeight) {
            best = mid;
            low = mid + 1;
        } else {
            high = mid - 1;
        }
    }

    if (best <= 0) return { head: "", tail: text };
    return {
        head: words.slice(0, best).join(" "),
        tail: words.slice(best).join(" ")
    };
};

const canSplitIntoHeight = (availableHeight: number) => availableHeight >= MIN_SPLITTABLE_TEXT_HEIGHT_PT;

const paginateSegments = (segments: PageSegment[], pageContentHeight: number) => {
    const pages: PageSegment[][] = [];
    let currentPage: PageSegment[] = [];
    let remainingHeight = pageContentHeight;
    const queue = [...segments];

    const finishPage = () => {
        pages.push(currentPage);
        currentPage = [];
        remainingHeight = pageContentHeight;
    };

    while (queue.length > 0) {
        const segment = queue.shift();
        if (!segment) continue;

        if (segment.estimatedHeight <= remainingHeight || currentPage.length === 0) {
            if (segment.estimatedHeight > remainingHeight && segment.split) {
                const { head, tail } = segment.split(remainingHeight);
                if (!head && tail && currentPage.length === 0) {
                    currentPage.push(tail);
                    remainingHeight = 0;
                    continue;
                }
                if (head) currentPage.push(head);
                finishPage();
                if (tail) queue.unshift(tail);
                continue;
            }

            currentPage.push(segment);
            remainingHeight -= Math.min(segment.estimatedHeight, remainingHeight);
            continue;
        }

        if (segment.split) {
            const { head, tail } = segment.split(remainingHeight);
            if (head) currentPage.push(head);
            finishPage();
            if (tail) queue.unshift(tail);
            continue;
        }

        finishPage();
        queue.unshift(segment);
    }

    if (currentPage.length > 0 || pages.length === 0) {
        pages.push(currentPage);
    }

    return pages;
};

export const ResumePagedPreview: React.FC<ResumePagedPreviewProps> = ({
    resumeData,
    formatting,
    paperMetrics,
    layoutKey,
    pageCount,
    pageGapPx,
    columnCount,
    fontPreviewTarget,
    isMarginPreviewVisible,
    isPageFormatPreviewVisible,
    isSectionGapPreviewVisible,
    registerResumeDocumentContentElement,
    onRenderedPageCountChange
}) => {
    const measurementRef = React.useRef<HTMLDivElement | null>(null);
    const [measuredSegmentHeightsState, setMeasuredSegmentHeightsState] = React.useState<MeasuredSegmentHeightsState>({
        layoutKey,
        heights: {}
    });
    const renderTokens = buildResumeRenderTokens(formatting, paperMetrics);
    const {
        contentWidth,
        contentHeight,
        contentWidthPt,
        contentHeightPt,
        sectionGapPt: sectionGap,
        innerSectionGapPt: innerSectionGap,
        titleLineHeight,
        headerLineHeight,
        subHeaderLineHeight,
        bodyLineHeight,
        documentCssVariables,
        fieldPadding,
        titlePadding,
        headingStyle,
        bodyTextStyle,
        contactTextStyle,
        metaTextStyle
    } = renderTokens;
    const fieldPaddingPx = RESUME_DOCUMENT_TYPOGRAPHY.fieldVerticalPaddingPx * 2;
    const fieldPaddingPt = pxToPt(fieldPaddingPx);
    const headingHeight =
        renderTokens.formatting.headerFontSize * headerLineHeight +
        pxToPt(RESUME_DOCUMENT_TYPOGRAPHY.sectionHeadingPaddingBottomPx) +
        pxToPt(RESUME_DOCUMENT_TYPOGRAPHY.sectionHeadingMarginBottomPx) +
        pxToPt(1);

    const hiddenContactFields = new Set(resumeData.hiddenContactFields || []);
    const contactItems = [
        !hiddenContactFields.has("location") ? resumeData.location : "",
        !hiddenContactFields.has("phone") ? resumeData.phone : "",
        !hiddenContactFields.has("email") ? resumeData.email : "",
        !hiddenContactFields.has("linkedin") ? resumeData.linkedin : "",
        !hiddenContactFields.has("website") ? resumeData.website : "",
        !hiddenContactFields.has("github") ? resumeData.github : "",
        ...(resumeData.customContact || []).map((field) => field.value)
    ].map((item) => String(item || "").trim()).filter(Boolean);
    const contactRows: string[][] = [];
    for (let i = 0; i < contactItems.length; i += 3) {
        contactRows.push(contactItems.slice(i, i + 3));
    }

    const sectionStyle: React.CSSProperties = {
        marginBottom: 0,
        textAlign: "left",
        width: "100%"
    };
    const textWidthPt = Math.max(1, contentWidthPt - pxToPt(RESUME_DOCUMENT_TYPOGRAPHY.fieldHorizontalPaddingPx * 2));
    const bulletTextWidthPt = Math.max(1, textWidthPt - pxToPt(RESUME_DOCUMENT_TYPOGRAPHY.bulletIndentPx + RESUME_DOCUMENT_TYPOGRAPHY.bulletGapPx) - renderTokens.formatting.bodyFontSize);

    const makeHeadingSegment = (id: string, title: string): PageSegment => ({
        id,
        estimatedHeight: headingHeight,
        render: (key) => <h2 key={key} className="resume-header-font-target resume-document__section-title" style={headingStyle}>{title}</h2>
    });

    const makeParagraphSegment = (id: string, text: string): PageSegment => {
        const estimatedHeight = estimateWrappedTextHeight(text, textWidthPt, renderTokens.formatting.bodyFontSize, bodyLineHeight, fieldPaddingPt);
        return {
            id,
            estimatedHeight,
            render: (key) => <p key={key} className="resume-body-font-target resume-document__body" style={{ ...bodyTextStyle, margin: 0, padding: fieldPadding }}>{text}</p>,
            split: (availableHeight) => {
                const split = splitWordsForHeight(text, availableHeight, textWidthPt, renderTokens.formatting.bodyFontSize, bodyLineHeight, fieldPaddingPt);
                return {
                    head: split.head ? makeParagraphSegment(`${id}-head`, split.head) : null,
                    tail: split.tail ? makeParagraphSegment(`${id}-tail`, split.tail) : null
                };
            }
        };
    };

    const makeBulletSegment = (id: string, text: string): PageSegment => {
        const estimatedHeight = estimateWrappedTextHeight(text, bulletTextWidthPt, renderTokens.formatting.bodyFontSize, bodyLineHeight, fieldPaddingPt);
        return {
            id,
            estimatedHeight,
            render: (key) => (
                <div key={key} className="resume-diagnostic-bullet-row" data-resume-diagnostic="bullet-row" style={{ display: "flex", alignItems: "flex-start", gap: RESUME_DOCUMENT_TYPOGRAPHY.bulletGapPx, marginLeft: RESUME_DOCUMENT_TYPOGRAPHY.bulletIndentPx }}>
                    <span className="resume-body-font-target resume-document__body" style={{ ...bodyTextStyle, display: "inline-block", flexShrink: 0, padding: `${RESUME_DOCUMENT_TYPOGRAPHY.fieldVerticalPaddingPx}px 0`, color: "#475569" }}>&bull;</span>
                    <div className="resume-body-font-target resume-document__body" style={{ ...bodyTextStyle, flex: "1 1 auto", minWidth: 0, padding: fieldPadding, wordBreak: "break-word" }}>{text}</div>
                </div>
            ),
            split: (availableHeight) => {
                if (!canSplitIntoHeight(availableHeight)) {
                    return { head: null, tail: makeBulletSegment(id, text) };
                }

                const split = splitWordsForHeight(text, availableHeight, bulletTextWidthPt, renderTokens.formatting.bodyFontSize, bodyLineHeight, fieldPaddingPt);
                return {
                    head: split.head ? makeBulletSegment(`${id}-head`, split.head) : null,
                    tail: split.tail ? makeBulletSegment(`${id}-tail`, split.tail) : null
                };
            }
        };
    };

    const makeSkillSegment = (id: string, category: string, items: string[]): PageSegment => {
        const visibleItems = items.filter(hasText);
        const itemsText = visibleItems.join(", ");
        const text = `${category || ""}${category && itemsText ? ": " : ""}${itemsText}`;
        const categoryWidth = hasText(category)
            ? estimateWrappedTextHeight(category, textWidthPt, renderTokens.formatting.subHeaderFontSize, subHeaderLineHeight, fieldPaddingPt)
            : 0;
        const estimatedHeight = Math.max(
            categoryWidth,
            estimateWrappedTextHeight(text, textWidthPt, renderTokens.formatting.bodyFontSize, bodyLineHeight, fieldPaddingPt)
        );

        return {
            id,
            estimatedHeight,
        render: (key) => (
                <div key={key} style={{ ...bodyTextStyle, display: "flex", alignItems: "flex-start", justifyContent: "flex-start", gap: RESUME_DOCUMENT_TYPOGRAPHY.metaGroupGapPx }}>
                    {hasText(category) && <strong className="resume-subheader-font-target resume-document__meta" style={{ ...metaTextStyle, flexShrink: 0, padding: fieldPadding, color: "#0f172a", fontWeight: 700 }}>{category}</strong>}
                    {hasText(category) && visibleItems.length > 0 && <span style={{ flexShrink: 0, paddingTop: 4, fontWeight: 700, lineHeight: 1, color: "#0f172a" }}>:</span>}
                    <span className="resume-body-font-target resume-document__body" style={{ minWidth: 0, padding: fieldPadding }}>{itemsText}</span>
                </div>
            ),
            split: (availableHeight) => {
                if (!canSplitIntoHeight(availableHeight) || visibleItems.length <= 1) {
                    return { head: null, tail: makeSkillSegment(id, category, visibleItems) };
                }

                const split = splitWordsForHeight(itemsText, availableHeight, textWidthPt, renderTokens.formatting.bodyFontSize, bodyLineHeight, fieldPaddingPt);
                return {
                    head: split.head ? makeSkillSegment(`${id}-head`, category, split.head.split(/,\s*|\s+/).filter(Boolean)) : null,
                    tail: split.tail ? makeSkillSegment(`${id}-tail`, category, split.tail.split(/,\s*|\s+/).filter(Boolean)) : null
                };
            }
        };
    };

    const makeGapSegment = (id: string, height: number): PageSegment => ({
        id,
        estimatedHeight: height,
        render: (key) => (
            <div key={key} style={{ height: ptToPx(height), position: "relative" }}>
                {isSectionGapPreviewVisible && (
                    <div
                        className="resume-section-gap-preview"
                        style={{
                            height: `${ptToPx(height)}px`,
                            top: 0
                        }}
                    />
                )}
            </div>
        )
    });

    const segments: PageSegment[] = (() => {
        const nextSegments: PageSegment[] = [];
        const subHeaderFieldStyle = (weight: React.CSSProperties["fontWeight"], color: string): React.CSSProperties => ({
            ...metaTextStyle,
            flexShrink: 0,
            padding: fieldPadding,
            color,
            fontWeight: weight
        });
        const contactFieldStyle: React.CSSProperties = {
            ...contactTextStyle,
            flexShrink: 0
        };

        nextSegments.push({
            id: "header",
            estimatedHeight:
                renderTokens.formatting.titleFontSize * titleLineHeight +
                pxToPt(RESUME_DOCUMENT_TYPOGRAPHY.titleVerticalPaddingPx * 2) +
                contactRows.length * renderTokens.formatting.bodyFontSize * bodyLineHeight +
                pxToPt(Math.max(0, contactRows.length - 1) * RESUME_DOCUMENT_TYPOGRAPHY.contactStackGapPx),
            render: (key) => (
                <section key={key} style={sectionStyle}>
                    <h1
                        className="resume-title-font-target resume-document__title"
                        style={{
                            margin: "0 0 2px",
                            padding: titlePadding,
                            textAlign: "center",
                            fontSize: "var(--resume-title-font-size)",
                            lineHeight: "var(--resume-title-line-height)",
                            fontFamily: RESUME_DOCUMENT_TYPOGRAPHY.titleFamily,
                            fontWeight: RESUME_DOCUMENT_TYPOGRAPHY.strongWeight,
                            color: "#0f172a"
                        }}
                    >
                        {resumeData.fullName || "Your Name"}
                    </h1>
                    {contactRows.length > 0 && (
                        <div className="resume-body-font-target resume-document__body" style={{ ...contactTextStyle, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: RESUME_DOCUMENT_TYPOGRAPHY.contactStackGapPx }}>
                            {contactRows.map((row, rowIndex) => (
                                <div className="resume-body-font-target resume-document__body" key={`contact-row-${rowIndex}`} style={{ ...contactTextStyle, display: "flex", alignItems: "center", justifyContent: "center", gap: RESUME_DOCUMENT_TYPOGRAPHY.contactRowGapPx, flexWrap: "wrap" }}>
                                    {row.map((item, index) => (
                                        <React.Fragment key={`${item}-${index}`}>
                                            {index > 0 && <span className="resume-body-font-target resume-document__body" style={{ ...contactFieldStyle, color: "#cbd5e1" }}>&bull;</span>}
                                            <span className="resume-body-font-target resume-document__body" style={contactFieldStyle}>{item}</span>
                                        </React.Fragment>
                                    ))}
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            )
        });

        if (
            resumeData.summary ||
            (resumeData.experience || []).some((exp) =>
                hasText(exp.jobTitle) ||
                hasText(exp.company) ||
                hasText(exp.location) ||
                hasText(exp.startDate) ||
                hasText(exp.endDate) ||
                (exp.bullets || []).some((bullet) => hasText(bullet.text))
            ) ||
            (resumeData.education || []).some((ed) =>
                hasText(ed.degree) ||
                hasText(ed.school) ||
                hasText(ed.startDate) ||
                hasText(ed.endDate) ||
                (ed.details || []).some((detail) => hasText(detail.text))
            ) ||
            (resumeData.skills || []).some((skill) => hasText(skill.category) || (skill.items || []).some(hasText))
        ) {
            nextSegments.push(makeGapSegment("header-gap", sectionGap));
        }

        if (resumeData.summary) {
            nextSegments.push(makeHeadingSegment("summary-heading", getSectionTitle(resumeData, "summary")));
            nextSegments.push(makeParagraphSegment("summary-body", resumeData.summary));
            nextSegments.push(makeGapSegment("summary-gap", sectionGap));
        }

        const visibleExperience = (resumeData.experience || []).filter((exp) =>
            hasText(exp.jobTitle) ||
            hasText(exp.company) ||
            hasText(exp.location) ||
            hasText(exp.startDate) ||
            hasText(exp.endDate) ||
            (exp.bullets || []).some((bullet) => hasText(bullet.text))
        );
        if (visibleExperience.length > 0) {
            nextSegments.push(makeHeadingSegment("experience-heading", getSectionTitle(resumeData, "experience")));
            visibleExperience.forEach((exp, expIndex) => {
                const metaFields = [
                    { value: exp.jobTitle, weight: 700, color: "#0f172a" },
                    { value: exp.company, weight: 600, color: "#1f2937" },
                    { value: exp.location, weight: 600, color: "#475569" }
                ].filter((field) => hasText(field.value));
                const dateFields = [exp.startDate, exp.endDate].filter(hasText);
                if (metaFields.length > 0 || dateFields.length > 0) {
                    nextSegments.push({
                        id: `${exp.id}-meta`,
                        estimatedHeight: renderTokens.formatting.subHeaderFontSize * subHeaderLineHeight + fieldPaddingPt + pxToPt(RESUME_DOCUMENT_TYPOGRAPHY.metaRowToBulletGapPx),
                        render: (key) => (
                            <div key={key} className="resume-subheader-font-target resume-document__meta" style={{ ...metaTextStyle, display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: `${RESUME_DOCUMENT_TYPOGRAPHY.dateGroupGapPx}px ${RESUME_DOCUMENT_TYPOGRAPHY.metaDateGapPx}px`, marginBottom: (exp.bullets || []).some((bullet) => hasText(bullet.text)) ? RESUME_DOCUMENT_TYPOGRAPHY.metaRowToBulletGapPx : 0 }}>
                                <div style={{ display: "flex", alignItems: "baseline", flexWrap: "wrap", gap: RESUME_DOCUMENT_TYPOGRAPHY.metaGroupGapPx, minWidth: 0, flex: "1 1 auto", overflow: "visible" }}>
                                    {metaFields.map((field, index) => (
                                        <React.Fragment key={`${field.value}-${index}`}>
                                            {index > 0 && <span style={{ color: "#cbd5e1", flexShrink: 0 }}>|</span>}
                                            <span className="resume-subheader-font-target resume-document__meta" style={subHeaderFieldStyle(field.weight, field.color)}>{field.value}</span>
                                        </React.Fragment>
                                    ))}
                                </div>
                                {dateFields.length > 0 && (
                                    <div style={{ display: "flex", alignItems: "baseline", flexWrap: "wrap", gap: RESUME_DOCUMENT_TYPOGRAPHY.dateGroupGapPx, flexShrink: 0 }}>
                                        {dateFields.map((date, index) => (
                                            <React.Fragment key={`${date}-${index}`}>
                                                {index > 0 && <span style={{ color: "#cbd5e1" }}>-</span>}
                                                <span className="resume-subheader-font-target resume-document__meta" style={subHeaderFieldStyle(500, "#475569")}>{date}</span>
                                            </React.Fragment>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )
                    });
                }
                (exp.bullets || []).filter((bullet) => hasText(bullet.text)).forEach((bullet) => {
                    nextSegments.push(makeBulletSegment(`${exp.id}-${bullet.id}`, bullet.text));
                });
                if (expIndex < visibleExperience.length - 1) {
                    nextSegments.push(makeGapSegment(`${exp.id}-gap`, innerSectionGap));
                }
            });
            nextSegments.push(makeGapSegment("experience-gap", sectionGap));
        }

        const visibleEducation = (resumeData.education || []).filter((ed) =>
            hasText(ed.degree) ||
            hasText(ed.school) ||
            hasText(ed.startDate) ||
            hasText(ed.endDate) ||
            (ed.details || []).some((detail) => hasText(detail.text))
        );
        if (visibleEducation.length > 0) {
            nextSegments.push(makeHeadingSegment("education-heading", getSectionTitle(resumeData, "education")));
            visibleEducation.forEach((ed, edIndex) => {
                const metaFields = [
                    { value: ed.degree, weight: 700, color: "#0f172a" },
                    { value: ed.school, weight: 600, color: "#1f2937" }
                ].filter((field) => hasText(field.value));
                const dateFields = [ed.startDate, ed.endDate].filter(hasText);
                if (metaFields.length > 0 || dateFields.length > 0) {
                    nextSegments.push({
                        id: `${ed.id}-meta`,
                        estimatedHeight: renderTokens.formatting.subHeaderFontSize * subHeaderLineHeight + fieldPaddingPt,
                        render: (key) => (
                            <div key={key} className="resume-subheader-font-target resume-document__meta" style={{ ...metaTextStyle, display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: `${RESUME_DOCUMENT_TYPOGRAPHY.dateGroupGapPx}px ${RESUME_DOCUMENT_TYPOGRAPHY.metaDateGapPx}px` }}>
                                <div style={{ display: "flex", alignItems: "baseline", flexWrap: "wrap", gap: RESUME_DOCUMENT_TYPOGRAPHY.metaGroupGapPx, minWidth: 0, flex: "1 1 auto", overflow: "visible" }}>
                                    {metaFields.map((field, index) => (
                                        <React.Fragment key={`${field.value}-${index}`}>
                                            {index > 0 && <span style={{ color: "#cbd5e1", flexShrink: 0 }}>|</span>}
                                            <span className="resume-subheader-font-target resume-document__meta" style={subHeaderFieldStyle(field.weight, field.color)}>{field.value}</span>
                                        </React.Fragment>
                                    ))}
                                </div>
                                {dateFields.length > 0 && (
                                    <div style={{ display: "flex", alignItems: "baseline", flexWrap: "wrap", gap: RESUME_DOCUMENT_TYPOGRAPHY.dateGroupGapPx, flexShrink: 0 }}>
                                        {dateFields.map((date, index) => (
                                            <React.Fragment key={`${date}-${index}`}>
                                                {index > 0 && <span style={{ color: "#cbd5e1" }}>-</span>}
                                                <span className="resume-subheader-font-target resume-document__meta" style={subHeaderFieldStyle(500, "#475569")}>{date}</span>
                                            </React.Fragment>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )
                    });
                }
                (ed.details || []).filter((detail) => hasText(detail.text)).forEach((detail) => {
                    nextSegments.push(makeBulletSegment(`${ed.id}-${detail.id}`, detail.text));
                });
                if (edIndex < visibleEducation.length - 1) {
                    nextSegments.push(makeGapSegment(`${ed.id}-gap`, innerSectionGap));
                }
            });
            nextSegments.push(makeGapSegment("education-gap", sectionGap));
        }

        const visibleSkills = (resumeData.skills || []).filter((skill) => hasText(skill.category) || (skill.items || []).some(hasText));
        if (visibleSkills.length > 0) {
            nextSegments.push(makeHeadingSegment("skills-heading", getSectionTitle(resumeData, "skills")));
            visibleSkills.forEach((skill, skillIndex) => {
                nextSegments.push(makeSkillSegment(`${skill.id}-skill`, skill.category || "", skill.items || []));
                if (skillIndex < visibleSkills.length - 1) {
                    nextSegments.push(makeGapSegment(`${skill.id}-gap`, innerSectionGap));
                }
            });
        }

        return nextSegments;
    })();
    const measurementSignature = segments.map((segment) => `${segment.id}:${segment.estimatedHeight}`).join("|");
    const paginationLayoutKey = JSON.stringify({
        layoutKey,
        measurementSignature,
        contentWidthPt,
        contentHeightPt
    });

    const handleMeasurementRef = React.useCallback((element: HTMLDivElement | null) => {
        measurementRef.current = element;
        registerResumeDocumentContentElement(element);
    }, [registerResumeDocumentContentElement]);

    React.useEffect(() => {
        setMeasuredSegmentHeightsState((currentState) => {
            if (currentState.layoutKey === paginationLayoutKey && Object.keys(currentState.heights).length === 0) {
                return currentState;
            }
            return { layoutKey: paginationLayoutKey, heights: {} };
        });
    }, [paginationLayoutKey]);

    const measurePreviewSegments = React.useCallback(() => {
        const measurementElement = measurementRef.current;
        if (!measurementElement) return;

        const nextHeights: Record<string, number> = {};
        measurementElement
            .querySelectorAll<HTMLElement>("[data-preview-segment-id]")
            .forEach((element) => {
                const segmentId = element.dataset.previewSegmentId;
                if (!segmentId) return;

                const rectHeight = element.getBoundingClientRect().height;
                const measuredHeight = pxToPt(Math.ceil(rectHeight || element.offsetHeight || 0));
                if (measuredHeight > 0) {
                    nextHeights[segmentId] = measuredHeight;
                }
            });

        setMeasuredSegmentHeightsState((currentState) => {
            const currentHeights = currentState.layoutKey === paginationLayoutKey ? currentState.heights : {};
            const currentKeys = Object.keys(currentHeights);
            const nextKeys = Object.keys(nextHeights);
            if (
                currentState.layoutKey === paginationLayoutKey &&
                currentKeys.length === nextKeys.length &&
                nextKeys.every((key) => currentHeights[key] === nextHeights[key])
            ) {
                return currentState;
            }
            return { layoutKey: paginationLayoutKey, heights: nextHeights };
        });
    }, [paginationLayoutKey]);

    React.useLayoutEffect(() => {
        const measurementElement = measurementRef.current;
        if (!measurementElement) return;

        measurePreviewSegments();
        const frameId = window.requestAnimationFrame(measurePreviewSegments);
        const observer = typeof ResizeObserver !== "undefined"
            ? new ResizeObserver(measurePreviewSegments)
            : null;
        observer?.observe(measurementElement);
        if (observer) {
            measurementElement
                .querySelectorAll<HTMLElement>("[data-preview-segment-id]")
                .forEach((element) => observer.observe(element));
        }
        document.fonts?.ready.then(measurePreviewSegments).catch(() => undefined);

        return () => {
            window.cancelAnimationFrame(frameId);
            observer?.disconnect();
        };
    }, [measurePreviewSegments, measurementSignature]);

    const measuredSegmentHeights = measuredSegmentHeightsState.layoutKey === paginationLayoutKey
        ? measuredSegmentHeightsState.heights
        : {};
    const measuredSegments = segments.map((segment) => ({
        ...segment,
        estimatedHeight: measuredSegmentHeights[segment.id] ?? segment.estimatedHeight
    }));
    const pages = paginateSegments(measuredSegments, contentHeightPt);
    const renderedPages = pages.length >= pageCount ? pages : [...pages, ...Array.from({ length: pageCount - pages.length }, () => [] as PageSegment[])];
    const previewColumnCount = Math.min(Math.max(1, columnCount), Math.max(1, renderedPages.length));

    React.useEffect(() => {
        onRenderedPageCountChange(renderedPages.length);
    }, [onRenderedPageCountChange, renderedPages.length]);

    return (
        <div
            className="resume-page-preview"
            data-resume-page-preview="true"
            data-font-preview={fontPreviewTarget || undefined}
            style={{
                display: "grid",
                gridTemplateColumns: `repeat(${previewColumnCount}, ${paperMetrics.width}px)`,
                gap: `${pageGapPx}px`
            }}
        >
            <div
                ref={handleMeasurementRef}
                className="resume-page-preview-measure"
                aria-hidden="true"
                style={{
                    ...documentCssVariables,
                    width: `${paperMetrics.width}px`,
                    padding: "var(--resume-page-margin)",
                    fontFamily: "var(--resume-font-family)",
                    fontSize: "var(--resume-body-font-size)"
                }}
            >
                {segments.map((segment, index) => renderMeasuredSegment(segment, `measure-${segment.id}-${index}`))}
            </div>
            {renderedPages.map((pageSegments, pageIndex) => (
                <div
                    key={`resume-page-preview-${pageIndex}`}
                    className="resume-page-preview-page"
                    aria-label={`Page ${pageIndex + 1}`}
                    style={{
                        ...documentCssVariables,
                        width: `${paperMetrics.width}px`,
                        height: `${paperMetrics.height}px`,
                        padding: "var(--resume-page-margin)",
                        fontFamily: "var(--resume-font-family)",
                        fontSize: "var(--resume-body-font-size)"
                    }}
                >
                    {isPageFormatPreviewVisible && (
                        <div className="resume-page-format-preview">
                            <span className="resume-page-format-dimension resume-page-format-dimension-width">
                                {paperMetrics.dimensionLabel.width}
                            </span>
                            <span className="resume-page-format-dimension resume-page-format-dimension-height">
                                {paperMetrics.dimensionLabel.height}
                            </span>
                        </div>
                    )}
                    {isMarginPreviewVisible && (
                        <div className="resume-margin-preview">
                            <div className="resume-margin-preview-band" style={{ left: 0, right: 0, top: 0, height: "var(--resume-page-margin)" }} />
                            <div className="resume-margin-preview-band" style={{ left: 0, right: 0, bottom: 0, height: "var(--resume-page-margin)" }} />
                            <div className="resume-margin-preview-band" style={{ left: 0, top: "var(--resume-page-margin)", bottom: "var(--resume-page-margin)", width: "var(--resume-page-margin)" }} />
                            <div className="resume-margin-preview-band" style={{ right: 0, top: "var(--resume-page-margin)", bottom: "var(--resume-page-margin)", width: "var(--resume-page-margin)" }} />
                            <div className="resume-margin-preview-content" style={{ inset: "var(--resume-page-margin)" }} />
                        </div>
                    )}
                    <div
                        className="resume-page-preview-page-content"
                        style={{
                            width: `${contentWidth}px`,
                            height: `${contentHeight}px`,
                            overflow: "hidden"
                        }}
                    >
                        {pageSegments.map((segment, segmentIndex) => segment.render(`${segment.id}-${pageIndex}-${segmentIndex}`))}
                    </div>
                </div>
            ))}
        </div>
    );
};
