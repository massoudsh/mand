# Synthetic uplift benchmark

Run `npm run gen:data -- --users 10000 --seed 42`. Output is a JSON array on stdout; use `npm run --silent gen:data -- ...` for machine-readable output. An optional `--true-uplift config.json` accepts a map of segment names to `{ "baseline": 0.3, "uplift": 0.15 }`.

The seeded 32-bit LCG provides reproducible pseudorandomness, not cryptographic randomness. Segment membership is balanced round-robin. Treatment is randomized independently at 50%; binary outcomes are Bernoulli with probability `baseline + treatment * uplift`. Both probabilities must be within [0,1]. User counts are limited to 4–1,000,000; generated identifiers are synthetic and do not correspond to people.

The benchmark estimator is a stratified difference in treated/control outcome means. It consumes only segment, treatment, and outcome, never the ground-truth field. Validation separately compares against known ground truth. Default segments include persuadable (+0.15) and sleeping-dog (-0.15) effects. Tests use 40,000 users for seeds 42, 51, and 127 and require recovery within **3 absolute percentage points**, not 3 percent relative error. A biased positive estimate for the negative-uplift group must fail. Missing treatment/control arms return null and fail validation.

This harness validates a simple randomized baseline, not the hardcoded dashboard scores or a trained causal model. It has no confounding, temporal drift, interference, delayed outcomes, unequal propensities, or observational selection bias. It is not evidence of production uplift or statistical confidence for Iranian consumers. Real partner data, experimental design, and out-of-sample validation remain necessary.

The dashboard seed remains a small, separate fixture. Its counts, monetary values, reasons, and competitor coverage are illustrative. Confidence is deliberately null. Dispatch uses only four eligible fixture users and skips two non-recommended/control users, not the large marketing audience counts from the original mock cards. Per-recipient incentive cost is 10,000,000 IRR and cumulative customer cap is 100,000,000 IRR in the SQLite seed. Campaign caps are copied from fixture budgets. No phone numbers or real identities are included.

## Market scan and growth modules (0.3.0)

`db/radar.json` holds a hand-curated scan of ten public competitor products (Braze, Iterable, CleverTap, MoEngage, Insider One, Optimove, Payamgostar, Didar, Tiko, Vafadar) taken on 2026-11-24. Each rival lists five headline capabilities. `backend/radar.js` counts how many rivals advertise each capability and marks which five were integrated. The scan is an analyst summary of public product pages, not a licensed market dataset; provenance is `sourceType: "market-scan"` with `confidence: null` everywhere.

The growth modules are deterministic scenario math on synthetic inputs:

- Journey projections multiply each step's audience by a fixed conversion rate; steps do not consume the previous step's audience, so the total is an upper-bound style demo, not a forecast.
- Connector mapping only matches channel substrings in current campaign labels and never opens a network connection.
- Experiment p-values use a pooled two-proportion z-test over fixed counts, with an SRM check at 1%. They demonstrate the decision path; they are not evidence for any real offer.
- The loyalty allocator is a greedy integer knapsack ranked by incremental revenue per rial. It respects budget and demand but ignores expiry, tier eligibility, cannibalisation, and fraud.
- Send-time and frequency-cap values are synthetic open rates and weekly send volumes. Suppression = `1 - cap / contactRate` when contact pressure exceeds the cap.

None of these numbers validate production uplift, revenue, or delivery. They exist to exercise the API, UI, and decision rules with reproducible data.
