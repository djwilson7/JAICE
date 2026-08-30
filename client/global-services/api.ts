// import { localfiles } from "@/directory/path/to/localimport";

import { API_BASE_URL } from "./apiBaseUrl";
import { IS_DEMO_MODE } from "./projectMode";

function getDemoResponse(path: string) {
    if (
        path === "/api/jobs/latest-jobs" ||
        path === "/api/jobs/archive" ||
        path === "/api/jobs/trash"
    ) {
        return { status: "success", jobs: [], demo: true };
    }

    if (path === "/api/resume/resumes") {
        return { status: "success", resumes: [], demo: true };
    }

    if (path === "/api/auth/gmail-consent-status") {
        return { status: "success", isConnected: false, demo: true };
    }

    if (path === "/api/auth/setup-frontend-rls-session") {
        return { status: "success", rls_jwt: null, demo: true };
    }

    if (path === "/api/dashboard/grit-score") {
        return {
            status: "success",
            demo: true,
            data: {
                score: 0,
                weekly_apps: 0,
                followups: 0,
                consistency: 0,
            },
        };
    }

    return { status: "success", demo: true };
}

async function handleUnauthorizedResponse() {
    if (IS_DEMO_MODE) return;

    const { logOut } = await import("./auth");

    try {
        await logOut();
    } catch (error) {
        console.error("Failed to clear the unauthorized Firebase session:", error);
    } finally {
        if (window.location.pathname !== "/") {
            window.location.replace("/");
        }
    }
}

export async function api(path: string, init: RequestInit = {}) 
{
    if (IS_DEMO_MODE) {
        return getDemoResponse(path);
    }

    let token;

    if (!IS_DEMO_MODE && path.startsWith('/gmail/'))
    {
        const { getGoogleAccessToken, hasGmailAccess } = await import("./auth");

        if (!hasGmailAccess())
        {
            throw new Error("User does not have Gmail access.");
        }
        token = getGoogleAccessToken(); // get google OAuth token
        console.log("Using Google access token for Gmail API request.");
    } else if (!IS_DEMO_MODE) {
        const { getIdToken } = await import("./auth");
        token = await getIdToken(); // get Firebase ID token
        console.log("Using Firebase ID token for API request.");
    }   
    
    const headers = new Headers(init.headers || {});
    if (token) headers.set("Authorization", `Bearer ${token}`);
    headers.set("Content-Type", headers.get("Content-Type") || "application/json");

    const response = await fetch(`${API_BASE_URL}${path}`,
    {
        ...init,
        headers,
    });

    if (!response.ok) {
        if (response.status === 401) {
            await handleUnauthorizedResponse();
        }

        let detail = `${response.status} ${response.statusText}`;
        try {
            const errorBody = await response.json();
            detail = errorBody?.detail || detail;
        } catch {
            // Keep the status text when the server does not return JSON.
        }
        const error = new Error(`API request failed: ${detail}`);
        Object.assign(error, { status: response.status, detail });
        throw error;
    }
    return response.json();
}

export async function apiBlob(path: string, init: RequestInit = {}) {
    if (IS_DEMO_MODE) {
        return {
            blob: new Blob(),
            filename: null,
            previewUrl: null,
        };
    }

    const token = await (await import("./auth")).getIdToken();
    const headers = new Headers(init.headers || {});

    if (token) headers.set("Authorization", `Bearer ${token}`);
    if (init.body && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
        ...init,
        headers,
    });

    if (!response.ok) {
        if (response.status === 401) {
            await handleUnauthorizedResponse();
        }

        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const previewPath = response.headers.get("X-PDF-Preview-Path");
    return {
        blob: await response.blob(),
        filename: response.headers.get("Content-Disposition")?.match(/filename="?([^"]+)"?/)?.[1] || null,
        previewUrl: previewPath ? `${API_BASE_URL}${previewPath}` : null,
    };
}
