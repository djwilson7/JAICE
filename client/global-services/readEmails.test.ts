import { describe, it, expect, vi } from 'vitest';
import { getLastEmails, getEmailSubject, formatEmailDate, convertEmailsToJobCards } from './readEmails';
import { api } from './api';

vi.mock('./api', () => ({
  api: vi.fn()
}));

describe('readEmails', () => {
  const mockMessage = {
    id: '1',
    threadId: 't1',
    labelIds: [],
    snippet: '',
    payload: {
      headers: [{ name: 'Subject', value: 'Test Subject' }]
    },
    internalDate: '1625097600000'
  };

  it('should fetch last emails', async () => {
    vi.mocked(api)
      .mockResolvedValueOnce({ messages: [{ id: '1', threadId: 't1' }], resultSizeEstimate: 1 })
      .mockResolvedValueOnce(mockMessage);

    const emails = await getLastEmails(1);
    expect(emails).toHaveLength(1);
    expect(emails[0].id).toBe('1');
  });

  it('should handle error when fetching emails', async () => {
    vi.mocked(api).mockRejectedValueOnce(new Error('Network Error'));
    const emails = await getLastEmails(1);
    expect(emails).toHaveLength(0);
  });

  it('should get email subject', () => {
    expect(getEmailSubject(mockMessage as any)).toBe('Test Subject');
  });

  it('should format date', () => {
    expect(formatEmailDate('1625097600000')).toBeDefined();
  });

  it('should convert emails to job cards', () => {
    const cards = convertEmailsToJobCards([mockMessage as any]);
    expect(cards[0].title).toBe('Test Subject');
    expect(cards[0].column).toBe('applied');
  });
});
