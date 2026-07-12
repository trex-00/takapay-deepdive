import raw from "@/data/takapay_sample_data.json";
import { Dashboard } from "@/components/Dashboard";
import { cleanDataset } from "@/lib/clean";
import type { RawRecord } from "@/lib/types";

/**
 * The feed is cleaned once, here, at build time. The page ships as static HTML, so
 * there is no server to fall over and nothing to re-compute per request.
 */
export default function Page() {
  const { posts, report } = cleanDataset(raw as RawRecord[]);
  return <Dashboard posts={posts} report={report} />;
}
