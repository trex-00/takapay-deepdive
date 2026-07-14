/**
 * Asserts the cleaning pipeline against the numbers established by hand-auditing
 * the source file. If the code and the audit disagree, the code is wrong.
 *
 *   npx tsx scripts/verify-cleaning.ts
 */
import raw from "../data/takapay_sample_data.json";
import { cleanDataset, sentimentFromScore } from "../lib/clean";
import { competitorInsight, issueTriage, sentimentCounts, topicBreakdown } from "../lib/metrics";
import type { RawRecord } from "../lib/types";

const { posts, report } = cleanDataset(raw as RawRecord[]);
const analysed = posts.filter((p) => p.included);

let failures = 0;
function expect(label: string, actual: unknown, want: unknown) {
  const ok = actual === want;
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label.padEnd(42)} ${String(actual).padStart(5)}  (expected ${want})`);
}

console.log("\nCleaning report vs. hand audit\n" + "-".repeat(70));
expect("total records", report.totalRaw, 660);
expect("brand_mention contradictions", report.brandMentionContradictions, 70);
expect("duplicate texts dropped", report.duplicatesDropped, 10);
expect("off-topic excluded", report.offTopicExcluded, 61);
expect("sentiment labels overridden by score", report.sentimentOverrides, 23);
expect("sentiments outvoted by their template", report.templateFlips, 39);
// 5 rows sit in template groups of 4-6 copies: too thin, or too close, to outvote.
// They look flipped too, but the rule refuses to guess and reports them instead.
expect("template conflicts left unresolved", report.templateConflictsUnresolved, 5);
expect("posts analysed", report.analysed, 589);
expect("competitor posts", report.competitorPosts, 81);
expect("competitor blanket-labelled negative", report.competitorAllNegative, true);

// Every overridden record should be an off-topic one: the label corruption in this
// file is entirely contained in the noise rows, which is what justifies dropping them.
const overrides = posts.filter((p) => p.sentimentOverridden);
expect("overrides that are off-topic", overrides.filter((p) => p.isOffTopic).length, 23);

// The four rows that started this: an identical send_money template, 39 copies
// positive at 72-93 and 4 copies negative at 19-20. Both fields lie together, so
// only their twins can convict them. They were the top 3 "loudest complaints" on
// send money until rule 5 landed.
const instantSend = posts.filter((p) => p.text.includes("সাথে সাথে চলে গেল"));
expect("'money arrived instantly' copies", instantSend.length, 49);
expect("  ...still counted as complaints", instantSend.filter((p) => p.sentiment === "negative").length, 0);

// The rule must never touch a template that agrees with itself.
const unanimous = posts.filter((p) => !p.templateFlipped);
expect("posts left alone by the vote", unanimous.length, 660 - 39);

// The score bands sit in empty gaps, so no in-band record can be reclassified.
const inGap = (raw as RawRecord[]).filter(
  (r) => (r.sentiment_score > 30 && r.sentiment_score < 45) || (r.sentiment_score > 60 && r.sentiment_score < 70),
);
expect("records inside the score gaps", inGap.length, 0);

console.log("\nHeadline the cleaning changes\n" + "-".repeat(70));
const asLabelled = sentimentCounts(posts, true);
const cleaned = sentimentCounts(analysed);
const pct = (n: number, d: number) => `${Math.round((100 * n) / d)}%`;
console.log(`  raw, as shipped : ${asLabelled.total} posts, ${pct(asLabelled.negative, asLabelled.total)} negative`);
console.log(`  cleaned         : ${cleaned.total} posts, ${pct(cleaned.negative, cleaned.total)} negative`);

console.log("\nIssue triage: post count vs negative reach\n" + "-".repeat(70));
const byCount = topicBreakdown(analysed).filter((r) => r.topic !== "competitor");
const byReach = issueTriage(analysed);
console.log("  by post count  :", byCount.slice(0, 5).map((r) => r.topic).join(", "));
console.log("  by neg. reach  :", byReach.slice(0, 5).map((r) => r.topic).join(", "));
if (byCount[1]?.topic === byReach[1]?.topic && byCount[2]?.topic === byReach[2]?.topic) {
  console.log("  NOTE: the two rankings agree — the product call would be weak here.");
}

const comp = competitorInsight(posts, analysed);
console.log("\nCompetitor\n" + "-".repeat(70));
console.log(`  NgoodPay share of voice : ${Math.round(comp.shareOfVoice * 100)}% (${comp.competitorPosts} posts)`);
console.log(`  explicit switching intent: ${comp.switchingIntent.length} posts`);
console.log(`  battlegrounds            : ${comp.battlegrounds.map((b) => `${b.theme} (${b.posts})`).join(", ")}`);

// sanity: bands
expect("\nsentimentFromScore(30)", sentimentFromScore(30), "negative");
expect("sentimentFromScore(50)", sentimentFromScore(50), "neutral");
expect("sentimentFromScore(70)", sentimentFromScore(70), "positive");

console.log("\n" + (failures === 0 ? "All assertions passed." : `${failures} ASSERTION(S) FAILED.`));
process.exit(failures === 0 ? 0 : 1);
