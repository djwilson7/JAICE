// import { localfiles } from "@/directory/path/to/localimport";

import { getIdToken, getGoogleAccessToken, hasGmailAccess, logOut } from "./auth";
import { API_BASE_URL } from "./apiBaseUrl";

async function handleUnauthorizedResponse() {
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
    let token;

    // for gmail endpoints use google access tokens if available
    if (path.startsWith('/gmail/'))
    {
        if (!hasGmailAccess())
        {
            throw new Error("User does not have Gmail access.");
        }
        token = getGoogleAccessToken(); // get google OAuth token
        console.log("Using Google access token for Gmail API request.");
    } else {
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
    const token = await getIdToken();
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
