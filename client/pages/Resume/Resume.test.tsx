import { fireEvent, render, screen, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Resume } from "./Resume";
import { ResumePrintDocument } from "./components/ResumePrintDocument";
import { ResumeDocumentSurface } from "./components/ResumeDocumentSurface";
import { CloneResumeModal } from "./components/CloneResumeModal";
import { DeleteResumeModal } from "./components/DeleteResumeModal";
import { ResumeHeader } from "./components/ResumeHeader";
import { ResumeSwitcherRail } from "./components/ResumeSwitcherRail";
import { ResumeChatRail } from "./components/ResumeChatRail";
import { ResumeWorkspace } from "./components/ResumeWorkspace";

console.log("Imports:", {
    ResumePrintDocument, ResumeDocumentSurface,
    CloneResumeModal, DeleteResumeModal, ResumeHeader,
    ResumeSwitcherRail, ResumeChatRail, ResumeWorkspace
});

vi.mock("./components/ResumePrintDocument", () => ({ ResumePrintDocument: () => <div data-testid="ResumePrintDocument" /> }));
vi.mock("./components/ResumeDocumentSurface", () => ({ ResumeDocumentSurface: () => <div data-testid="ResumeDocumentSurface" /> }));
vi.mock("./components/CloneResumeModal", () => ({ CloneResumeModal: () => <div data-testid="CloneResumeModal" /> }));
vi.mock("./components/DeleteResumeModal", () => ({ DeleteResumeModal: () => <div data-testid="DeleteResumeModal" /> }));
vi.mock("./components/ResumeHeader", () => ({
    ResumeHeader: ({
        isLeftRailCollapsed,
        onToggleLeftRail,
        isRightRailCollapsed,
        onToggleRightRail,
        togglePdfPreview
    }: any) => (
        <div data-testid="ResumeHeader">
            <button type="button" onClick={onToggleLeftRail}>
                {isLeftRailCollapsed ? "Open left rail" : "Close left rail"}
            </button>
            <button type="button" onClick={onToggleRightRail}>
                {isRightRailCollapsed ? "Open right rail" : "Close right rail"}
            </button>
            <button type="button" onClick={togglePdfPreview}>Preview PDF</button>
        </div>
    )
}));
vi.mock("./components/ResumeSwitcherRail", () => ({
    ResumeSwitcherRail: ({ isLeftRailCollapsed }: any) => (
        <div data-testid="ResumeSwitcherRail" data-collapsed={String(isLeftRailCollapsed)} />
    )
}));
vi.mock("./components/ResumeChatRail", () => ({
    ResumeChatRail: ({ isRightRailCollapsed }: any) => (
        <div data-testid="ResumeChatRail" data-collapsed={String(isRightRailCollapsed)} />
    )
}));
vi.mock("./components/ResumeWorkspace", () => ({ ResumeWorkspace: () => <div data-testid="ResumeWorkspace" /> }));

const mockOpenPdfPreview = vi.fn();
const mockTogglePdfPreview = vi.fn();
const mockSetFontPreviewTarget = vi.fn();
const mockSetIsMarginPreviewVisible = vi.fn();
const mockSetIsPageFormatPreviewVisible = vi.fn();
const mockSetGapPreviewTarget = vi.fn();
const mockClosePageStyleShelf = vi.fn();

