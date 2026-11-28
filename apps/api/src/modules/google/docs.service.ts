import { withGoogle } from './google.client.js';

/** One `batchUpdate` of `replaceAllText` for each `{{key}}` in the map. Unknown placeholders stay untouched. */
export async function replacePlaceholders(fileId: string, map: Record<string, string>): Promise<void> {
  const requests = Object.entries(map).map(([key, value]) => ({
    replaceAllText: { containsText: { text: `{{${key}}}`, matchCase: true }, replaceText: value }
  }));
  if (requests.length === 0) return;
  await withGoogle(async ({ docs }) => {
    await docs.documents.batchUpdate({ documentId: fileId, requestBody: { requests } });
  });
}
