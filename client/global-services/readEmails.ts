// import { localfiles } from "@/directory/path/to/localimport";

import { api } from "./api";

export interface GmailMessage 
{
    id: string;
    threadId: string;
    labelIds: string[];
    snippet: string;
    payload: {
        headers: Array<{name: string; value: string;}>;
        body?: {data?: string };
        parts?: Array<{
            mimeType: string;
            body: {data?: string};
        }>;
    };
    internalDate: string;
}

export interface GmailListResponse
{
    messages: Array<{id: string; threadId: string;}>;
    nextPageToken?: string;
    resultSizeEstimate: number;
}


// get last 10 emails
export async function getLastEmails(maxResults: number = 10): Promise<GmailMessage[]>
{
    try 
    {
        console.log("Fetching last emails from Gmail...");

        // first get the list of message ids
        const listResponse: GmailListResponse = await api(`/gmail/messages?maxResults=${maxResults}`);

        console.log('list response:', listResponse);

        // then fetch full details for each message
        const messagePromises = listResponse.messages.map((msg) =>
            api(`/gmail/messages/${msg.id}`)
        );

        const messages: GmailMessage[] = await Promise.all(messagePromises);
        console.log('successfully fetched messages:', messages);
        return messages;

    } 
    catch (error) 
    {
        console.error('Error fetching emails:', error);
        return []; // return empty array on error
    }
}

// helper function to extract subject from the email headers
export function getEmailSubject(message: GmailMessage): string
{
    const subjectHeader = message.payload.headers.find(
        header => header.name.toLowerCase() === 'subject'
    );
    return subjectHeader?.value || '(No Subject)';
}

// helper function to format email date
export function formatEmailDate(internalDate: string): string
{
    const date = new Date(parseInt(internalDate));
    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}

// convert messages to jobcard format
export function convertEmailsToJobCards(messages: GmailMessage[]): Array<{
    id: string;
    title: string;
    column: string;
    date: string;
}> {
    const jobCards = messages.map(message => ({
        id: message.id,
        title: getEmailSubject(message),
        column: 'applied', // default column
        date: formatEmailDate(message.internalDate),
    }));
    console.log('Converted job cards:', jobCards);
    return jobCards;
}