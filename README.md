# TakaPay — Social Listening Dashboard

**Live demo:** _(deploying — link goes here)_

A dashboard that turns 660 raw social posts about TakaPay into something a brand manager can act on
without reading a single row of the file.

```bash
npm install
npm run dev                          # http://localhost:3000
npx tsx scripts/verify-cleaning.ts   # asserts the cleaning against the hand audit
```

---

## What I built

A single static page (Next.js, no backend — the feed is cleaned once at build time) with:

- **The headline** — sentiment across the whole conversation, plus the four numbers I think actually
  matter: negative share, the single biggest problem, competitor share of voice, and how many people
  said out loud that they've left.
- **What to fix first** — issues ranked by *negative reach*, not post count. This is my main product
  call; the reasoning is below. Click any row to read the loudest posts behind it.
- **Losing ground to NgoodPay** — share of voice, stated switching intent, and what people say the
  competitor does better.
- **Topics, platforms, and volume over time**, with filters on platform, topic, sentiment and date.
- **A data quality panel** — everything the file got wrong and what I did about it, visible in the
  product rather than buried in this README.
- **A Raw / Cleaned toggle** in the header, so you can watch the numbers move when the cleaning is
  switched off.

## The insight I added, and why

### Rank issues by negative reach, not by volume

A brand manager doesn't need to be told "56% negative." They need to know **which one thing to
escalate on Monday morning.** So the main table scores each topic by the engagement — reactions plus
comments — carried by its *negative* posts, which folds volume, negativity and audience into one
number.

It matters because the two rankings genuinely disagree on this data:

| By post count | By negative reach |
|---|---|
| 1. Failed transactions | 1. Failed transactions |
| 2. **Cashback offers** | 2. **Charges & fees** |
| 3. Send money | 3. **App crashes** |
| 4. Mobile recharge | 4. Login & OTP |

Cashback offers is the second-biggest topic by volume — and it's almost entirely *cheerful*. Ranking
by volume would put a non-problem near the top of the to-do list. Meanwhile charges & fees and app
crashes are small topics where nearly nine in ten posts are furious and people pile in. Failed
transactions leads either way, but the reach view shows *how* dominant it is: **77% of all the
negative reach on the brand is one issue.** That's the sentence I'd want the brand manager to walk
away with.

### Switching intent, as the second insight

Sentiment is a mood; churn is revenue. So the competitor panel counts the posts where someone
explicitly says they left — and **all nine of them cite cash-out charges**, not the failed payments
that dominate the complaint volume. Those are two different problems: failures are what people are
*angry* about, pricing is what makes them *leave*. A brand manager should be told both, and told that
they're not the same thing.

## What I noticed about the data

The file is dirty in ways that would quietly corrupt a dashboard that just plotted it. All of this is
enforced in `lib/clean.ts` and asserted in `scripts/verify-cleaning.ts`.

| What's wrong | Size | What I did |
|---|---|---|
| **`brand_mention` is `true` on all 660 rows — and it's wrong.** 70 of those texts never say "TakaPay" (61 are off-topic, 9 only mention the competitor). | 70 rows | Ignored the field entirely; brand mention is read from the text. |
| **Off-topic posts carry sentiment labels.** Traffic in Farmgate, rain in Mirpur, biryani in Uttara, a semester final, Messi's form. They're 9% of the feed and were dragging brand sentiment toward a neutral middle. | 61 rows | Excluded from every brand number. Counted and disclosed, never silently dropped. |
| **23 sentiment labels contradict their own score** — labelled `positive` while scoring 46–60. | 23 rows | The score wins. |
| **Every single competitor post is labelled negative** — 81 of 81 — including neutral market intel like *"NgoodPay launched a 500 taka cashback, has anyone tried it?"* (scored 9/100). | 81 rows | Kept the volume, distrusted the sentiment, and **kept `competitor` out of the priority ranking** so a label I know is broken can't drive a negativity-weighted score. |
| **The feed is templated.** 660 records collapse to ~172 distinct text skeletons; one complaint template repeats 45 times. 10 texts are exact duplicates under a different id and author. | 10 rows | Duplicates counted once. It also means I don't claim any single post "went viral" — that's a template, not a movement. |

