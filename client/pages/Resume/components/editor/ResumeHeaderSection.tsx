import React from "react";
import { motion } from "framer-motion";
import type { ContactFieldKey, ResumeData } from "../../types";
import { ptToPx } from "../../utils/documentUnits";
import { DocumentSection } from "../DocumentSection";
import type { ResumeDocumentEditorProps } from "../ResumeDocumentEditor";

export const ResumeHeaderSection: React.FC<ResumeDocumentEditorProps> = ({
    data,
    formatting,
    interaction,
    handlers
}) => {
    const { resumeData, headerContactRows, showHeaderContactEditors } = data;
    const {
        titleFontSize,
        documentSectionGapPx,
        boldInputClass,
        contactInputClass,
        resumeDividerClass,
        headerMarginAddClass
    } = formatting;
    const {
        activeDocumentSection,
        focusedDocumentSection,
        setActiveDocumentSection,
        hoveredNameSection,
        setHoveredNameSection,
        focusedNameSection,
        setFocusedNameSection,
        hoveredContactField,
        setHoveredContactField,
        focusedContactField,
        setFocusedContactField,
        hoveredDeleteIndex,
        setHoveredDeleteIndex,
        gapPreviewTarget
    } = interaction;
    const {
        getDynamicInputStyle,
        contactFieldStyle,
        updateField,
        addCustomContactField,
        updateCustomContactField,
        removeCustomContactField,
        removeStandardContactField
    } = handlers;

    return (
        <DocumentSection
            id="header"
            activeSection={activeDocumentSection}
            focusedSection={focusedDocumentSection}
            setActiveSection={setActiveDocumentSection}
            showGapPreview={gapPreviewTarget === "section"}
            gapPreviewHeight={documentSectionGapPx}
        >
            <div
                className="resume-editor-name"
                data-active={activeDocumentSection === "header"}
                data-highlighted={hoveredNameSection || focusedNameSection}
                onMouseEnter={() => setHoveredNameSection(true)}
                onMouseLeave={() => setHoveredNameSection(false)}
            >
                <input
                    className={`${boldInputClass} resume-title-font-target resume-editor-name__input`}
                    value={resumeData.fullName}
                    onChange={(event) => updateField("fullName", event.target.value)}
                    onFocus={() => setFocusedNameSection(true)}
                    onBlur={() => setFocusedNameSection(false)}
                    placeholder="YOUR NAME"
                    style={getDynamicInputStyle(
                        resumeData.fullName,
                        "YOUR NAME",
                        `bold ${ptToPx(titleFontSize)}px Poppins, Arial, sans-serif`,
                        { fontSize: "var(--resume-title-font-size)" }
                    )}
                />
            </div>

            {(showHeaderContactEditors || headerContactRows.length > 0) && (
                <div
                    className="contact-strip resume-editor-contact-strip"
                    data-contact-open={Boolean(hoveredContactField || focusedContactField)}
                    data-active={activeDocumentSection === "header"}
                >
                    <button
                        type="button"
                        onClick={addCustomContactField}
                        className={`${headerMarginAddClass} resume-editor-contact-add`}
                        title="Add custom link"
                        aria-label="Add contact metadata field"
                    >
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                    </button>
                    {(() => {
                        const activeContactField = hoveredContactField || focusedContactField;
                        const activeRowIndex = headerContactRows.findIndex((row) =>
                            row.some((field) => field.key === activeContactField)
                        );

                        return headerContactRows.map((row, rowIndex) => {
                            const isActiveRow = activeRowIndex === rowIndex;
                            return (
                                <div
                                    key={rowIndex}
                                    className="contact-row resume-editor-contact-row"
                                    style={{ zIndex: isActiveRow ? 70 : 0 }}
                                >
                                    {row.map((field, fieldIndex) => (
                                        <React.Fragment key={field.key}>
                                            {fieldIndex > 0 && (
                                                <span
                                                    className={`${resumeDividerClass} contact-divider`}
                                                >
                                                    &bull;
                                                </span>
                                            )}
                                            {(() => {
                                                const isOpen =
                                                    hoveredContactField === field.key
                                                    || focusedContactField === field.key;
                                                const buttonsEnd = 20;
                                                const overlayLeftPad = 2;
                                                const overlayRightPad = buttonsEnd + 8;
                                                const fluidEase = [0.32, 0.72, 0.32, 1] as [
                                                    number,
                                                    number,
                                                    number,
                                                    number
                                                ];
                                                return (
                                                    <motion.div
                                                        className="contact-meta-field resume-editor-contact-field"
                                                        data-open={isOpen}
                                                        onHoverStart={() => setHoveredContactField(field.key)}
                                                        onHoverEnd={() =>
                                                            setHoveredContactField((current) =>
                                                                current === field.key ? null : current
                                                            )
                                                        }
                                                        animate={{
                                                            paddingTop: isOpen ? 2 : 0,
                                                            paddingRight: overlayRightPad,
                                                            paddingBottom: isOpen ? 1 : 0,
                                                            paddingLeft: overlayLeftPad,
                                                            marginTop: isOpen ? -2 : 0,
                                                            marginRight: -overlayRightPad,
                                                            marginBottom: isOpen ? -1 : 0,
                                                            marginLeft: -overlayLeftPad,
                                                            backgroundColor: isOpen
                                                                ? "rgba(255, 255, 255, 0.94)"
                                                                : "rgba(255, 255, 255, 0)",
                                                            borderTopLeftRadius: isOpen ? 5 : 4,
                                                            borderTopRightRadius: isOpen ? 5 : 4,
                                                            borderBottomLeftRadius: isOpen ? 5 : 4,
                                                            borderBottomRightRadius: isOpen ? 5 : 4,
                                                            boxShadow: isOpen
                                                                ? hoveredDeleteIndex === field.key
                                                                    ? "0 10px 30px rgba(15, 23, 42, 0.15), 0 0 0 1px #dc2626"
                                                                    : "0 10px 30px rgba(15, 23, 42, 0.15), 0 0 0 1px rgba(14, 165, 233, 0.35)"
                                                                : "0 0px 0px rgba(0,0,0,0), 0 0 0 0px rgba(0,0,0,0)"
                                                        }}
                                                        transition={{ duration: 0.28, ease: fluidEase }}
                                                        style={{
                                                            transformOrigin: "center",
                                                            zIndex: isOpen ? 80 : 0,
                                                            backdropFilter: isOpen
                                                                ? "blur(22px) saturate(160%)"
                                                                : "none",
                                                            WebkitBackdropFilter: isOpen
                                                                ? "blur(22px) saturate(160%)"
                                                                : "none"
                                                        }}
                                                    >
                                                        <div className="resume-editor-contact-field__input">
                                                            <input
                                                                className={`${contactInputClass} contact-item-input`}
                                                                value={field.value || ""}
                                                                onChange={(event) => {
                                                                    if (field.isCustom === true) {
                                                                        updateCustomContactField(
                                                                            field.index,
                                                                            "value",
                                                                            event.target.value
                                                                        );
                                                                    } else {
                                                                        updateField(
                                                                            field.key as keyof ResumeData,
                                                                            event.target.value
                                                                        );
                                                                    }
                                                                }}
                                                                onFocus={() => setFocusedContactField(field.key)}
                                                                onBlur={() =>
                                                                    setFocusedContactField((current) =>
                                                                        current === field.key ? null : current
                                                                    )
                                                                }
                                                                placeholder={field.placeholder || "Add text"}
                                                                style={{
                                                                    ...contactFieldStyle(
                                                                        field.value,
                                                                        field.placeholder || "Add text"
                                                                    ),
                                                                    color:
                                                                        hoveredDeleteIndex === field.key
                                                                            ? "#dc2626"
                                                                            : isOpen
                                                                            ? "#0f172a"
                                                                            : undefined,
                                                                    textDecoration:
                                                                        hoveredDeleteIndex === field.key
                                                                            ? "line-through"
                                                                            : undefined,
                                                                    textDecorationColor:
                                                                        hoveredDeleteIndex === field.key
                                                                            ? "#dc2626"
                                                                            : undefined,
                                                                    borderRadius: isOpen ? 4 : undefined,
                                                                    transition:
                                                                        "color 150ms ease, text-decoration 150ms ease, text-decoration-color 150ms ease"
                                                                }}
                                                            />
                                                            {isOpen && (
                                                                <button
                                                                    type="button"
                                                                    onMouseEnter={() =>
                                                                        setHoveredDeleteIndex(field.key)
                                                                    }
                                                                    onMouseLeave={() => setHoveredDeleteIndex(null)}
                                                                    onMouseDown={(event) => event.preventDefault()}
                                                                    onClick={() => {
                                                                        if (field.isCustom === true) {
                                                                            removeCustomContactField(field.index);
                                                                        } else {
                                                                            removeStandardContactField(
                                                                                field.key as ContactFieldKey
                                                                            );
                                                                        }
                                                                    }}
                                                                    className="resume-edit-control resume-editor-contact-delete"
                                                                    title="Delete"
                                                                    aria-label={`Delete ${
                                                                        field.isCustom
                                                                            ? "custom field"
                                                                            : field.placeholder
                                                                    }`}
                                                                >
                                                                    <svg
                                                                        className="h-2.5 w-2.5"
                                                                        fill="none"
                                                                        viewBox="0 0 24 24"
                                                                        stroke="#f87171"
                                                                        strokeWidth="2.75"
                                                                        aria-hidden="true"
                                                                    >
                                                                        <path
                                                                            strokeLinecap="round"
                                                                            strokeLinejoin="round"
                                                                            d="M6 7h12M9 7V5h6v2m-8 3 .7 9h8.6l.7-9"
                                                                        />
                                                                    </svg>
                                                                </button>
                                                            )}
                                                        </div>
                                                    </motion.div>
                                                );
                                            })()}
                                        </React.Fragment>
                                    ))}
                                </div>
                            );
                        });
                    })()}
                </div>
            )}
        </DocumentSection>
    );
};
