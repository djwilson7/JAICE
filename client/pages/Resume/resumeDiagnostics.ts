type ResumeDiagnosticTarget = {
    label: string;
    element: Element | null;
    intendedPageHeight: number;
};

type ResumeDiagnosticFormatting = {
    pageSize: string;
    titleFontSize: number;
    headerFontSize: number;
    bodyFontSize: number;
    pageMarginPt: number;
    paperLayoutFormat: string;
};

type ResumeDiagnosticMissingTarget = {
    label: string;
    missing: true;
    reason: string;
    totalIntendedPageHeight: number;
};

export const RESUME_RENDER_DIAGNOSTICS_VERSION = "experience-item-meta-v1";

const roundMetric = (value: number) => Math.round(value * 100) / 100;

const serializeRect = (rect: DOMRect) => ({
    x: roundMetric(rect.x),
    y: roundMetric(rect.y),
    width: roundMetric(rect.width),
    height: roundMetric(rect.height),
    top: roundMetric(rect.top),
    right: roundMetric(rect.right),
    bottom: roundMetric(rect.bottom),
    left: roundMetric(rect.left)
});

const readElementMetrics = (element: Element | null) => {
    if (!element) return null;

    const htmlElement = element as HTMLElement;
    const computed = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    const paddingLeft = parseFloat(computed.paddingLeft) || 0;
    const paddingRight = parseFloat(computed.paddingRight) || 0;
    const borderLeft = parseFloat(computed.borderLeftWidth) || 0;
    const borderRight = parseFloat(computed.borderRightWidth) || 0;

    return {
        boundingBox: serializeRect(rect),
        scrollHeight: roundMetric(htmlElement.scrollHeight),
        scrollWidth: roundMetric(htmlElement.scrollWidth),
        offsetHeight: roundMetric(htmlElement.offsetHeight),
        offsetWidth: roundMetric(htmlElement.offsetWidth),
        clientHeight: roundMetric(htmlElement.clientHeight),
        clientWidth: roundMetric(htmlElement.clientWidth),
        contentOverflowHeight: roundMetric(Math.max(0, htmlElement.scrollHeight - htmlElement.clientHeight)),
        computedWidth: computed.width,
        computedHeight: computed.height,
        computedContentWidth: roundMetric(rect.width - paddingLeft - paddingRight - borderLeft - borderRight),
        computedBoxSizing: computed.boxSizing,
        computedPadding: {
            top: computed.paddingTop,
            right: computed.paddingRight,
            bottom: computed.paddingBottom,
            left: computed.paddingLeft
        },
        computedBorderWidth: {
            top: computed.borderTopWidth,
            right: computed.borderRightWidth,
            bottom: computed.borderBottomWidth,
            left: computed.borderLeftWidth
        },
        computedOverflow: {
            x: computed.overflowX,
            y: computed.overflowY
        },
        computedMargin: {
            top: computed.marginTop,
            right: computed.marginRight,
            bottom: computed.marginBottom,
            left: computed.marginLeft
        },
        computedGap: computed.gap,
        computedFontFamily: computed.fontFamily,
        computedFontSize: computed.fontSize,
        computedFontWeight: computed.fontWeight,
        computedLineHeight: computed.lineHeight,
        computedLetterSpacing: computed.letterSpacing,
        computedWhiteSpace: computed.whiteSpace,
        computedOverflowWrap: computed.overflowWrap,
        computedWordBreak: computed.wordBreak
    };
};

const readChildOverflowTrace = (element: Element | null) => {
    if (!element) return null;

    const rootRect = element.getBoundingClientRect();
    const children = Array.from(element.children) as HTMLElement[];
    const childTraces = children.map((child, index) => {
        const rect = child.getBoundingClientRect();
        const computed = window.getComputedStyle(child);
        const label =
            child.getAttribute("data-section-id") ||
            child.getAttribute("id") ||
            child.getAttribute("class") ||
            child.tagName.toLowerCase();

        return {
            index,
            tagName: child.tagName.toLowerCase(),
            label,
            boundingBox: serializeRect(rect),
            height: roundMetric(rect.height),
            bottom: roundMetric(rect.bottom),
            marginBottom: computed.marginBottom,
            overflowPastRootBottom: roundMetric(Math.max(0, rect.bottom - rootRect.bottom))
        };
    });
    const lastChildTrace = childTraces[childTraces.length - 1] || null;
    const maxChildBottom = childTraces.reduce((max, child) => Math.max(max, child.bottom), roundMetric(rootRect.top));
    const overflowingChildren = childTraces.filter((child) => child.overflowPastRootBottom > 0);

    return {
        rootBottom: roundMetric(rootRect.bottom),
        maxChildBottom: roundMetric(maxChildBottom),
        lastChildBottom: lastChildTrace?.bottom ?? null,
        lastChildMarginBottom: lastChildTrace?.marginBottom ?? null,
        maxChildOverflowPastRootBottom: roundMetric(Math.max(0, maxChildBottom - rootRect.bottom)),
        overflowingChildren,
        sectionTraces: childTraces
    };
};

