import React from "react";
import type { ResumeData, ResumeFormatting } from "../types";
import { PAPER_SIZES, SECTION_GAP_PX } from "../formatting";
import { hasText } from "../resumeData";
import { RESUME_DOCUMENT_TYPOGRAPHY } from "../resumeTypography";

type ResumeDocumentSurfaceProps = {
    resumeData: ResumeData;
    formatting: ResumeFormatting;
    mode: "edit" | "print";
    rootId?: string;
    className?: string;
    style?: React.CSSProperties;
    ariaHidden?: boolean;
};

export const ResumeDocumentSurface: React.FC<ResumeDocumentSurfaceProps> = ({
    resumeData,
    formatting,
    mode,
    rootId,
    className,
    style,
    ariaHidden = mode === "print"
}) => {
    const paper = PAPER_SIZES[formatting.pageSize];
    const pageWidth = formatting.pageSize === "a4" ? "210mm" : "8.5in";
    const pageHeight = formatting.pageSize === "a4" ? "297mm" : "11in";
    const sectionGap = SECTION_GAP_PX[formatting.paperLayoutFormat] ?? SECTION_GAP_PX.standard;
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
        marginBottom: sectionGap,
        textAlign: "left",
        width: "100%"
    };
    const headingStyle: React.CSSProperties = {
        fontSize: formatting.headerFontSize,
        lineHeight: RESUME_DOCUMENT_TYPOGRAPHY.headingLineHeight,
        margin: `0 0 ${RESUME_DOCUMENT_TYPOGRAPHY.sectionHeadingMarginBottomPx}px`,
        paddingBottom: RESUME_DOCUMENT_TYPOGRAPHY.sectionHeadingPaddingBottomPx,
        borderBottom: "1px solid #cbd5e1",
        fontFamily: RESUME_DOCUMENT_TYPOGRAPHY.sectionHeadingFamily,
        fontWeight: RESUME_DOCUMENT_TYPOGRAPHY.headingWeight,
        letterSpacing: 0,
        textTransform: "uppercase",
        color: "#0f172a",
        textAlign: "left"
    };
    const bodyTextStyle: React.CSSProperties = {
        fontSize: formatting.bodyFontSize,
        lineHeight: RESUME_DOCUMENT_TYPOGRAPHY.bodyLineHeight,
        color: "#334155",
        fontFamily: RESUME_DOCUMENT_TYPOGRAPHY.bodyFamily,
        fontWeight: RESUME_DOCUMENT_TYPOGRAPHY.bodyWeight,
        textAlign: "left",
        whiteSpace: "pre-wrap"
    };
    const metaTextStyle: React.CSSProperties = {
        fontSize: formatting.bodyFontSize,
        lineHeight: RESUME_DOCUMENT_TYPOGRAPHY.metaLineHeight,
        fontFamily: RESUME_DOCUMENT_TYPOGRAPHY.contactFamily,
        fontWeight: RESUME_DOCUMENT_TYPOGRAPHY.metaWeight,
        color: "#475569",
        textAlign: "left"
    };
    const fieldPadding = `${RESUME_DOCUMENT_TYPOGRAPHY.fieldVerticalPaddingPx}px ${RESUME_DOCUMENT_TYPOGRAPHY.fieldHorizontalPaddingPx}px`;
    const titlePadding = `${RESUME_DOCUMENT_TYPOGRAPHY.titleVerticalPaddingPx}px ${RESUME_DOCUMENT_TYPOGRAPHY.titleHorizontalPaddingPx}px`;
    const metaFieldStyle = (weight: React.CSSProperties["fontWeight"], color: string): React.CSSProperties => ({
        flexShrink: 0,
        padding: fieldPadding,
        color,
        fontWeight: weight
    });
    const bulletRowStyle: React.CSSProperties = {
        display: "flex",
        alignItems: "flex-start",
        gap: RESUME_DOCUMENT_TYPOGRAPHY.bulletGapPx
    };
    const bulletMarkerStyle: React.CSSProperties = {
        ...bodyTextStyle,
        display: "inline-block",
        flexShrink: 0,
        padding: `${RESUME_DOCUMENT_TYPOGRAPHY.fieldVerticalPaddingPx}px 0`,
        color: "#475569"
    };
    const bulletTextStyle: React.CSSProperties = {
        ...bodyTextStyle,
        flex: "1 1 auto",
        minWidth: 0,
        padding: fieldPadding,
        wordBreak: "break-word"
    };

    return (
        <div
            id={rootId}
            className={className}
            aria-hidden={ariaHidden}
            data-resume-document-surface={mode}
            data-print-page={paper.printName}
            style={{
                width: pageWidth,
                height: pageHeight,
                padding: `${formatting.pageMarginPt}pt`,
                boxSizing: "border-box",
                background: "#ffffff",
                color: "#0f172a",
                fontFamily: RESUME_DOCUMENT_TYPOGRAPHY.bodyFamily,
                fontSize: formatting.bodyFontSize,
                textAlign: "left",
                ...style
            }}
        >
            <section style={sectionStyle}>
                <h1
                    style={{
                        margin: "0 0 2px",
                        padding: titlePadding,
                        textAlign: "center",
                        fontSize: formatting.titleFontSize,
                        lineHeight: RESUME_DOCUMENT_TYPOGRAPHY.titleLineHeight,
                        fontFamily: RESUME_DOCUMENT_TYPOGRAPHY.titleFamily,
                        fontWeight: RESUME_DOCUMENT_TYPOGRAPHY.strongWeight,
                        color: "#0f172a"
                    }}
                >
                    {resumeData.fullName || "Your Name"}
                </h1>
                {contactRows.length > 0 && (
                    <div
                        style={{
                            ...metaTextStyle,
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: RESUME_DOCUMENT_TYPOGRAPHY.contactStackGapPx,
                            fontFamily: RESUME_DOCUMENT_TYPOGRAPHY.contactFamily,
                            fontWeight: RESUME_DOCUMENT_TYPOGRAPHY.contactWeight,
                            lineHeight: RESUME_DOCUMENT_TYPOGRAPHY.contactLineHeight,
                            textAlign: "center"
                        }}
                    >
                        {contactRows.map((row, rowIndex) => (
                            <div key={`contact-row-${rowIndex}`} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: RESUME_DOCUMENT_TYPOGRAPHY.contactRowGapPx }}>
                                {row.map((item, index) => (
                                    <React.Fragment key={`${item}-${index}`}>
                                        {index > 0 && <span style={{ color: "#cbd5e1" }}>&bull;</span>}
                                        <span>{item}</span>
                                    </React.Fragment>
                                ))}
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {resumeData.summary && (
                <section style={sectionStyle}>
                    <h2 style={headingStyle}>Professional Summary</h2>
                    <p style={{ ...bodyTextStyle, margin: 0, padding: fieldPadding, lineHeight: RESUME_DOCUMENT_TYPOGRAPHY.summaryLineHeight }}>{resumeData.summary}</p>
                </section>
            )}

            {(resumeData.experience || []).some((exp) =>
                hasText(exp.jobTitle) ||
                hasText(exp.company) ||
                hasText(exp.location) ||
                hasText(exp.startDate) ||
                hasText(exp.endDate) ||
                (exp.bullets || []).some((bullet) => hasText(bullet.text))
            ) && (
                <section style={sectionStyle}>
                    <h2 style={headingStyle}>Work Experience</h2>
                    <div style={{ display: "flex", flexDirection: "column", gap: RESUME_DOCUMENT_TYPOGRAPHY.sectionItemGapPx }}>
                        {(resumeData.experience || [])
                            .filter((exp) =>
                                hasText(exp.jobTitle) ||
                                hasText(exp.company) ||
                                hasText(exp.location) ||
                                hasText(exp.startDate) ||
                                hasText(exp.endDate) ||
                                (exp.bullets || []).some((bullet) => hasText(bullet.text))
                            )
                            .map((exp) => {
                                const metaFields = [
                                    { value: exp.jobTitle, weight: 700, color: "#0f172a" },
                                    { value: exp.company, weight: 600, color: "#1f2937" },
                                    { value: exp.location, weight: 600, color: "#475569" }
                                ].filter((field) => hasText(field.value));
                                const dateFields = [exp.startDate, exp.endDate].filter(hasText);
                                return (
                                    <article key={exp.id}>
                                        {(metaFields.length > 0 || dateFields.length > 0) && (
                                            <div
                                                style={{
                                                    ...metaTextStyle,
                                                    display: "flex",
                                                    justifyContent: "space-between",
                                                    alignItems: "baseline",
                                                    flexWrap: "wrap",
                                                    gap: `${RESUME_DOCUMENT_TYPOGRAPHY.dateGroupGapPx}px ${RESUME_DOCUMENT_TYPOGRAPHY.metaDateGapPx}px`,
                                                    marginBottom: (exp.bullets || []).some((bullet) => hasText(bullet.text)) ? RESUME_DOCUMENT_TYPOGRAPHY.metaRowToBulletGapPx : 0
                                                }}
                                            >
                                                <div style={{ display: "flex", alignItems: "baseline", flexWrap: "wrap", gap: RESUME_DOCUMENT_TYPOGRAPHY.metaGroupGapPx, minWidth: 0, flex: "1 1 auto", overflow: "visible" }}>
                                                    {metaFields.map((field, index) => (
                                                        <React.Fragment key={`${field.value}-${index}`}>
                                                            {index > 0 && <span style={{ color: "#cbd5e1", flexShrink: 0 }}>|</span>}
                                                            <span style={metaFieldStyle(field.weight, field.color)}>{field.value}</span>
                                                        </React.Fragment>
                                                    ))}
                                                </div>
                                                {dateFields.length > 0 && (
                                                    <div style={{ display: "flex", alignItems: "baseline", flexWrap: "wrap", gap: RESUME_DOCUMENT_TYPOGRAPHY.dateGroupGapPx, flexShrink: 0 }}>
                                                        {dateFields.map((date, index) => (
                                                            <React.Fragment key={`${date}-${index}`}>
                                                                {index > 0 && <span style={{ color: "#cbd5e1" }}>-</span>}
                                                                <span style={{ padding: fieldPadding }}>{date}</span>
                                                            </React.Fragment>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        {(exp.bullets || []).some((bullet) => hasText(bullet.text)) && (
                                            <div style={{ display: "flex", flexDirection: "column", gap: RESUME_DOCUMENT_TYPOGRAPHY.educationDetailGapPx, margin: `0 0 0 ${RESUME_DOCUMENT_TYPOGRAPHY.bulletIndentPx}px` }}>
                                                {(exp.bullets || []).filter((bullet) => hasText(bullet.text)).map((bullet) => (
                                                    <div key={bullet.id} className="resume-diagnostic-bullet-row" data-resume-diagnostic="bullet-row" style={bulletRowStyle}>
                                                        <span style={bulletMarkerStyle}>&bull;</span>
                                                        <div style={bulletTextStyle}>{bullet.text}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </article>
                                );
                            })}
                    </div>
                </section>
            )}

            {(resumeData.education || []).some((ed) =>
                hasText(ed.degree) ||
                hasText(ed.school) ||
                hasText(ed.startDate) ||
                hasText(ed.endDate) ||
                (ed.details || []).some((detail) => hasText(detail.text))
            ) && (
                <section style={sectionStyle}>
                    <h2 style={headingStyle}>Education</h2>
                    <div style={{ display: "flex", flexDirection: "column", gap: RESUME_DOCUMENT_TYPOGRAPHY.sectionItemGapPx }}>
                        {(resumeData.education || [])
                            .filter((ed) =>
                                hasText(ed.degree) ||
                                hasText(ed.school) ||
                                hasText(ed.startDate) ||
                                hasText(ed.endDate) ||
                                (ed.details || []).some((detail) => hasText(detail.text))
                            )
                            .map((ed) => {
                                const metaFields = [
                                    { value: ed.degree, weight: 700, color: "#0f172a" },
                                    { value: ed.school, weight: 600, color: "#1f2937" }
                                ].filter((field) => hasText(field.value));
                                const dateFields = [ed.startDate, ed.endDate].filter(hasText);
                                const details = (ed.details || []).filter((detail) => hasText(detail.text));
                                return (
                                    <div key={ed.id}>
                                        {(metaFields.length > 0 || dateFields.length > 0) && (
                                            <div
                                                style={{
                                                    ...metaTextStyle,
                                                    display: "flex",
                                                    justifyContent: "space-between",
                                                    alignItems: "baseline",
                                                    flexWrap: "wrap",
                                                    gap: `${RESUME_DOCUMENT_TYPOGRAPHY.dateGroupGapPx}px ${RESUME_DOCUMENT_TYPOGRAPHY.metaDateGapPx}px`
                                                }}
                                            >
                                                <div style={{ display: "flex", alignItems: "baseline", flexWrap: "wrap", gap: RESUME_DOCUMENT_TYPOGRAPHY.metaGroupGapPx, minWidth: 0, flex: "1 1 auto", overflow: "visible" }}>
                                                    {metaFields.map((field, index) => (
                                                        <React.Fragment key={`${field.value}-${index}`}>
                                                            {index > 0 && <span style={{ color: "#cbd5e1", flexShrink: 0 }}>|</span>}
                                                            <span style={metaFieldStyle(field.weight, field.color)}>{field.value}</span>
                                                        </React.Fragment>
                                                    ))}
                                                </div>
                                                {dateFields.length > 0 && (
                                                    <div style={{ display: "flex", alignItems: "baseline", flexWrap: "wrap", gap: RESUME_DOCUMENT_TYPOGRAPHY.dateGroupGapPx, flexShrink: 0 }}>
                                                        {dateFields.map((date, index) => (
                                                            <React.Fragment key={`${date}-${index}`}>
                                                                {index > 0 && <span style={{ color: "#cbd5e1" }}>-</span>}
                                                                <span style={{ padding: fieldPadding }}>{date}</span>
                                                            </React.Fragment>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        {details.length > 0 && (
                                            <div style={{ display: "flex", flexDirection: "column", gap: RESUME_DOCUMENT_TYPOGRAPHY.educationDetailGapPx, margin: `${RESUME_DOCUMENT_TYPOGRAPHY.educationDetailGapPx}px 0 0 ${RESUME_DOCUMENT_TYPOGRAPHY.bulletIndentPx}px` }}>
                                                {details.map((detail) => (
                                                    <div key={detail.id} className="resume-diagnostic-bullet-row" data-resume-diagnostic="bullet-row" style={bulletRowStyle}>
                                                        <span style={bulletMarkerStyle}>&bull;</span>
                                                        <div style={bulletTextStyle}>{detail.text}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                    </div>
                </section>
            )}

            {(resumeData.skills || []).some((skill) => hasText(skill.category) || (skill.items || []).some(hasText)) && (
                <section>
                    <h2 style={headingStyle}>Skills</h2>
                    <div style={{ display: "flex", flexDirection: "column", gap: RESUME_DOCUMENT_TYPOGRAPHY.skillItemGapPx }}>
                        {(resumeData.skills || [])
                            .filter((skill) => hasText(skill.category) || (skill.items || []).some(hasText))
                            .map((skill) => (
                                <div key={skill.id} style={{ ...bodyTextStyle, display: "flex", alignItems: "flex-start", justifyContent: "flex-start", gap: RESUME_DOCUMENT_TYPOGRAPHY.metaGroupGapPx }}>
                                    {hasText(skill.category) && <strong style={{ flexShrink: 0, padding: fieldPadding, color: "#0f172a", fontFamily: RESUME_DOCUMENT_TYPOGRAPHY.contactFamily, fontWeight: 700, lineHeight: RESUME_DOCUMENT_TYPOGRAPHY.metaLineHeight, textAlign: "left" }}>{skill.category}</strong>}
                                    {hasText(skill.category) && (skill.items || []).some(hasText) && <span style={{ flexShrink: 0, paddingTop: 4, fontWeight: 700, lineHeight: 1, color: "#0f172a" }}>:</span>}
                                    <span style={{ minWidth: 0, padding: fieldPadding }}>{(skill.items || []).filter(hasText).join(", ")}</span>
                                </div>
                            ))}
                    </div>
                </section>
            )}
        </div>
    );
};