let mockCapturedPersistenceProps: any = null;
let mockCapturedPdfPreviewProps: any = null;
let mockCapturedChatProps: any = null;

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
        closePageStyleShelf: mockClosePageStyleShelf,
        paperMetrics: {},
        setFontPreviewTarget: mockSetFontPreviewTarget,
        setIsMarginPreviewVisible: mockSetIsMarginPreviewVisible,
        setIsPageFormatPreviewVisible: mockSetIsPageFormatPreviewVisible,
        setGapPreviewTarget: mockSetGapPreviewTarget,
    })
}));
vi.mock("./hooks/useResumePersistence", () => ({
    useResumePersistence: (props: any) => {
        mockCapturedPersistenceProps = props;
        return {
            handleSaveResume: vi.fn(),
        };
    }
}));
vi.mock("./hooks/useResumeChat", () => ({
    useResumeChat: (props: any) => {
        mockCapturedChatProps = props;
        return {
            chatMessages: [],
        };
    }
}));
vi.mock("./hooks/useResumeRewriteSuggestions", () => ({
    useResumeRewriteSuggestions: () => ({})
}));
vi.mock("./hooks/useResumePdfPreview", () => ({
    useResumePdfPreview: (props: any) => {
        mockCapturedPdfPreviewProps = props;
        return {
            isPdfPreviewOpen: false,
            isGeneratingPdfPreview: false,
            pdfPreviewUrl: null,
            openPdfPreview: mockOpenPdfPreview,
            togglePdfPreview: mockTogglePdfPreview,
            closePdfPreview: vi.fn()
        };
    }
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
    beforeEach(() => {
        mockOpenPdfPreview.mockClear();
        mockTogglePdfPreview.mockClear();
    });

    it("renders without crashing", () => {
        const { getByTestId } = render(<Resume />);
        expect(getByTestId("ResumeWorkspace")).toBeInTheDocument();
    });

    it("collapses rails before opening PDF preview from the header toggle", () => {
        render(<Resume />);

        expect(screen.getByTestId("ResumeSwitcherRail")).toHaveAttribute("data-collapsed", "true");
        expect(screen.getByTestId("ResumeChatRail")).toHaveAttribute("data-collapsed", "true");

        fireEvent.click(screen.getByRole("button", { name: "Preview PDF" }));

        expect(screen.getByTestId("ResumeSwitcherRail")).toHaveAttribute("data-collapsed", "true");
        expect(screen.getByTestId("ResumeChatRail")).toHaveAttribute("data-collapsed", "true");
        expect(mockOpenPdfPreview).toHaveBeenCalledTimes(1);
        expect(mockTogglePdfPreview).not.toHaveBeenCalled();
    });

    it("keeps the left and right rails mutually exclusive", () => {
        render(<Resume />);

        expect(screen.getByTestId("ResumeSwitcherRail")).toHaveAttribute("data-collapsed", "true");
        expect(screen.getByTestId("ResumeChatRail")).toHaveAttribute("data-collapsed", "true");

        fireEvent.click(screen.getByRole("button", { name: "Open right rail" }));

        expect(screen.getByTestId("ResumeSwitcherRail")).toHaveAttribute("data-collapsed", "true");
        expect(screen.getByTestId("ResumeChatRail")).toHaveAttribute("data-collapsed", "false");

        fireEvent.click(screen.getByRole("button", { name: "Open left rail" }));

        expect(screen.getByTestId("ResumeSwitcherRail")).toHaveAttribute("data-collapsed", "false");
        expect(screen.getByTestId("ResumeChatRail")).toHaveAttribute("data-collapsed", "true");
    });

    it("triggers callbacks from hooks for state transitions and clearing previews", () => {
        render(<Resume />);

        // 1. Trigger openChatRail callback (corresponds to handleOpenRightRail)
        expect(mockCapturedChatProps).not.toBeNull();
        fireEvent.click(screen.getByRole("button", { name: "Open left rail" })); // Reset
        act(() => {
            mockCapturedChatProps.openChatRail();
        });
        expect(screen.getByTestId("ResumeSwitcherRail")).toHaveAttribute("data-collapsed", "true");
        expect(screen.getByTestId("ResumeChatRail")).toHaveAttribute("data-collapsed", "false");

        // 2. Trigger resetFormatTransientState callback
        expect(mockCapturedPersistenceProps).not.toBeNull();
        mockSetFontPreviewTarget.mockClear();
        mockSetIsMarginPreviewVisible.mockClear();
        mockSetIsPageFormatPreviewVisible.mockClear();
        mockSetGapPreviewTarget.mockClear();
        mockClosePageStyleShelf.mockClear();

        act(() => {
            mockCapturedPersistenceProps.resetFormatTransientState();
        });
        expect(mockSetFontPreviewTarget).toHaveBeenCalledWith(null);
        expect(mockSetIsMarginPreviewVisible).toHaveBeenCalledWith(false);
        expect(mockSetIsPageFormatPreviewVisible).toHaveBeenCalledWith(false);
        expect(mockSetGapPreviewTarget).toHaveBeenCalledWith(null);
        expect(mockClosePageStyleShelf).toHaveBeenCalled();

        // 3. Trigger clearFormatPreviews callback
        expect(mockCapturedPdfPreviewProps).not.toBeNull();
        mockSetFontPreviewTarget.mockClear();
        mockSetIsMarginPreviewVisible.mockClear();
        mockSetIsPageFormatPreviewVisible.mockClear();
        mockSetGapPreviewTarget.mockClear();

        act(() => {
            mockCapturedPdfPreviewProps.clearFormatPreviews();
        });
        expect(mockSetFontPreviewTarget).toHaveBeenCalledWith(null);
        expect(mockSetIsMarginPreviewVisible).toHaveBeenCalledWith(false);
        expect(mockSetIsPageFormatPreviewVisible).toHaveBeenCalledWith(false);
        expect(mockSetGapPreviewTarget).toHaveBeenCalledWith(null);
    });
});