const findFirstTitleElement = (element: Element) => {
    return (
        element.querySelector("h1") ||
        element.querySelector(".resume-title-font-target") ||
        element.querySelector('input[placeholder="YOUR NAME"]')
    );
};

const findFirstHeadingElement = (element: Element) => {
    return element.querySelector("h2") || element.querySelector(".resume-header-font-target");
};

const findFirstBulletRowElement = (element: Element) => {
    return (
        element.querySelector(".resume-diagnostic-bullet-row, .bullet-row") ||
        element.querySelector('[data-resume-diagnostic="bullet-row"]') ||
        null
    );
};

const parsePx = (value: string) => {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
};

const estimateLineCount = (element: Element | null) => {
    const metrics = readElementMetrics(element);
    if (!metrics) return null;
    const lineHeight = parsePx(metrics.computedLineHeight);
    if (!lineHeight || lineHeight <= 0) return null;
    return roundMetric(metrics.boundingBox.height / lineHeight);
};

const findExperienceSection = (element: Element) => {
    return Array.from(element.querySelectorAll("section")).find((section) =>
        section.querySelector("h2")?.textContent?.trim() === "Work Experience"
    ) ?? null;
};

const readExperienceHorizontalTrace = (element: Element) => {
    const section = findExperienceSection(element);
    if (!section) return null;

    const bulletRows = Array.from(
        section.querySelectorAll(".resume-diagnostic-bullet-row, .bullet-row, [data-resume-diagnostic='bullet-row']")
    );
    const articles = Array.from(section.querySelectorAll("article"));
    const sectionMetrics = readElementMetrics(section);

    return {
        section: sectionMetrics,
        heading: readElementMetrics(section.querySelector("h2")),
        items: articles.map((article, index) => {
            const bulletStack = article.querySelector("div:has(.resume-diagnostic-bullet-row), div:has([data-resume-diagnostic='bullet-row']), .experience-bullets");
            const metaRow = Array.from(article.children).find((child) => child !== bulletStack) ?? null;
            const metaChildren = metaRow ? Array.from(metaRow.children).map((child, childIndex) => ({
                index: childIndex,
                metrics: readElementMetrics(child),
                text: child.textContent ?? ""
            })) : [];

            return {
                index,
                article: readElementMetrics(article),
                metaRow: readElementMetrics(metaRow),
                metaChildren,
                bulletStack: readElementMetrics(bulletStack)
            };
        }),
        bullets: bulletRows.map((row, index) => {
            const marker = row.querySelector("span, .bullet-marker");
            const text = row.querySelector("div, .bullet-text");
            const rowMetrics = readElementMetrics(row);
            const markerMetrics = readElementMetrics(marker);
            const textMetrics = readElementMetrics(text);

            return {
                index,
                fullText: text?.textContent ?? "",
                textPreview: text?.textContent?.trim().slice(0, 140) ?? "",
                row: rowMetrics,
                marker: markerMetrics,
                text: textMetrics,
                estimatedLineCount: estimateLineCount(text),
                appearsMultiLine: (estimateLineCount(text) ?? 0) > 1.25
            };
        })
    };
};

export const isResumeDebugEnabled = () => {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).get("resumeDebug") === "1";
};