Two things about the sentiment fix are the part I'd defend hardest:

**The score bands aren't a threshold I picked — they're structural.** Plotting all 660 scores shows
three clusters with two completely empty gaps: nothing scores 31–44, and nothing scores 61–69. So
negative ≤30, neutral 45–60, positive ≥70 — and the cut points sit *inside the gaps*, meaning I could
move them anywhere in those gaps and not reclassify a single record.

**All 23 mislabelled rows are off-topic rows.** The label corruption in this file is entirely
contained in the noise. That's independent evidence the noise should go — and it's why the override
rule doesn't actually move the headline, since those rows were already excluded. The rules that *do*
move it are the off-topic exclusion and the dedupe: **51% negative as shipped → 56% once the noise is
out.** Flip the toggle and you can watch it happen.

I also checked what *isn't* broken, so I wasn't inventing problems: ids are unique, every timestamp
falls inside June 2026, and the language tags are right on 659 of 660 rows.

## What I'd do with another week

- **Re-derive sentiment from the text**, not the shipped label. Right now I can only catch labels that
  contradict their own score; I can't catch a post where the label and the score are *both* wrong — and
  given the competitor rows, I'm fairly sure some are. A classifier that handles Banglish would let me
  stop trusting the file at all.
- **Cluster the templates.** ~172 skeletons behind 660 posts means my counts measure *posting volume*,
  not distinct incidents. Grouping near-duplicates would tell a brand manager how many real people are
  affected, which is the number they'd actually be asked for.
- **Alerting instead of a dashboard.** Nobody opens a dashboard daily. The valuable version of this
  emails you when negative reach on a topic spikes past its baseline.
- Ship a CSV export and keyboard-accessible filters; both are half-done.

## Where AI helped, and where I overrode it

I used Claude Code throughout — for the data audit scripts, the scaffolding, and most of the component
code. It was genuinely fast at that. The places it was **wrong**, and I caught it, are more
interesting:

- **It got the competitor wrong.** The obvious brand tokens in the text are Robi, Airtel, Grameenphone,
  Banglalink, Teletalk — so the first pass treated those as the competitor. They're mobile operators
  people are *recharging through* TakaPay. The real competitor is **NgoodPay**, and you only see that
  by reading the posts instead of counting the capitalised words.
- **It undercounted the mislabelled rows.** A quick first check ("positive but scoring under 50") found
  6. Plotting the actual score distribution found **23** — and revealed that the bands are structural
  rather than arbitrary. The cheap check gave a confidently wrong number.
- **It took `brand_mention` at face value.** The field is `true` everywhere and looks authoritative.
  It's the single most broken column in the file.
- **It wanted `competitor` in the priority ranking.** It's a big topic and 100% negative, so a naive
  score puts it near the top — which would mean ranking the brand's to-do list on a label I'd just
  finished proving was unreliable. I pulled it out.
- **It reached for a donut chart and a red/green palette.** Sentiment is an *ordered* scale, so it
  should be a stacked bar — you compare lengths on a shared baseline instead of angles. And red/green
  is the one palette ~8% of men can't read; this uses a blue↔red diverging pair, validated for
  colour-blind separation, with direct labels so colour never carries meaning alone.
- **Screenshotting the running page caught bugs that reading the code didn't** — two spots where JSX
  silently ate a space (`"81of the brand's"`), and a stat tile that rendered a long topic name at hero
  size and wrapped it into a mess.

The pattern: AI was fast at everything mechanical, and confidently wrong wherever the answer depended
on actually *looking* — at the posts, at the distribution, or at the rendered page.

## Notes

- `data/` holds the original CSV and JSON, unmodified. Nothing is ever written back to them.
- `scripts/verify-cleaning.ts` asserts the pipeline against the numbers I established by hand. If the
  code and the audit ever disagree, the code is wrong.
