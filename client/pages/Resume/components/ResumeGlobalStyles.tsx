import React from "react";
import type { PaperMetrics } from "../types";

type ResumeGlobalStylesProps = {
    paperMetrics: PaperMetrics;
    printWidth: string;
    printHeight: string;
    pageMarginPt: number;
};

export const ResumeGlobalStyles: React.FC<ResumeGlobalStylesProps> = ({ paperMetrics, printWidth, printHeight, pageMarginPt }) => (
    <>
        {/* RESUME SCROLLBAR AND PRINT STYLES */}
        <style dangerouslySetInnerHTML={{ __html: `
            #resume-print-document {
                display: none;
            }
            @media print {
                @page {
                    size: ${paperMetrics.printName};
                    margin: 0;
                }
                html, body {
                    width: ${printWidth};
                    height: ${printHeight};
                    overflow: visible !important;
                    background: white !important;
                }
                body * {
                    visibility: hidden;
                }
                #resume-print-document,
                #resume-print-document * {
                    visibility: visible;
                }
                #resume-print-document {
                    display: block !important;
                    position: absolute;
                    left: 0;
                    top: 0;
                    width: ${printWidth} !important;
                    height: ${printHeight} !important;
                    min-height: ${printHeight} !important;
                    max-width: 100% !important;
                    margin: 0 !important;
                    box-shadow: none !important;
                    border: none !important;
                    background: white !important;
                    color: black !important;
                    overflow: visible !important;
                    transform: none !important;
                    border-radius: 0 !important;
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }
            }
            #print-canvas::-webkit-scrollbar {
                width: 6px;
            }
            #print-canvas::-webkit-scrollbar-track {
                background: transparent;
            }
            #print-canvas::-webkit-scrollbar-thumb {
                background-color: #cbd5e1;
                border-radius: 4px;
            }
            #print-canvas::-webkit-scrollbar-thumb:hover {
                background-color: #94a3b8;
            }
            #print-canvas[data-font-preview="title"] .resume-title-font-target,
            #print-canvas[data-font-preview="header"] .resume-header-font-target,
            #print-canvas[data-font-preview="body"] .resume-body-font-target {
                outline: 2px solid #38bdf8 !important;
                outline-offset: 2px !important;
                box-shadow: 0 0 0 4px rgba(56, 189, 248, 0.18), 0 0 18px rgba(56, 189, 248, 0.34) !important;
                background-color: rgba(240, 249, 255, 0.82) !important;
                border-color: #38bdf8 !important;
                border-radius: 4px !important;
            }
            .resume-margin-preview {
                position: absolute;
                inset: 0;
                pointer-events: none;
                z-index: 120;
                overflow: hidden;
                border: 2px solid #38bdf8;
                border-radius: 4px;
                box-shadow: 0 0 18px rgba(56, 189, 248, 0.42);
            }
            .resume-margin-preview-band {
                position: absolute;
                background: repeating-linear-gradient(
                    135deg,
                    rgba(56, 189, 248, 0.12),
                    rgba(56, 189, 248, 0.12) 7px,
                    rgba(14, 165, 233, 0.22) 7px,
                    rgba(14, 165, 233, 0.22) 14px
                );
            }
            .resume-margin-preview-content {
                position: absolute;
                border: 2px solid #38bdf8;
                border-radius: 4px;
                box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.14), 0 0 16px rgba(56, 189, 248, 0.34);
            }
            .resume-section-gap-preview {
                position: absolute;
                left: 0;
                right: 0;
                pointer-events: none;
                z-index: 3;
                border: 2px solid #38bdf8;
                border-radius: 4px;
                background: repeating-linear-gradient(
                    135deg,
                    rgba(56, 189, 248, 0.16),
                    rgba(56, 189, 248, 0.16) 6px,
                    rgba(14, 165, 233, 0.28) 6px,
                    rgba(14, 165, 233, 0.28) 12px
                );
                box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.16), 0 0 16px rgba(56, 189, 248, 0.34);
            }
            .resume-page-format-preview {
                position: absolute;
                inset: 0;
                pointer-events: none;
                z-index: 130;
                border: 2px solid #38bdf8;
                border-radius: 4px;
                box-shadow: 0 0 0 4px rgba(56, 189, 248, 0.18), 0 0 22px rgba(56, 189, 248, 0.42);
            }
            .resume-page-format-dimension {
                position: absolute;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                border-radius: 999px;
                border: 1px solid rgba(125, 211, 252, 0.72);
                background: rgba(15, 23, 42, 0.88);
                color: #e0f2fe;
                font-family: var(--font-body);
                font-size: 11px;
                font-weight: 700;
                line-height: 1;
                letter-spacing: 0;
                box-shadow: 0 10px 24px rgba(2, 6, 23, 0.28), 0 0 16px rgba(56, 189, 248, 0.24);
                white-space: nowrap;
            }
            .resume-page-format-dimension-width {
                left: 50%;
                top: 0;
                transform: translate(-50%, calc(-100% - 8px));
                padding: 5px 10px;
            }
            .resume-page-format-dimension-height {
                left: 0;
                top: 50%;
                transform: translate(calc(-100% - 8px), -50%) rotate(-90deg);
                transform-origin: center;
                padding: 5px 10px;
            }
            .resume-page-style-shelf button {
                border-radius: 3px !important;
            }
            .resume-page-style-shelf button:hover {
                border-radius: 3px !important;
                transform: none !important;
            }
            .resume-clone-action {
                display: inline-flex !important;
                height: 42px !important;
                width: 100% !important;
                max-height: none !important;
                align-items: center !important;
                justify-content: center !important;
                border-radius: 8px !important;
                padding: 0 16px !important;
                font-family: var(--font-body) !important;
                font-size: 13px !important;
                font-weight: 700 !important;
                line-height: 1 !important;
                white-space: nowrap !important;
                transform: none !important;
                transition: background-color 160ms ease, border-color 160ms ease, color 160ms ease, box-shadow 160ms ease !important;
            }
            .resume-clone-action:hover {
                transform: none !important;
            }
            .resume-clone-action-primary {
                background: rgba(245, 158, 11, 0.18) !important;
                border: 1px solid rgba(251, 191, 36, 0.52) !important;
                color: #fde68a !important;
                box-shadow: 0 10px 24px rgba(245, 158, 11, 0.14), inset 0 1px 0 rgba(255, 255, 255, 0.12) !important;
            }
            .resume-clone-action-primary:hover {
                background: rgba(245, 158, 11, 0.26) !important;
                border-color: rgba(253, 230, 138, 0.72) !important;
                color: #fffbeb !important;
                box-shadow: 0 12px 28px rgba(245, 158, 11, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.16) !important;
            }
            .resume-clone-action-secondary {
                background: rgba(14, 165, 233, 0.16) !important;
                border: 1px solid rgba(125, 211, 252, 0.48) !important;
                color: #bae6fd !important;
                box-shadow: 0 10px 24px rgba(14, 165, 233, 0.13), inset 0 1px 0 rgba(255, 255, 255, 0.12) !important;
            }
            .resume-clone-action-secondary:hover {
                background: rgba(14, 165, 233, 0.24) !important;
                border-color: rgba(186, 230, 253, 0.68) !important;
                color: #f0f9ff !important;
                box-shadow: 0 12px 28px rgba(14, 165, 233, 0.17), inset 0 1px 0 rgba(255, 255, 255, 0.16) !important;
            }
            html[data-theme="light"] .resume-clone-action-primary {
                background: rgba(245, 158, 11, 0.22) !important;
                border-color: rgba(180, 83, 9, 0.42) !important;
                color: #78350f !important;
                box-shadow: 0 10px 24px rgba(180, 83, 9, 0.14), inset 0 1px 0 rgba(255, 255, 255, 0.78) !important;
            }
            html[data-theme="light"] .resume-clone-action-primary:hover {
                background: rgba(245, 158, 11, 0.32) !important;
                border-color: rgba(146, 64, 14, 0.54) !important;
                color: #451a03 !important;
            }
            html[data-theme="light"] .resume-clone-action-secondary {
                background: rgba(14, 165, 233, 0.18) !important;
                border-color: rgba(2, 132, 199, 0.42) !important;
                color: #075985 !important;
                box-shadow: 0 10px 24px rgba(2, 132, 199, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.78) !important;
            }
            html[data-theme="light"] .resume-clone-action-secondary:hover {
                background: rgba(14, 165, 233, 0.28) !important;
                border-color: rgba(3, 105, 161, 0.54) !important;
                color: #0c4a6e !important;
            }
            .resume-page-style-shelf.is-compact {
                bottom: 4.5rem !important;
                height: 142px !important;
                width: fit-content !important;
                max-width: calc(100% - 3rem) !important;
                padding-top: 0.75rem !important;
                padding-bottom: 0.75rem !important;
            }
            .resume-page-style-shelf.is-compact .resume-page-style-shelf-layout {
                display: grid !important;
                width: max-content !important;
                max-width: 100% !important;
                grid-template-columns: repeat(4, max-content);
                grid-template-rows: max-content max-content;
                justify-content: center;
                align-content: center;
                column-gap: 1rem;
                row-gap: 0.75rem;
            }
            .resume-page-style-shelf.is-compact .resume-page-style-shelf-font {
                display: contents !important;
            }
            .resume-page-style-shelf.is-compact .resume-page-style-shelf-page-format {
                grid-column: 1 / span 2;
                grid-row: 2;
                justify-self: center;
                align-items: flex-start !important;
            }
            .resume-page-style-shelf.is-compact .resume-page-style-shelf-spacing {
                grid-column: 2;
                grid-row: 1 / span 2;
                display: contents !important;
                justify-self: end;
                align-items: flex-end !important;
            }
            .resume-page-style-shelf.is-compact .resume-page-style-shelf-spacing-controls {
                display: contents !important;
            }
            .resume-page-style-shelf.is-compact .resume-page-style-shelf-font-controls {
                display: contents !important;
            }
            .resume-page-style-shelf.is-compact .resume-page-style-shelf-title-size {
                grid-column: 1;
                grid-row: 1;
                justify-self: start;
            }
            .resume-page-style-shelf.is-compact .resume-page-style-shelf-header-size {
                grid-column: 2;
                grid-row: 1;
                justify-self: start;
            }
            .resume-page-style-shelf.is-compact .resume-page-style-shelf-body-size {
                grid-column: 3;
                grid-row: 1;
                justify-self: start;
            }
            .resume-page-style-shelf.is-compact .resume-page-style-shelf-margins {
                grid-column: 4;
                grid-row: 1;
                justify-self: start;
            }
            .resume-page-style-shelf.is-compact .resume-page-style-shelf-section-gap {
                grid-column: 3 / span 2;
                grid-row: 2;
                justify-self: center;
            }
            .resume-page-style-shelf.is-compact .resume-page-style-shelf-divider {
                display: none !important;
            }
            .resume-page-style-shelf.is-compact .resume-page-style-shelf-section {
                height: auto !important;
                padding-top: 0 !important;
                padding-bottom: 0 !important;
            }
            .resume-page-style-shelf.is-compact .resume-page-style-shelf-title {
                display: none !important;
            }
            @media (max-width: 1000px) {
                .resume-page-style-shelf {
                    bottom: 4.5rem !important;
                    height: 142px !important;
                    padding-top: 0.75rem !important;
                    padding-bottom: 0.75rem !important;
                }
                .resume-page-style-shelf-layout {
                    display: grid !important;
                    width: max-content !important;
                    max-width: 100% !important;
                    grid-template-columns: repeat(4, max-content);
                    grid-template-rows: max-content max-content;
                    justify-content: center;
                    align-content: center;
                    column-gap: 1rem;
                    row-gap: 0.75rem;
                }
                .resume-page-style-shelf-font {
                    display: contents !important;
                }
                .resume-page-style-shelf-page-format {
                    grid-column: 1 / span 2;
                    grid-row: 2;
                    justify-self: center;
                }
                .resume-page-style-shelf-spacing {
                    grid-column: 2;
                    grid-row: 1 / span 2;
                    display: contents !important;
                }
                .resume-page-style-shelf-spacing-controls,
                .resume-page-style-shelf-font-controls {
                    display: contents !important;
                }
                .resume-page-style-shelf-title-size {
                    grid-column: 1;
                    grid-row: 1;
                }
                .resume-page-style-shelf-header-size {
                    grid-column: 2;
                    grid-row: 1;
                }
                .resume-page-style-shelf-body-size {
                    grid-column: 3;
                    grid-row: 1;
                }
                .resume-page-style-shelf-margins {
                    grid-column: 4;
                    grid-row: 1;
                }
                .resume-page-style-shelf-section-gap {
                    grid-column: 3 / span 2;
                    grid-row: 2;
                    justify-self: center;
                }
                .resume-page-style-shelf-divider {
                    display: none !important;
                }
                .resume-page-style-shelf-section {
                    height: auto !important;
                    padding-top: 0 !important;
                    padding-bottom: 0 !important;
                }
                .resume-page-style-shelf-title {
                    display: none !important;
                }
            }
            
            /* Contact strip: allow trash pop-up to overflow downward */
            .contact-meta-field {
                overflow: visible !important;
            }
            .contact-trash-tray {
                overflow: hidden;
            }
            /* Input inside an active (open) field: collapse its bg/border so container glass shows through */
            .contact-meta-field[data-open="true"] .contact-item-input {
                background: transparent !important;
                border-color: transparent !important;
                box-shadow: none !important;
                color: black;
            }
            .contact-meta-field[data-open="true"] .contact-item-input::placeholder {
                color: rgba(100, 116, 139, 0.50) !important;
            }

            /* Professional Summary block overlay */
            .summary-meta-field {
                overflow: visible !important;
            }
            .summary-trash-tray {
                overflow: hidden;
            }
            .summary-meta-field[data-open="true"] .summary-item-input {
                background: transparent !important;
                border-color: transparent !important;
                box-shadow: none !important;
                color: black !important;
            }
            .summary-meta-field[data-open="true"] .summary-item-input::placeholder {
                color: rgba(100, 116, 139, 0.50) !important;
            }

            /* Generic overlay inputs inside document canvas */
            .overlay-meta-field {
                overflow: visible !important;
            }
            .overlay-item-input {
                white-space: pre-wrap !important;
                word-break: break-word !important;
                overflow: auto !important;
                scrollbar-width: none !important;
            }
            .overlay-item-input::-webkit-scrollbar {
                display: none !important;
            }
            .overlay-trash-tray {
                overflow: hidden;
            }
            .overlay-meta-field[data-open="true"] .overlay-item-input {
                background: transparent !important;
                border-color: transparent !important;
                box-shadow: none !important;
                color: black;
            }
            .resume-text-stat-pill {
                background: white !important;
                color: black !important;
                border: 1px solid #38bdf8 !important;
                box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08) !important;
            }
            .resume-text-stat-pill::before {
                display: none !important;
            }
            .document-hover-section {
                isolation: isolate;
                margin-left: -${pageMarginPt}pt;
                margin-right: -${pageMarginPt}pt;
                padding-left: ${pageMarginPt}pt;
                padding-right: ${pageMarginPt}pt;
                padding-top: 10px;
                padding-bottom: 10px;
                width: calc(100% + ${pageMarginPt * 2}pt);
            }
            .document-hover-section-border {
                top: 0;
                right: 0;
                bottom: 0;
                left: 0;
                border: 1px solid rgba(30, 64, 175, 0.52);
                background: rgba(30, 64, 175, 0.045);
                box-shadow: inset 0 0 0 1px rgba(30, 64, 175, 0.12);
            }
            .document-hover-section[data-active="true"] > .document-hover-section-border {
                opacity: 1;
            }
            .document-hover-section[data-section="header"] {
                margin-top: -${pageMarginPt}pt;
                padding-top: ${pageMarginPt}pt;
            }
            .document-hover-section[data-section="skills"] {
                flex: 1 1 auto;
                margin-bottom: -${pageMarginPt}pt;
                padding-bottom: ${pageMarginPt}pt;
            }
            @property --experience-ai-angle {
                syntax: "<angle>";
                inherits: false;
                initial-value: 0deg;
            }
            @keyframes experience-ai-shimmer {
                from { --experience-ai-angle: 0deg; }
                to { --experience-ai-angle: 360deg; }
            }
            .experience-ai-hover::before {
                content: "";
                pointer-events: none;
                position: absolute;
                inset: -2px;
                border-radius: inherit;
                padding: 2px;
                --experience-ai-angle: 0deg;
                background: conic-gradient(from var(--experience-ai-angle), rgba(30, 64, 175, 0.34), rgba(96, 165, 250, 0.82), rgba(255, 255, 255, 0.96), rgba(14, 165, 233, 0.78), rgba(30, 64, 175, 0.42), rgba(219, 234, 254, 0.90), rgba(37, 99, 235, 0.76), rgba(30, 64, 175, 0.34));
                animation: experience-ai-shimmer 4.4s linear infinite;
                -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
                -webkit-mask-composite: xor;
                mask-composite: exclude;
                box-shadow: 0 0 12px rgba(37, 99, 235, 0.18);
            }
            input.resume-rewrite-current-accept-hover,
            textarea.resume-rewrite-current-accept-hover,
            .resume-rewrite-current-accept-hover input,
            .resume-rewrite-current-accept-hover textarea {
                color: #dc2626 !important;
                border-color: rgba(220, 38, 38, 0.76) !important;
                text-decoration: line-through;
                text-decoration-color: #dc2626;
            }
            input.resume-rewrite-current-reject-hover,
            textarea.resume-rewrite-current-reject-hover,
            .resume-rewrite-current-reject-hover input,
            .resume-rewrite-current-reject-hover textarea {
                color: #059669 !important;
                border-color: rgba(5, 150, 105, 0.76) !important;
            }
            .resume-rewrite-suggestion-accept-hover {
                color: #059669 !important;
                border-color: rgba(5, 150, 105, 0.78) !important;
                background: rgba(236, 253, 245, 0.82) !important;
            }
            .resume-rewrite-suggestion-reject-hover {
                color: #dc2626 !important;
                border-color: rgba(220, 38, 38, 0.78) !important;
                background: rgba(254, 242, 242, 0.82) !important;
            }
            .resume-rewrite-suggestion-reject-hover {
                text-decoration: line-through;
                text-decoration-color: #dc2626;
            }
            .resume-rewrite-suggestion-text {
                display: block;
                border: 1px solid transparent;
                border-radius: 4px;
                margin: -2px -4px 0;
                padding: 2px 4px;
                text-align: left !important;
                transition: background 150ms ease, border-color 150ms ease, color 150ms ease, text-decoration-color 150ms ease;
            }
            .resume-rewrite-action-button {
                display: inline-flex !important;
                height: 18px !important;
                width: 18px !important;
                min-width: 18px !important;
                align-items: center;
                justify-content: center;
                border-radius: 9999px;
                border: 1px solid transparent !important;
                background: transparent !important;
                padding: 0 !important;
                box-shadow: none !important;
                transition: background 150ms ease, border-color 150ms ease, transform 150ms ease, color 150ms ease;
            }
            .resume-rewrite-action-button:hover {
                transform: scale(1.05);
            }
            .experience-delete-hover,
            .experience-delete-hover input,
            .experience-delete-hover textarea,
            .experience-delete-hover span {
                color: #dc2626 !important;
                text-decoration: line-through;
                text-decoration-color: #dc2626;
            }
            .experience-delete-hover input::placeholder,
            .experience-delete-hover textarea::placeholder {
                color: rgba(220, 38, 38, 0.62) !important;
            }
            .experience-clear-hover,
            .experience-clear-hover input,
            .experience-clear-hover textarea,
            .experience-clear-hover span {
                color: #64748b !important;
                text-decoration: line-through;
            }
            @property --experience-ai-angle {
                syntax: "<angle>";
                inherits: false;
                initial-value: 0deg;
            }
            @keyframes experience-ai-shimmer {
                from { --experience-ai-angle: 0deg; }
                to { --experience-ai-angle: 360deg; }
            }
            .experience-ai-hover::before {
                content: "";
                pointer-events: none;
                position: absolute;
                inset: -2px;
                border-radius: inherit;
                padding: 2px;
                --experience-ai-angle: 0deg;
                background: conic-gradient(from var(--experience-ai-angle), rgba(30, 64, 175, 0.34), rgba(96, 165, 250, 0.82), rgba(255, 255, 255, 0.96), rgba(14, 165, 233, 0.78), rgba(30, 64, 175, 0.42), rgba(219, 234, 254, 0.90), rgba(37, 99, 235, 0.76), rgba(30, 64, 175, 0.34));
                animation: experience-ai-shimmer 4.4s linear infinite;
                -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
                -webkit-mask-composite: xor;
                mask-composite: exclude;
                box-shadow: 0 0 12px rgba(37, 99, 235, 0.18);
            }
            .experience-delete-hover,
            .experience-delete-hover input,
            .experience-delete-hover textarea,
            .experience-delete-hover span {
                color: #dc2626 !important;
                text-decoration: line-through;
                text-decoration-color: #dc2626;
            }
            .experience-delete-hover input::placeholder,
            .experience-delete-hover textarea::placeholder {
                color: rgba(220, 38, 38, 0.62) !important;
            }
            .experience-clear-hover,
            .experience-clear-hover input,
            .experience-clear-hover textarea,
            .experience-clear-hover span {
                color: #64748b !important;
                text-decoration: line-through;
                text-decoration-color: #64748b;
            }
            .experience-clear-hover input::placeholder,
            .experience-clear-hover textarea::placeholder {
                color: rgba(100, 116, 139, 0.70) !important;
            }
            .overlay-meta-field[data-open="true"] .overlay-item-input::placeholder {
                color: rgba(100, 116, 139, 0.50) !important;
            }
            @keyframes text-shimmer {
                0% {
                    background-position: 200% 0;
                }
                100% {
                    background-position: -200% 0;
                }
            }
            .text-shimmer-light {
                background: linear-gradient(
                    90deg,
                    #64748b 0%,
                    #64748b 35%,
                    #0284c7 50%,
                    #64748b 65%,
                    #64748b 100%
                );
                background-size: 200% auto;
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                animation: text-shimmer 3.5s linear infinite;
            }
            .text-shimmer-dark {
                background: linear-gradient(
                    90deg,
                    #94a3b8 0%,
                    #94a3b8 35%,
                    #38bdf8 50%,
                    #94a3b8 65%,
                    #94a3b8 100%
                );
                background-size: 200% auto;
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                animation: text-shimmer 3.5s linear infinite;
            }
        `}} />
    </>
);
