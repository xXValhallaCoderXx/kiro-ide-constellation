export function isNodeVersionSupported(minMajor: number): { ok: boolean; found: string } {
  const found = process.versions.node;
  const major = Number(found.split(".")[0]);
  return { ok: Number.isFinite(major) && major >= minMajor, found };
}