export const buildResumeRenderDiagnostics = ({
    phase,
    formatting,
    targets
}: {
    phase: string;
    formatting: ResumeDiagnosticFormatting;
    targets: ResumeDiagnosticTarget[];
}) => {
    const diagnostics = targets.map(({ label, element, intendedPageHeight }) => {
        if (!element) {
            return {
                label,
                missing: true,
                reason: "Element was not mounted when diagnostics ran.",
                totalIntendedPageHeight: intendedPageHeight
            } satisfies ResumeDiagnosticMissingTarget;
        }

        const rootMetrics = readElementMetrics(element);
        const firstTitle = readElementMetrics(findFirstTitleElement(element));
        const firstHeading = readElementMetrics(findFirstHeadingElement(element));
        const firstBulletRowElement = findFirstBulletRowElement(element);
        const firstBulletRow = readElementMetrics(firstBulletRowElement);
        const firstBulletText = readElementMetrics(firstBulletRowElement?.querySelector("div, .bullet-text") ?? null);
        const firstBulletMarker = readElementMetrics(firstBulletRowElement?.querySelector("span, .bullet-marker") ?? null);
        const contentHeight = rootMetrics?.scrollHeight ?? 0;

        return {
            label,
            root: rootMetrics,
            childOverflowTrace: readChildOverflowTrace(element),
            firstTitle,
            firstHeading,
            firstBulletRow,
            firstBulletText,
            firstBulletMarker,
            experienceHorizontalTrace: readExperienceHorizontalTrace(element),
            totalIntendedPageHeight: intendedPageHeight,
            contentExceedsOnePage: contentHeight > intendedPageHeight + 0.5
        };
    });

    const summaryTable = diagnostics.map((diagnostic) => {
        if ("missing" in diagnostic) {
            return {
                label: diagnostic.label,
                missing: true,
                rootHeight: null,
                scrollHeight: null,
                offsetHeight: null,
                paddingTop: null,
                fontFamily: null,
                fontSize: null,
                lineHeight: null,
                titleHeight: null,
                headingHeight: null,
                bulletHeight: null,
                intendedPageHeight: diagnostic.totalIntendedPageHeight,
                contentExceedsOnePage: null
            };
        }

        return {
            label: diagnostic.label,
            missing: false,
            rootHeight: diagnostic.root?.boundingBox.height ?? null,
            scrollHeight: diagnostic.root?.scrollHeight ?? null,
            offsetHeight: diagnostic.root?.offsetHeight ?? null,
            clientHeight: diagnostic.root?.clientHeight ?? null,
            contentOverflowHeight: diagnostic.root?.contentOverflowHeight ?? null,
            maxChildOverflowPastRootBottom: diagnostic.childOverflowTrace?.maxChildOverflowPastRootBottom ?? null,
            overflowingChildCount: diagnostic.childOverflowTrace?.overflowingChildren.length ?? null,
            paddingTop: diagnostic.root?.computedPadding.top ?? null,
            paddingRight: diagnostic.root?.computedPadding.right ?? null,
            paddingBottom: diagnostic.root?.computedPadding.bottom ?? null,
            paddingLeft: diagnostic.root?.computedPadding.left ?? null,
            boxSizing: diagnostic.root?.computedBoxSizing ?? null,
            overflowY: diagnostic.root?.computedOverflow.y ?? null,
            fontFamily: diagnostic.root?.computedFontFamily ?? null,
            fontSize: diagnostic.root?.computedFontSize ?? null,
            lineHeight: diagnostic.root?.computedLineHeight ?? null,
            titleHeight: diagnostic.firstTitle?.boundingBox.height ?? null,
            headingHeight: diagnostic.firstHeading?.boundingBox.height ?? null,
            bulletHeight: diagnostic.firstBulletRow?.boundingBox.height ?? null,
            bulletTextFontFamily: diagnostic.firstBulletText?.computedFontFamily ?? null,
            bulletTextLineHeight: diagnostic.firstBulletText?.computedLineHeight ?? null,
            bulletTextHeight: diagnostic.firstBulletText?.boundingBox.height ?? null,
            bulletMarkerFontFamily: diagnostic.firstBulletMarker?.computedFontFamily ?? null,
            intendedPageHeight: diagnostic.totalIntendedPageHeight,
            contentExceedsOnePage: diagnostic.contentExceedsOnePage
        };
    });

    return {
        diagnosticsVersion: RESUME_RENDER_DIAGNOSTICS_VERSION,
        capturedAt: new Date().toISOString(),
        phase,
        url: window.location.href,
        intendedPageHeight: targets[0]?.intendedPageHeight ?? null,
        formatting,
        summaryTable,
        surfaces: diagnostics
    };
};
