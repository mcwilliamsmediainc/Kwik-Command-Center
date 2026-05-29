// Google Sheets access via the Replit Google Sheets connector.
// Integration: connection:conn_google-sheet (added via integrations skill).
// The SDK handles identity, token refresh, and auth headers automatically.
// Never cache the client — tokens expire.
import { ReplitConnectors } from "@replit/connectors-sdk";

export async function getSheetValues(
  spreadsheetId: string,
  range: string,
): Promise<string[][]> {
  const connectors = new ReplitConnectors();
  const res = await connectors.proxy(
    "google-sheet",
    `/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}`,
    { method: "GET" },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google Sheets ${res.status}: ${text.slice(0, 300)}`);
  }

  const data = (await res.json()) as { values?: string[][] };
  return data.values ?? [];
}
