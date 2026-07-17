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
