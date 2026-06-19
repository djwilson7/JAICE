import React from "react";
import type { FontPreviewTarget, PaperMetrics, ResumeData, ResumeFormatting } from "../types";
import { buildResumeRenderTokens } from "../formatting";
import { RESUME_CSS_LAYOUT } from "../rendering/formattingTokens";
import { pxCss, pxToPt } from "../utils/documentUnits";
import { buildResumeRenderModel } from "../rendering/renderModel";
import {
    canSplitIntoHeight,
    estimateWrappedTextHeight,
    outerHeightPx,
    paginateSegments,
    splitWordsForHeight,
    type PageSegment
} from "../rendering/pagination";

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
    measurementOnly?: boolean;
    onPageBreakAnchorsChange?: (anchors: PageBreakAnchor[]) => void;
};

export type PageBreakAnchor = {
    pageNumber: number;
    segmentId: string;
};

type MeasuredSegmentHeightsState = {
    layoutKey: string;
    heights: Record<string, number>;
};

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
    onRenderedPageCountChange,
    measurementOnly = false,
    onPageBreakAnchorsChange
}) => {
    const measurementRef = React.useRef<HTMLDivElement | null>(null);
    const [measuredSegmentHeightsState, setMeasuredSegmentHeightsState] = React.useState<MeasuredSegmentHeightsState>({
        layoutKey,
        heights: {}
    });
    const renderTokens = buildResumeRenderTokens(formatting, paperMetrics);
    const renderModel = buildResumeRenderModel(resumeData);
    const {
        contentWidthPt,
        contentHeightPt,
        sectionGapPt: sectionGap,
        innerSectionGapPt: innerSectionGap,
        titleLineHeight,
        headerLineHeight,
        subHeaderLineHeight,
        bodyLineHeight,
        documentCssVariables
    } = renderTokens;
    const fieldPaddingPx = RESUME_CSS_LAYOUT.fieldVerticalPaddingPx * 2;
    const fieldPaddingPt = pxToPt(fieldPaddingPx);
    const headingHeight =
        renderTokens.formatting.headerFontSize * headerLineHeight +
        pxToPt(RESUME_CSS_LAYOUT.sectionHeadingPaddingBottomPx) +
        pxToPt(RESUME_CSS_LAYOUT.sectionHeadingMarginBottomPx) +
        pxToPt(1);

    const contactRows = renderModel.contactRows;

    const textWidthPt = Math.max(1, contentWidthPt - pxToPt(RESUME_CSS_LAYOUT.fieldHorizontalPaddingPx * 2));
    const bulletTextWidthPt = Math.max(1, textWidthPt - pxToPt(RESUME_CSS_LAYOUT.bulletIndentPx + RESUME_CSS_LAYOUT.bulletGapPx) - renderTokens.formatting.bodyFontSize);

    const makeHeadingSegment = (id: string, title: string): PageSegment => ({
        id,
        editorAnchorId: id,
        estimatedHeight: headingHeight,
        keepWithNext: true,
        render: (key) => <h2 key={key} className="resume-document__section-title resume-font--heading resume-header-font-target">{title}</h2>
    });

    const makeParagraphSegment = (id: string, text: string, editorAnchorId = id): PageSegment => {
        const estimatedHeight = estimateWrappedTextHeight(text, textWidthPt, renderTokens.formatting.bodyFontSize, bodyLineHeight, fieldPaddingPt);
        return {
            id,
            editorAnchorId,
            estimatedHeight,
            render: (key) => <p key={key} className="resume-document__body resume-font--body resume-body-font-target">{text}</p>,
            split: (availableHeight) => {
                const split = splitWordsForHeight(text, availableHeight, textWidthPt, renderTokens.formatting.bodyFontSize, bodyLineHeight, fieldPaddingPt);
                return {
                    head: split.head ? makeParagraphSegment(`${id}-head`, split.head, editorAnchorId) : null,
                    tail: split.tail ? makeParagraphSegment(`${id}-tail`, split.tail, editorAnchorId) : null
                };
            }
        };
    };

    const makeBulletSegment = (id: string, text: string): PageSegment => {
        const estimatedHeight = estimateWrappedTextHeight(text, bulletTextWidthPt, renderTokens.formatting.bodyFontSize, bodyLineHeight, fieldPaddingPt);
        return {
            id,
            editorAnchorId: id,
            estimatedHeight,
            render: (key) => (
                <div key={key} className="resume-document__bullet-row resume-document__bullet-row--paginated resume-diagnostic-bullet-row" data-resume-diagnostic="bullet-row">
                    <span className="resume-document__bullet-marker resume-font--body resume-body-font-target">&bull;</span>
                    <div className="resume-document__body resume-document__bullet-text resume-font--body resume-body-font-target">{text}</div>
                </div>
            )
        };
    };

    const makeSkillSegment = (
        id: string,
        category: string,
        items: string[],
        editorAnchorId = id
    ): PageSegment => {
        const visibleItems = items.filter(Boolean);
        const itemsText = visibleItems.join(", ");
        const text = `${category || ""}${category && itemsText ? ": " : ""}${itemsText}`;
        const categoryWidth = category
            ? estimateWrappedTextHeight(category, textWidthPt, renderTokens.formatting.subHeaderFontSize, subHeaderLineHeight, fieldPaddingPt)
            : 0;
        const estimatedHeight = Math.max(
            categoryWidth,
            estimateWrappedTextHeight(text, textWidthPt, renderTokens.formatting.bodyFontSize, bodyLineHeight, fieldPaddingPt)
        );

        return {
            id,
            editorAnchorId,
            estimatedHeight,
        render: (key) => (
                <div key={key} className="resume-document__skill-row resume-font--body">
                    {category && <strong className="resume-document__skill-category resume-font--subheading resume-subheader-font-target">{category}</strong>}
                    {category && visibleItems.length > 0 && <span className="resume-document__skill-colon">:</span>}
                    <span className="resume-document__skill-items resume-font--body resume-body-font-target">{itemsText}</span>
                </div>
            ),
            split: (availableHeight) => {
                if (!canSplitIntoHeight(availableHeight) || visibleItems.length <= 1) {
                    return { head: null, tail: makeSkillSegment(id, category, visibleItems) };
                }

                const split = splitWordsForHeight(itemsText, availableHeight, textWidthPt, renderTokens.formatting.bodyFontSize, bodyLineHeight, fieldPaddingPt);
                return {
                    head: split.head ? makeSkillSegment(`${id}-head`, category, split.head.split(/,\s*|\s+/).filter(Boolean), editorAnchorId) : null,
                    tail: split.tail ? makeSkillSegment(`${id}-tail`, category, split.tail.split(/,\s*|\s+/).filter(Boolean), editorAnchorId) : null
                };
            }
        };
    };

    const makeGapSegment = (id: string, height: number, inner = false): PageSegment => ({
        id,
        estimatedHeight: height,
        render: (key) => (
            <div key={key} className={`resume-document__gap${inner ? " resume-document__gap--inner" : ""}`}>
                {isSectionGapPreviewVisible && (
                    <div className="resume-section-gap-preview" />
                )}
            </div>
        )
    });

    const segments: PageSegment[] = (() => {
        const nextSegments: PageSegment[] = [];
        nextSegments.push({
            id: "header",
            editorAnchorId: "header",
            estimatedHeight:
                renderTokens.formatting.titleFontSize * titleLineHeight +
                pxToPt(RESUME_CSS_LAYOUT.titleVerticalPaddingPx * 2) +
                contactRows.length * renderTokens.formatting.bodyFontSize * bodyLineHeight +
                pxToPt(Math.max(0, contactRows.length - 1) * RESUME_CSS_LAYOUT.contactStackGapPx),
            render: (key) => (
                <section key={key} className="resume-document__segment-section">
                    <h1 className="resume-document__title resume-font--title resume-title-font-target">
                        {renderModel.fullName}
                    </h1>
                    {contactRows.length > 0 && (
                        <div className="resume-document__contact-strip resume-font--contact resume-body-font-target">
                            {contactRows.map((row, rowIndex) => (
                                <div className="resume-document__contact-row" key={`contact-row-${rowIndex}`}>
                                    {row.map((item, index) => (
                                        <React.Fragment key={`${item}-${index}`}>
                                            {index > 0 && <span className="resume-document__separator">&bull;</span>}
                                            <span>{item}</span>
                                        </React.Fragment>
                                    ))}
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            )
        });

        if (renderModel.summary || renderModel.experience.length || renderModel.education.length || renderModel.skills.length) {
            nextSegments.push(makeGapSegment("header-gap", sectionGap));
        }

        if (renderModel.summary) {
            nextSegments.push(makeHeadingSegment("summary-heading", renderModel.summary.title));
            nextSegments.push(makeParagraphSegment("summary-body", renderModel.summary.text));
            nextSegments.push(makeGapSegment("summary-gap", sectionGap));
        }

        const visibleExperience = renderModel.experience;
        if (visibleExperience.length > 0) {
            nextSegments.push(makeHeadingSegment("experience-heading", visibleExperience[0].title));
            visibleExperience.forEach((exp, expIndex) => {
                const metaFields = exp.meta;
                const dateFields = exp.dates;
                if (metaFields.length > 0 || dateFields.length > 0) {
                    nextSegments.push({
                        id: `${exp.id}-meta`,
                        editorAnchorId: `${exp.id}-meta`,
                        estimatedHeight: renderTokens.formatting.subHeaderFontSize * subHeaderLineHeight + fieldPaddingPt + pxToPt(RESUME_CSS_LAYOUT.metaRowToBulletGapPx),
                        keepWithNext: exp.bullets.length > 0,
                        render: (key) => (
                            <div key={key} className={`resume-document__meta-row resume-font--subheading resume-subheader-font-target${exp.bullets.length ? " resume-document__meta-row--with-bullets" : ""}`}>
                                <div className="resume-document__meta-fields">
                                    {metaFields.map((field, index) => (
                                        <React.Fragment key={`${field.value}-${index}`}>
                                            {index > 0 && <span className="resume-document__separator">|</span>}
                                            <span className={`resume-document__meta-field resume-document__meta-field--${field.tone}`}>{field.value}</span>
                                        </React.Fragment>
                                    ))}
                                </div>
                                {dateFields.length > 0 && (
                                    <div className="resume-document__date-fields">
                                        {dateFields.map((date, index) => (
                                            <React.Fragment key={`${date}-${index}`}>
                                                {index > 0 && <span className="resume-document__separator">-</span>}
                                                <span className="resume-document__date-field">{date}</span>
                                            </React.Fragment>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )
                    });
                }
                exp.bullets.forEach((bullet) => {
                    nextSegments.push(makeBulletSegment(`${exp.id}-${bullet.id}`, bullet.text));
                });
                if (expIndex < visibleExperience.length - 1) {
                    nextSegments.push(makeGapSegment(`${exp.id}-gap`, innerSectionGap, true));
                }
            });
            nextSegments.push(makeGapSegment("experience-gap", sectionGap));
        }

        const visibleEducation = renderModel.education;
        if (visibleEducation.length > 0) {
            nextSegments.push(makeHeadingSegment("education-heading", visibleEducation[0].title));
            visibleEducation.forEach((ed, edIndex) => {
                const metaFields = ed.meta;
                const dateFields = ed.dates;
                if (metaFields.length > 0 || dateFields.length > 0) {
                    nextSegments.push({
                        id: `${ed.id}-meta`,
                        editorAnchorId: `${ed.id}-meta`,
                        estimatedHeight: renderTokens.formatting.subHeaderFontSize * subHeaderLineHeight + fieldPaddingPt,
                        keepWithNext: ed.details.length > 0,
                        render: (key) => (
                            <div key={key} className="resume-document__meta-row resume-font--subheading resume-subheader-font-target">
                                <div className="resume-document__meta-fields">
                                    {metaFields.map((field, index) => (
                                        <React.Fragment key={`${field.value}-${index}`}>
                                            {index > 0 && <span className="resume-document__separator">|</span>}
                                            <span className={`resume-document__meta-field resume-document__meta-field--${field.tone}`}>{field.value}</span>
                                        </React.Fragment>
                                    ))}
                                </div>
                                {dateFields.length > 0 && (
                                    <div className="resume-document__date-fields">
                                        {dateFields.map((date, index) => (
                                            <React.Fragment key={`${date}-${index}`}>
                                                {index > 0 && <span className="resume-document__separator">-</span>}
                                                <span className="resume-document__date-field">{date}</span>
                                            </React.Fragment>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )
                    });
                }
                ed.details.forEach((detail) => {
                    nextSegments.push(makeBulletSegment(`${ed.id}-${detail.id}`, detail.text));
                });
                if (edIndex < visibleEducation.length - 1) {
                    nextSegments.push(makeGapSegment(`${ed.id}-gap`, innerSectionGap, true));
                }
            });
            nextSegments.push(makeGapSegment("education-gap", sectionGap));
        }

        const visibleSkills = renderModel.skills;
        if (visibleSkills.length > 0) {
            nextSegments.push(makeHeadingSegment("skills-heading", visibleSkills[0].title));
            visibleSkills.forEach((skill, skillIndex) => {
                nextSegments.push(makeSkillSegment(`${skill.id}-skill`, skill.category, skill.items));
                if (skillIndex < visibleSkills.length - 1) {
                    nextSegments.push(makeGapSegment(`${skill.id}-gap`, innerSectionGap, true));
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
                const computedStyle = window.getComputedStyle(element);
                const marginTop = Number.parseFloat(computedStyle.marginTop) || 0;
                const marginBottom = Number.parseFloat(computedStyle.marginBottom) || 0;
                const measuredHeight = pxToPt(outerHeightPx(
                    rectHeight || element.offsetHeight || 0,
                    marginTop,
                    marginBottom
                ));
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
    const pageBreakAnchors = pages.slice(1).flatMap((page, pageIndex) => {
        const firstAnchoredSegment = page.find((segment) => segment.editorAnchorId);
        return firstAnchoredSegment?.editorAnchorId
            ? [{ pageNumber: pageIndex + 2, segmentId: firstAnchoredSegment.editorAnchorId }]
            : [];
    });
    const pageBreakAnchorSignature = pageBreakAnchors
        .map((anchor) => `${anchor.pageNumber}:${anchor.segmentId}`)
        .join("|");

    React.useEffect(() => {
        onRenderedPageCountChange(renderedPages.length);
    }, [onRenderedPageCountChange, renderedPages.length]);

    React.useEffect(() => {
        onPageBreakAnchorsChange?.(pageBreakAnchors);
    }, [onPageBreakAnchorsChange, pageBreakAnchorSignature]);

    const previewCssVariables = {
        ...documentCssVariables,
        "--resume-preview-column-count": String(previewColumnCount),
        "--resume-preview-page-width": pxCss(paperMetrics.width),
        "--resume-preview-page-height": pxCss(paperMetrics.height),
        "--resume-preview-page-gap": pxCss(pageGapPx)
    } as React.CSSProperties;

    return (
        <div
            className="resume-formatting-context resume-page-preview"
            data-resume-page-preview="true"
            data-font-preview={fontPreviewTarget || undefined}
            data-resume-layout-density={renderTokens.formatting.paperLayoutFormat}
            data-resume-inner-density={renderTokens.formatting.innerSectionGapFormat}
            style={previewCssVariables}
        >
            <div
                ref={handleMeasurementRef}
                className="resume-page-content resume-page-preview-measure"
                aria-hidden="true"
            >
                {segments.map((segment, index) => renderMeasuredSegment(segment, `measure-${segment.id}-${index}`))}
            </div>
            {!measurementOnly && renderedPages.map((pageSegments, pageIndex) => (
                <div
                    key={`resume-page-preview-${pageIndex}`}
                    className="resume-page-preview-page"
                    aria-label={`Page ${pageIndex + 1}`}
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
                            <div className="resume-margin-preview-band resume-margin-preview-band--top" />
                            <div className="resume-margin-preview-band resume-margin-preview-band--bottom" />
                            <div className="resume-margin-preview-band resume-margin-preview-band--left" />
                            <div className="resume-margin-preview-band resume-margin-preview-band--right" />
                            <div className="resume-margin-preview-content" />
                        </div>
                    )}
                    <div className="resume-page-content resume-page-preview-page-content">
                        {pageSegments.map((segment, segmentIndex) => segment.render(`${segment.id}-${pageIndex}-${segmentIndex}`))}
                    </div>
                </div>
            ))}
        </div>
    );
};
