import { Router, type IRouter } from "express";
import { getSheetValues } from "../lib/googleSheets.js";

/* ────────────────────────────────────────────────────────────────
   Call Center Tracker — reads the lead-source spreadsheet via the
   Replit Google Sheets connector and aggregates lead-source
   performance: volume, booked vs not-booked, and conversion rate,
   broken down over the last 30 / 60 / 90 days, plus a weekly
   call-volume trend.

   Sheet columns (row 1 = header):
     Call Date, Caller Name, Phone Number, Answered By,
     Booked Service?, Service Type, Lead Source, Notes,
     Customer Address
──────────────────────────────────────────────────────────────── */

const SHEET_ID = "1hH4kputlfSfzQWj43lfWWYxj9Wmv6BckI-_UJ8-ndlY";
const RANGE = "A:I";

/* ── tiny cache (5 min) ───────────────────────────────────────── */
interface CacheEntry<T> { data: T; expiresAt: number }
let cached: CacheEntry<LeadsPayload> | null = null;
const TTL_MS = 5 * 60 * 1000;

/* ── helpers ──────────────────────────────────────────────────── */
function isBooked(raw: string | undefined): boolean {
  if (!raw) return false;
  const v = raw.trim().toLowerCase();
  return v === "yes" || v === "y" || v === "true" || v === "1" || v === "booked";
}

function normSource(raw: string | undefined): string {
  const v = (raw ?? "").trim();
  return v ? v : "Unknown";
}

// Accepts common spreadsheet date formats (M/D/YYYY, YYYY-MM-DD, etc.)
function parseDate(raw: string | undefined): Date | null {
  if (!raw) return null;
  const t = Date.parse(raw.trim());
  if (!Number.isNaN(t)) return new Date(t);
  return null;
}

/* ── types ────────────────────────────────────────────────────── */
interface CallRow {
  date: Date | null;
  source: string;
  booked: boolean;
}
interface SourceStat {
  label: string;
  calls: number;
  booked: number;
  conversionRate: number; // 0–100, rounded
}
interface WindowBreakdown {
  days: number;
  totalCalls: number;
  totalBooked: number;
  conversionRate: number;
  sources: SourceStat[];
}
interface WeeklyPoint {
  weekStart: string; // ISO date (Monday)
  label: string;     // e.g. "May 19"
  calls: number;
  booked: number;
}
interface LeadsPayload {
  totalCalls: number;
  windows: WindowBreakdown[];      // 30 / 60 / 90
  weekly: WeeklyPoint[];           // last ~12 weeks
  topSources: string[];            // labels of top converting sources (90d, min volume)
  syncedAt: string;
}

/* ── aggregation ──────────────────────────────────────────────── */
function aggregateWindow(rows: CallRow[], days: number, now: Date): WindowBreakdown {
  const cutoff = now.getTime() - days * 24 * 60 * 60 * 1000;
  const inWindow = rows.filter((r) => r.date && r.date.getTime() >= cutoff);

  const map = new Map<string, { calls: number; booked: number }>();
  for (const r of inWindow) {
    const e = map.get(r.source) ?? { calls: 0, booked: 0 };
    e.calls++;
    if (r.booked) e.booked++;
    map.set(r.source, e);
  }

  const sources: SourceStat[] = [...map.entries()]
    .map(([label, s]) => ({
      label,
      calls: s.calls,
      booked: s.booked,
      conversionRate: s.calls ? Math.round((s.booked / s.calls) * 100) : 0,
    }))
    .sort((a, b) => b.calls - a.calls);

  const totalCalls = inWindow.length;
  const totalBooked = inWindow.filter((r) => r.booked).length;

  return {
    days,
    totalCalls,
    totalBooked,
    conversionRate: totalCalls ? Math.round((totalBooked / totalCalls) * 100) : 0,
    sources,
  };
}

function mondayOf(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = (x.getDay() + 6) % 7; // 0 = Monday
  x.setDate(x.getDate() - day);
  return x;
}

function buildWeekly(rows: CallRow[], weeks: number, now: Date): WeeklyPoint[] {
  const thisMonday = mondayOf(now);
  const points: WeeklyPoint[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const start = new Date(thisMonday);
    start.setDate(start.getDate() - i * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);

    let calls = 0;
    let booked = 0;
    for (const r of rows) {
      if (!r.date) continue;
      const t = r.date.getTime();
      if (t >= start.getTime() && t < end.getTime()) {
        calls++;
        if (r.booked) booked++;
      }
    }
    points.push({
      weekStart: start.toISOString().slice(0, 10),
      label: start.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      calls,
      booked,
    });
  }
  return points;
}

/* ── router ───────────────────────────────────────────────────── */
const router: IRouter = Router();

router.get("/calltracker/leads", async (req, res) => {
  try {
    if (cached && Date.now() < cached.expiresAt) {
      res.json(cached.data);
      return;
    }

    const values = await getSheetValues(SHEET_ID, RANGE);
    if (values.length < 2) {
      res.json({
        totalCalls: 0,
        windows: [30, 60, 90].map((d) => ({ days: d, totalCalls: 0, totalBooked: 0, conversionRate: 0, sources: [] })),
        weekly: [],
        topSources: [],
        syncedAt: new Date().toISOString(),
      } satisfies LeadsPayload);
      return;
    }

    // Map header → column index so column order changes don't break us.
    const header = values[0].map((h) => h.trim().toLowerCase());
    const idxDate = header.findIndex((h) => h.includes("call date") || h === "date");
    const idxBooked = header.findIndex((h) => h.includes("booked"));
    const idxSource = header.findIndex((h) => h.includes("lead source") || h === "source");

    const rows: CallRow[] = values.slice(1)
      .filter((r) => r.length > 0)
      .map((r) => ({
        date: parseDate(idxDate >= 0 ? r[idxDate] : undefined),
        source: normSource(idxSource >= 0 ? r[idxSource] : undefined),
        booked: isBooked(idxBooked >= 0 ? r[idxBooked] : undefined),
      }));

    const now = new Date();
    const windows = [30, 60, 90].map((d) => aggregateWindow(rows, d, now));
    const weekly = buildWeekly(rows, 12, now);

    // Top converting sources: from the 90-day window, sources with >=5 calls,
    // sorted by conversion rate desc, take top 3.
    const w90 = windows[2];
    const topSources = w90.sources
      .filter((s) => s.calls >= 5 && s.label !== "Unknown")
      .sort((a, b) => b.conversionRate - a.conversionRate)
      .slice(0, 3)
      .map((s) => s.label);

    const payload: LeadsPayload = {
      totalCalls: rows.length,
      windows,
      weekly,
      topSources,
      syncedAt: new Date().toISOString(),
    };

    cached = { data: payload, expiresAt: Date.now() + TTL_MS };
    res.json(payload);
  } catch (err) {
    req.log.error({ err }, "calltracker /leads failed");
    res.status(502).json({ error: String(err instanceof Error ? err.message : err) });
  }
});

export default router;
