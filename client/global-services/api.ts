// import { localfiles } from "@/directory/path/to/localimport";

import { getIdToken, getGoogleAccessToken, hasGmailAccess } from "./auth";


// If Local (using docker, use the local url) else use prod url
// const BASE_URL = import.meta.env.VITE_API_BASE_URL_PROD;
const BASE_URL = import.meta.env.VITE_API_BASE_URL_LOCAL;

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

    const response = await fetch(`${BASE_URL}${path}`, 
    {
        ...init,
        headers,
    });

    if (!response.ok) throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    return response.json();
}
