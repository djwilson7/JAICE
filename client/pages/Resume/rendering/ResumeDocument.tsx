import React from "react";
import type { ResumeData, ResumeFormatting } from "../types";
import { buildResumeRenderTokens } from "../formatting";
import { buildResumeRenderModel, type ResumeRenderBullet, type ResumeRenderMetaField } from "./renderModel";
import "../../../../common/resume_render/formatting.css";
import "../../../../common/resume_render/document.css";

export type ResumeDocumentProps = {
    resumeData: ResumeData;
    formatting: ResumeFormatting;
    rootId?: string;
    className?: string;
    style?: React.CSSProperties;
    ariaHidden?: boolean;
    surface?: "screen" | "print" | "diagnostic";
};

type MetaRowProps = {
    meta: ResumeRenderMetaField[];
    dates: string[];
    hasBullets?: boolean;
};

const MetaRow: React.FC<MetaRowProps> = ({ meta, dates, hasBullets = false }) => {
    if (!meta.length && !dates.length) return null;
    return (
        <div className={`resume-document__meta-row${hasBullets ? " resume-document__meta-row--with-bullets" : ""}`}>
            <div className="resume-document__meta-fields">
                {meta.map((field, index) => (
                    <React.Fragment key={`${field.value}-${index}`}>
                        {index > 0 && <span className="resume-document__separator">|</span>}
                        <span className={`resume-document__meta-field resume-document__meta-field--${field.tone}`}>
                            {field.value}
                        </span>
                    </React.Fragment>
                ))}
            </div>
            {dates.length > 0 && (
                <div className="resume-document__date-fields">
                    {dates.map((date, index) => (
                        <React.Fragment key={`${date}-${index}`}>
                            {index > 0 && <span className="resume-document__separator">-</span>}
                            <span className="resume-document__date-field">{date}</span>
                        </React.Fragment>
                    ))}
                </div>
            )}
        </div>
    );
};

const BulletStack: React.FC<{ bullets: ResumeRenderBullet[]; education?: boolean }> = ({
    bullets,
    education = false
}) => {
    if (!bullets.length) return null;
    return (
        <div className={`resume-document__bullet-stack${education ? " resume-document__bullet-stack--education" : ""}`}>
            {bullets.map((bullet) => (
                <div
                    key={bullet.id}
                    className="resume-document__bullet-row resume-diagnostic-bullet-row"
                    data-resume-diagnostic="bullet-row"
                >
                    <span className="resume-document__bullet-marker">&bull;</span>
                    <div className="resume-document__body resume-document__bullet-text">{bullet.text}</div>
                </div>
            ))}
        </div>
    );
};

export const ResumeDocument: React.FC<ResumeDocumentProps> = ({
    resumeData,
    formatting,
    rootId,
    className = "",
    style,
    ariaHidden,
    surface = "screen"
}) => {
    const model = buildResumeRenderModel(resumeData);
    const tokens = buildResumeRenderTokens(formatting);
    const rootClassName = ["resume-formatting-context", "resume-document", className].filter(Boolean).join(" ");

    return (
        <div
            id={rootId}
            className={rootClassName}
            aria-hidden={ariaHidden}
            data-resume-document-surface={surface}
            data-resume-layout-density={tokens.formatting.paperLayoutFormat}
            data-resume-inner-density={tokens.formatting.innerSectionGapFormat}
            data-print-page={tokens.paperMetrics.printName}
            style={{
                ...tokens.documentCssVariables,
                width: tokens.pageWidth,
                height: tokens.pageHeight,
                padding: "var(--resume-page-margin)",
                ...style
            }}
        >
            <section className="resume-document__section" data-section="header">
                <h1 className="resume-document__title resume-font--title resume-title-font-target">{model.fullName}</h1>
                {model.contactRows.length > 0 && (
                    <div className="resume-document__contact-strip resume-font--contact resume-body-font-target">
                        {model.contactRows.map((row, rowIndex) => (
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

            {model.summary && (
                <section className="resume-document__section" data-section="summary">
                    <h2 className="resume-document__section-title resume-font--heading resume-header-font-target">{model.summary.title}</h2>
                    <p className="resume-document__body resume-font--body resume-body-font-target">{model.summary.text}</p>
                </section>
            )}

            {model.experience.length > 0 && (
                <section className="resume-document__section" data-section="experience">
                    <h2 className="resume-document__section-title resume-font--heading resume-header-font-target">
                        {model.experience[0].title}
                    </h2>
                    <div className="resume-document__item-stack">
                        {model.experience.map((experience) => (
                            <article className="resume-document__item" key={experience.id}>
                                <MetaRow
                                    meta={experience.meta}
                                    dates={experience.dates}
                                    hasBullets={experience.bullets.length > 0}
                                />
                                <BulletStack bullets={experience.bullets} />
                            </article>
                        ))}
                    </div>
                </section>
            )}

            {model.education.length > 0 && (
                <section className="resume-document__section" data-section="education">
                    <h2 className="resume-document__section-title resume-font--heading resume-header-font-target">
                        {model.education[0].title}
                    </h2>
                    <div className="resume-document__item-stack">
                        {model.education.map((education) => (
                            <article className="resume-document__item" key={education.id}>
                                <MetaRow meta={education.meta} dates={education.dates} />
                                <BulletStack bullets={education.details} education />
                            </article>
                        ))}
                    </div>
                </section>
            )}

            {model.skills.length > 0 && (
                <section className="resume-document__section" data-section="skills">
                    <h2 className="resume-document__section-title resume-font--heading resume-header-font-target">
                        {model.skills[0].title}
                    </h2>
                    <div className="resume-document__skill-stack">
                        {model.skills.map((skill) => (
                            <div className="resume-document__skill-row" key={skill.id}>
                                {skill.category && (
                                    <strong className="resume-document__skill-category resume-font--subheading resume-subheader-font-target">
                                        {skill.category}
                                    </strong>
                                )}
                                {skill.category && skill.items.length > 0 && (
                                    <span className="resume-document__skill-colon">:</span>
                                )}
                                <span className="resume-document__skill-items">{skill.items.join(", ")}</span>
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
};
