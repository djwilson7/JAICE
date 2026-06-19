import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PageContent } from "./PageContent";
import { HomePageContentProviders } from "./HomePageContentProviders";

describe("PageContent component", () => {
    it("renders children correctly", () => {
        render(<PageContent><div>Test Page Content</div></PageContent>);
        expect(screen.getByText("Test Page Content")).toBeInTheDocument();
    });
});

describe("HomePageContentProviders component", () => {
    it("renders children wrapped inside providers correctly", () => {
        render(
            <HomePageContentProviders>
                <div>Test Providers Content</div>
            </HomePageContentProviders>
        );
        expect(screen.getByText("Test Providers Content")).toBeInTheDocument();
    });
});
