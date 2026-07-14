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

A brand manager doesn't need to be told "59% negative." They need to know **which one thing to
escalate on Monday morning.** So the main table ranks topics by *negative reach*, which is exactly
what it sounds like: **add up the reactions and comments on the angry posts, and ignore the happy
ones.** One sum, no tuned weights — but it folds in all three things that decide whether an issue
matters. Volume, because more angry posts add more terms. Negativity, because a cheerful topic
contributes nothing. And audience, because a complaint 500 people piled into outweighs forty
templated ones nobody saw.

It matters because the two rankings genuinely disagree on this data:

| By post count | % of its posts that are negative | | By negative reach |
|---|---|---|---|
| 1. Failed transactions | 99% | | 1. Failed transactions |
| 2. **Cashback offers** | **0%** | | 2. **Charges & fees** |
| 3. **Send money** | **0%** | | 3. **App crashes** |
| 4. **Mobile recharge** | **0%** | | 4. Login & OTP |

Look at the middle column. **The second, third and fourth biggest topics in the feed have no
complaints in them at all** — people like the cashback, the transfers land, the recharges work.
Ranking by volume hands a brand manager a to-do list where three of the top four items have nothing
wrong with them.

Rank by negative reach and what surfaces instead is charges & fees and app crashes: small topics where
nearly every post is furious and people pile into the comments. Those are real work. Failed
transactions leads either way, but the reach view shows *how* dominant it is: **81% of all the
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
| **23 sentiment labels contradict their own score** — labelled `positive` while scoring 46–60. One of them is *"Traffic ajke Farmgate e insane, 2 ghonta laglo pouchte"* — two hours stuck in traffic, filed under **positive**. | 23 rows | The score wins. |
| **~6% of every template has its sentiment flipped — and its score flipped with it,** so the row is internally consistent and lies anyway. Nothing in the row itself gives it away. See below; this is the worst one. | 39 rows | Outvoted by its own identical twins. 5 more were too marginal to call, and are disclosed rather than guessed at. |
| **Every single competitor post is labelled negative** — 81 of 81 — including neutral market intel like *"NgoodPay launched a 500 taka cashback, has anyone tried it?"* (scored 9/100). | 81 rows | Kept the volume, distrusted the sentiment, and **kept `competitor` out of the priority ranking** so a label I know is broken can't drive a negativity-weighted score. |
| **The feed is templated.** 660 records collapse to ~172 distinct text skeletons; one complaint template repeats 45 times. 10 texts are exact duplicates under a different id and author. | 10 rows | Duplicates counted once. It also means I don't claim any single post "went viral" — that's a template, not a movement. |

### The defect that nearly got past me

Trusting the score works right up until the score is lying too.

The `send_money` template *"…কে 2000 টাকা পাঠালাম TakaPay দিয়ে, সাথে সাথে চলে গেল"* — "sent 2000 taka
via TakaPay, it went through instantly" — appears 49 times. **45 copies are labelled positive with
scores of 72–93. Four identical copies are labelled negative, with scores of 19 and 20.** Both fields
were flipped together, so there is no internal contradiction to catch, and the row sails through every
rule above. Those four had high engagement, and my priority ranking is a sum *over* engagement — so
they didn't merely add noise, they got amplified by the exact thing I was ranking on, and landed as
the top three "loudest complaints" on send money. They are compliments.

I can prove it's injected noise rather than my Bangla being wrong, because it happens in the English
templates too:

> *"Instant Robi recharge on TakaPay, 300 taka, done before I finished my tea."* — 9 copies positive,
> **1 copy negative, score 16.**
>
> *"Why is TakaPay charging 20 taka to cash out? This is robbery."* — 24 copies negative,
> **5 copies positive, scores 73–88.**

No reading of *"done before I finished my tea"* is a complaint. None of *"this is robbery"* is praise.

The fix is handed to me by the very thing that makes the data cheap — **the templating is the antidote
to the corruption.** Group posts by their template skeleton (blanking out the amount, the recipient,
the telco, the elapsed time), and a post that disagrees with an overwhelming majority of its identical
twins gets outvoted by them. Every group that qualifies lands at **82–93% agreement**, so nothing is a
close call. It flips 39 rows. Five more sit in groups of only 4–6 copies where the vote is too thin to
be safe; I left them in and put the count on the dashboard, because a rule that guesses on weak
evidence is worse than one that says what it couldn't fix.

The check that this recovered signal rather than steamrolling it: afterwards, **every template holds a
single consistent sentiment, and the topics come out cleanly polarised** — failed transactions 99%
negative, charges & fees 100%, cashback and send money and recharge 0%. The corruption dissolves into
a clean picture instead of smearing into a muddier one.

### Two more things I'd defend hardest

**The score bands aren't a threshold I picked — they're structural.** Plotting all 660 scores shows
three clusters with two completely empty gaps: nothing scores 31–44, and nothing scores 61–69. So
negative ≤30, neutral 45–60, positive ≥70 — and the cut points sit *inside the gaps*, meaning I could
move them anywhere in those gaps and not reclassify a single record.

**All 23 label-vs-score contradictions are off-topic rows.** That flavour of corruption is entirely
contained in the noise, which is independent evidence the noise should go.

Together these move the headline a long way: **51% negative as shipped → 59% once the file stops
lying.** Flip the Raw/Cleaned toggle and you can watch it happen.

I also checked what *isn't* broken, so I wasn't inventing problems: ids are unique, every timestamp
falls inside June 2026, and the language tags are right on 659 of 660 rows.

## What I'd do with another week

- **Re-derive sentiment from the text**, not the shipped label. The template vote only works because
  this feed is generated — every post has 40 identical twins to be judged against. Real social data
  has none of that, and the same defect would be invisible. It also can't help the competitor rows,
  where the bias is uniform across the whole topic so there's no majority to appeal to. A classifier
  that handles Banglish would let me stop trusting the file at all, and is the only thing that
  generalises.
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
- **Using the running product caught the worst defect in the file.** The flipped-sentiment rows —
  the ones where the label *and* the score lie in unison — got through every check the pipeline had,
  and got through them *quietly*, because a row that agrees with itself looks clean from the code's
  point of view. What surfaced them was clicking into "Loudest complaints" on send money and actually
  reading the posts: three of them said the money arrived instantly. Nothing in the schema, the tests,
  or the distributions would have told me. I'd written the "what I'd do with another week" section
  admitting I couldn't catch a row where both fields were wrong; it took reading four sentences on my
  own dashboard to find out that wasn't hypothetical.
- **Screenshotting the running page caught bugs that reading the code didn't** — two spots where JSX
  silently ate a space (`"81of the brand's"`), and a stat tile that rendered a long topic name at hero
  size and wrapped it into a mess.

The pattern: AI was fast at everything mechanical, and confidently wrong wherever the answer depended
on actually *looking* — at the posts, at the distribution, or at the rendered page. The most useful
thing I did all day was read my own output like a sceptical reader instead of like its author.

## Notes

- `data/` holds the original CSV and JSON, unmodified. Nothing is ever written back to them.
- `scripts/verify-cleaning.ts` asserts the pipeline against the numbers I established by hand. If the
  code and the audit ever disagree, the code is wrong.
