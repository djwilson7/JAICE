import { render } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Resume } from "./Resume";
import { ResumeGlobalStyles } from "./components/ResumeGlobalStyles";
import { ResumePrintDocument } from "./components/ResumePrintDocument";
import { ResumeDocumentSurface } from "./components/ResumeDocumentSurface";
import { CloneResumeModal } from "./components/CloneResumeModal";
import { DeleteResumeModal } from "./components/DeleteResumeModal";
import { ResumeHeader } from "./components/ResumeHeader";
import { ResumeSwitcherRail } from "./components/ResumeSwitcherRail";
import { ResumeChatRail } from "./components/ResumeChatRail";
import { ResumeWorkspace } from "./components/ResumeWorkspace";

console.log("Imports:", {
    ResumeGlobalStyles, ResumePrintDocument, ResumeDocumentSurface,
    CloneResumeModal, DeleteResumeModal, ResumeHeader,
    ResumeSwitcherRail, ResumeChatRail, ResumeWorkspace
});

vi.mock("./components/ResumeGlobalStyles", () => ({ ResumeGlobalStyles: () => <div data-testid="ResumeGlobalStyles" /> }));
vi.mock("./components/ResumePrintDocument", () => ({ ResumePrintDocument: () => <div data-testid="ResumePrintDocument" /> }));
vi.mock("./components/ResumeDocumentSurface", () => ({ ResumeDocumentSurface: () => <div data-testid="ResumeDocumentSurface" /> }));
vi.mock("./components/CloneResumeModal", () => ({ CloneResumeModal: () => <div data-testid="CloneResumeModal" /> }));
vi.mock("./components/DeleteResumeModal", () => ({ DeleteResumeModal: () => <div data-testid="DeleteResumeModal" /> }));
vi.mock("./components/ResumeHeader", () => ({ ResumeHeader: () => <div data-testid="ResumeHeader" /> }));
vi.mock("./components/ResumeSwitcherRail", () => ({ ResumeSwitcherRail: () => <div data-testid="ResumeSwitcherRail" /> }));
vi.mock("./components/ResumeChatRail", () => ({ ResumeChatRail: () => <div data-testid="ResumeChatRail" /> }));
vi.mock("./components/ResumeWorkspace", () => ({ ResumeWorkspace: () => <div data-testid="ResumeWorkspace" /> }));

vi.mock("./hooks/useResumeDocumentEditing", () => ({
    useResumeDocumentEditing: () => ({
        resumeData: { contact: {}, summary: "", experiences: [], education: [], skills: [] },
        setResumeData: vi.fn(),
        updateField: vi.fn(),
    })
}));
vi.mock("./hooks/useResumeFormatting", () => ({
    useResumeFormatting: () => ({
        zoomPercent: 100,
        handleFitZoom: vi.fn(),
        handleTogglePageStyleShelf: vi.fn(),
        closePageStyleShelf: vi.fn(),
        paperMetrics: {},
    })
}));
vi.mock("./hooks/useResumePersistence", () => ({
    useResumePersistence: () => ({
        handleSaveResume: vi.fn(),
    })
}));
vi.mock("./hooks/useResumeChat", () => ({
    useResumeChat: () => ({
        chatMessages: [],
    })
}));
vi.mock("./hooks/useResumeRewriteSuggestions", () => ({
    useResumeRewriteSuggestions: () => ({})
}));
vi.mock("./hooks/useResumePdfPreview", () => ({
    useResumePdfPreview: () => ({})
}));
vi.mock("./documentViewModel", () => ({
    useResumeDocumentViewModel: () => ({
        renderOverlayInput: () => null,
        renderRewriteActionButtons: () => null,
        getDynamicInputStyle: () => ({}),
        getSuggestionReviewClass: () => "",
    })
}));
vi.mock("./resumeDiagnostics", () => ({
    isResumeDebugEnabled: () => false
}));

vi.mock("@/pages/settings/provider/settingsContext", () => ({
    useSettings: () => ({ theme: "light" })
}));

describe("Resume Component", () => {
    it("renders without crashing", () => {
        const { getByTestId } = render(<Resume />);
        expect(getByTestId("ResumeWorkspace")).toBeInTheDocument();
    });
});

