// Rate metrics (engagement rate, bounce rate, ...) can't just be averaged
// plainly across several rows — weight by sessions so a 100%-engagement day
// with 1 session doesn't count the same as a 50% day with 1,000.
export function weightedAverage<T>(rows: T[], sessions: (r: T) => number, pick: (r: T) => number | null): number | null {
  let weightedSum = 0;
  let weight = 0;
  for (const row of rows) {
    const value = pick(row);
    const s = sessions(row);
    if (value === null || s === 0) continue;
    weightedSum += value * s;
    weight += s;
  }
  return weight === 0 ? null : weightedSum / weight;
}

// Fills any gap date within the observed range with 0 — without this, a
// sparse series (e.g. sessions on day 1 and day 5 but nothing between, or
// simply a day GA4 had zero traffic so no row exists at all) gets drawn as
// if those days were adjacent, distorting the actual shape of the trend.
export function fillDateGaps(byDate: Map<string, number>): { date: string; value: number }[] {
  if (byDate.size === 0) return [];
  const dates = [...byDate.keys()].sort();
  const start = new Date(`${dates[0]}T00:00:00`);
  const end = new Date(`${dates[dates.length - 1]}T00:00:00`);
  const result: { date: string; value: number }[] = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const iso = d.toISOString().slice(0, 10);
    result.push({ date: iso, value: byDate.get(iso) ?? 0 });
  }
  return result;
}
