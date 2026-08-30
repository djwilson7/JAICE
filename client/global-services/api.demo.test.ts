import { beforeEach, describe, expect, it, vi } from "vitest";

const authModuleLoaded = vi.hoisted(() => vi.fn());

vi.mock("./projectMode", () => ({
  IS_DEMO_MODE: true,
}));

vi.mock("./apiBaseUrl", () => ({
  API_BASE_URL: "http://test.api",
}));

vi.mock("./auth", () => {
  authModuleLoaded();
  return {
    getIdToken: vi.fn(),
    getGoogleAccessToken: vi.fn(),
    hasGmailAccess: vi.fn(),
    logOut: vi.fn(),
  };
});

import { api, apiBlob } from "./api";

describe("api in demo mode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("makes JSON requests without loading Firebase authentication", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: "success" }),
    } as Response);

    const response = await api("/api/jobs/latest-jobs");

    expect(response).toEqual({
      status: "success",
      jobs: [],
      demo: true,
    });
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(authModuleLoaded).not.toHaveBeenCalled();
  });

  it("absorbs mutations without reaching the backend", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    await expect(
      api("/api/jobs/write-jobs-to-db", {
        method: "POST",
        body: JSON.stringify({ jobs_to_update: [{ id: "demo-job" }] }),
      })
    ).resolves.toEqual({ status: "success", demo: true });

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(authModuleLoaded).not.toHaveBeenCalled();
  });

  it("makes blob requests without loading Firebase authentication", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(new Blob()),
      headers: new Headers(),
    } as Response);

    await apiBlob("/api/files/example");

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(authModuleLoaded).not.toHaveBeenCalled();
  });
});
