# Three Baskets: product specification

Version 0.2, written 2026-11-14. Status: draft for team review, no code exists yet. Change from 0.1: the app is a React Native (Expo) Android app instead of a phone-width web app.
"Three Baskets" is a working name. Challenge: S-Bank at Junction 2026, "turn personal banking data into a trusted financial coach".

This file is the source of truth for behaviour. When behaviour changes, change this file first, then the code.

All figures in this document were computed from the provided CSV files on 2026-11-14. The people named are fictional; the customer IDs are rows in the synthetic dataset.

---

## 1. Summary and challenge fit

A customer opens the app and sees one number: what is safe to spend this week. Below it, their spending is sorted into three baskets: regular essentials, unexpected necessities and everyday spending. They can ask anything about their own transactions in plain English, and every answer is a number with a small chart, the basket it belongs to, and a "how I got this" panel that leads to the transactions behind it.

A small language model runs on the laptop. It does two things only: it turns the question into a structured query form, and it words the reply. Every sum, forecast and comparison is computed by ordinary code, so the model cannot produce a wrong number. No customer data leaves the device.

| Phrase in the brief | What the product does | Stories |
|---|---|---|
| "How much did I spend on taxis last month?" | Lookup through the query form, answered from the user's rows | A1 |
| "Where did my money go?" | Breakdown by basket, then by category, then by merchant type | A2, B1 |
| "What kind of spender am I?" | Two labels (spending style and cash-flow state) with the reasons shown | P1 |
| "What is safe for me to spend this week?" | Safe-to-spend, the headline number on the home screen | S1, S3 |
| "How much could I save if I reduced dining out by 20%?" | What-if on any category, basket or merchant type | W1 |
| Three baskets, pedagogical angle | Fixed starting rules, every answer tagged with its basket, the user can move things | B1, B2, B3 |
| MyData, explore freely | Any combination of measure, filter, grouping, period and comparison; every number opens its transactions | A3, A4, T1 |
| Explain concepts in plain language | Short reviewed explanations filled with the user's own figures | A5 |
| Safe-to-save guidance | Monthly amount the user can put aside without changing habits | S2 |
| Benchmarks from open data | Peers of the same age and area from the dataset, plus Statistics Finland postal-area figures | P2, P3 |
| Mobile app or embeddable web app | React Native app built with Expo, run on an Android phone connected to the laptop | Section 11 |
| Multi-bank view (optional bonus) | Not built. See section 16 | - |

## 2. Users and jobs

| Persona | Dataset customer | Situation on 2026-09-30 | Used for |
|---|---|---|---|
| **Aino**, 22, Espoo | `CUST02979` | Balance EUR 1,259.49, salary about EUR 2,115, rent about EUR 626 due next week. Restaurants at twice the level of peers. Below zero in 9 of 24 months | Main demo: lookups, baskets, safe-to-spend, what-if, spender type |
| **Mikko**, 36, Espoo | `CUST04767` | Balance EUR 16,393.91, salary about EUR 2,994, saves about EUR 397 a month. Had a mortgage approved for a EUR 174,500 home | Mortgage affordability, "well covered" state, safe-to-save |
| **Sara**, 23, Helsinki | `CUST00164` | Restaurants EUR 1,937.20 in September against a usual EUR 276.78. A EUR 564.73 hardware-store purchase on 5 September | Spare: insight cards, coach asking about a large one-off |

The primary audience is young adults, which the brief names as the group where financial literacy matters most. The product must still work for any of the 5,100 customers.

## 3. Scope

**In (48-hour build):**

- Chat with query form, answer cards and drill-down to transactions.
- Three baskets with default rules and user overrides.
- Safe-to-spend, safe-to-save, what-if.
- Spender type and peer comparison from the dataset.
- Insight cards on the home screen.
- Statistics Finland postal-area benchmark.
- Mortgage affordability check.
- Demo controls: customer switch, "as of" date, reset.

**Cut order if time runs short** (first cut first): mortgage check, postal-area benchmark, insight cards, peer comparison. Nothing above that line is cut.

**Out:**

- Multi-bank (PSD2) view.
- Finnish. The interface and the coach are English only.
- Hosted language models and any network call during the demo.
- Login and user accounts. A customer is chosen from a list.
- Real S-Bank systems. Data comes from the provided CSV files.
- Predicting mortgage approval. The data does not support it (section 6.10).
- Product recommendations and investment advice (story T3).
- Payments, transfers or any action that moves money.
- Push notifications, voice input, app store publishing.
- iOS builds. The laptop runs Linux, so iOS cannot be built or simulated there. Expo keeps an iOS build possible later.
- A web version. Expo can export one later, but nothing is tested for it.

## 4. User stories and acceptance criteria

Figures in the criteria are test fixtures for the as-of date 2026-09-30.

### Ask

**A1. Look something up.** As a customer I ask "How much did I spend on taxis last month?" and get the amount.
- For Aino the answer is EUR 90.76 from 2 rides in August 2026, tagged everyday spending.
- The answer card states the period in words ("August 2026"), the amount, the number of transactions and the basket.
- "Last month" means the calendar month before the as-of month. "This week" means Monday to Sunday containing the as-of date.

**A2. Where did my money go?** I ask for a breakdown of a period.
- The first level is always the three baskets. For Aino, September 2026: regular essentials EUR 1,363.01, unexpected necessities EUR 183.18, everyday spending EUR 682.27.
- Tapping a basket shows its categories. Aino's everyday spending in September: Home & Tech EUR 271.09, Entertainment EUR 219.37, Restaurants EUR 191.81.
- Income and transfers (investments, salary moved out) are shown on separate lines and never inside a basket.

**A3. Compare periods.** I ask "Did I spend more on groceries this month than last?"
- The card shows both amounts, the difference in euros and in percent, and a two-bar chart.
- Comparisons offered: previous period, same period last year, my usual level, peers.

**A4. Explore freely.** I can combine any measure, filter, grouping and period that the query form allows (section 7.2), for example "restaurant spending by weekday over the last 6 months" or "my five largest purchases this year".
- The chart type follows the grouping: time groupings give a line or bars over time, other groupings give ranked bars, no grouping gives a single figure.
- If the question needs something the form cannot express, the coach says so and offers the nearest question it can answer (T2).

**A5. Explain a concept.** I ask "What is a buffer?" or "What does loan-to-value mean?"
- The reply is a stored explanation of at most 60 words, written and reviewed by the team, with the user's own figure inserted where one exists.
- The model only picks which concept is meant. It does not write the explanation.

### Baskets

**B1. See my baskets.** The home screen and the Baskets tab show the three baskets for the current month with amount and share, and the same for the usual month.

**B2. Move things between baskets.** I can move a whole category, a merchant type or a single transaction to another basket.
- The change applies at once to every figure for me and for nobody else.
- Moved items are marked, and "reset to defaults" undoes all my changes.

**B3. The coach asks about large one-offs.** When a purchase lands in unexpected necessities because of its size, the coach asks once: "Was this something you had to replace or repair?"
- "Yes" keeps it. "No, it was a choice" moves that transaction to everyday spending.
- For Sara this fires for EUR 564.73 at a hardware store on 2026-09-05.

### Safe

**S1. Safe to spend this week.** The home screen shows one amount, rounded down to the nearest EUR 5.
- For Aino the amount is EUR 130.
- If the calculation is negative the screen shows EUR 0 and the expected shortfall before payday.
- If the weekly amount is more than twice the user's usual weekly everyday spending, the screen shows "Well covered until payday" and puts safe-to-save first. This is the case for Mikko.

**S2. Safe to save.** I ask "How much can I safely save?" and get a monthly amount, rounded down to the nearest EUR 10, next to what I already put aside.
- For Mikko: EUR 380 a month, against about EUR 397 already going to investments.
- For Aino: EUR 0, with the statement that current habits run about EUR 205 a month over a cautious income.

**S3. Show the working.** Every safe-to-spend and safe-to-save figure opens a panel listing each line of the calculation with its amount and where it came from (section 6.3).

### What-if

**W1. Cut something by a percentage.** "What if I cut dining out by 20%?"
- For Aino: EUR 64.77 a month, EUR 777.26 a year, based on a usual EUR 323.86 a month on restaurants.
- The reply also states the effect on safe-to-save.

**W2. A one-off expense.** "What if I need to pay EUR 400 for a repair next week?"
- The amount is subtracted from the safe-to-spend total and the weekly figure and any shortfall are recomputed.

**W3. A savings goal.** "I want EUR 2,000 by next summer."
- The reply gives the monthly amount needed, compares it with safe-to-save, and if it does not fit, states the percentage cut in everyday spending that would fund it.

### Profile and peers

**P1. What kind of spender am I?** The reply gives a spending style and a cash-flow state, each with the figure that decided it (section 6.6).
- Aino: experience-led (everyday spending is 38% of basket spending) and stretched (spending exceeded income over the last six months).

**P2. Compare with people like me.** Peers are customers in the same age band and postal area.
- Aino on restaurants: EUR 323.86 a month against a peer median of EUR 158.88, more than 83% of the 207 customers aged 18 to 29 in the Espoo region.
- Wording never ranks people as good or bad. It states the position and the group.

**P3. Compare with my area.** One card with Statistics Finland figures for the user's postal code, with the year and source shown (section 9).

### Insight cards

**I1. The coach raises things itself.** The home screen shows up to four cards chosen by the rules in section 6.9. Tapping a card opens the chat with that question already answered.

### Mortgage

**M1. Could I afford this home?** "Could I afford a EUR 250,000 home?"
- The reply shows the required income, the typical equity, the user's own figures against both, the largest price that fits the user's income, and the months needed to save the missing equity.
- For Mikko the figures are those in section 6.10.
- The card carries the line "An estimate from past applications in this data. Not a loan offer."

### Trust

**T1. Every number can be traced.** Each answer card has "Show transactions", which lists the rows that produced the figure.

**T2. Clear limits.** For questions outside the data or the form, the coach answers "I can't answer that from your transactions" and suggests up to three questions it can answer. It never guesses.

**T3. Coaching, not advice.** The coach does not recommend financial products, investments or lenders. Asked "Should I buy this fund?", it explains the concept and suggests speaking with the bank.

**T4. Honest about the data.** Merchants have no names, so "coffee" cannot be isolated. The coach answers at the nearest level (fast food, restaurants) and says which level it used. Only this one account is visible, and the coach says so wherever it matters (savings, equity).

## 5. Basket rules

Rules are checked in order and the first match decides. Amounts are absolute values.

| # | Condition | Result |
|---|---|---|
| 1 | Category is Salary or Other Income | Income (not a basket) |
| 2 | Category is Invest Deposit, Invest Withdraw or Salary Sweep | Transfers (not a basket) |
| 3 | Category is Housing, Utilities or Groceries | Regular essentials |
| 4 | Category is Transportation and merchant type is taxi (4121) or parking (7523) | Everyday spending |
| 5 | Category is Transportation and amount is EUR 300 or more | Unexpected necessities |
| 6 | Category is Transportation (public transport, fuel, or no merchant type) | Regular essentials |
| 7 | Merchant type is pharmacy (5912) and the customer is a regular pharmacy buyer (see notes) | Regular essentials |
| 8 | Category is Health (doctor, dentist, other medical, and pharmacy for non-regular buyers) | Unexpected necessities |
| 9 | Category is Home & Tech and amount is EUR 300 or more | Unexpected necessities |
| 10 | Anything else (Restaurants, Entertainment, Lifestyle, Travel, smaller Home & Tech) | Everyday spending |

Applied to all 5,100 customers over 24 months:

| Basket | Share of basket spending | Per customer per month | Transactions |
|---|---|---|---|
| Regular essentials | 62.3% | EUR 1,817 | 1,757,997 |
| Unexpected necessities | 8.4% | EUR 245 | 176,186 |
| Everyday spending | 29.3% | EUR 856 | 1,522,159 |

Notes:

- 160,624 purchases have no merchant and no merchant type. They follow their category through the table.
- Rule 7 depends on the customer's history. A customer is a regular pharmacy buyer when they have pharmacy purchases in at least 4 of the 6 reference months. The check is redone for each as-of month, so pharmacy spending moves into regular essentials once it becomes a habit and back out if it stops. A customer with fewer than 6 months of history is not a regular buyer. The "how I got this" panel says which months counted.
- Rule 9 cannot tell a washing machine from a television. That is why the coach asks (B3) and the user can move it (B2).
- User overrides are stored per customer at three levels: category, merchant type, single transaction. The most specific one wins.
- The EUR 300 threshold is a single constant in configuration.

Merchant types are the 36 merchant category codes in the data, each given a short key and a plain label (appendix B).

## 6. Calculations

### 6.1 Shared terms

- **As-of date:** the date the app treats as today. Default 2026-09-30, the last date in the data.
- **Reference months:** the six full calendar months before the as-of month. For 2026-09-30 these are March to August 2026.
- **Usual monthly amount:** the median of the monthly totals over the reference months. A month with no spending counts as zero. Medians are used because single extreme transactions exist in the data (for example EUR 15,902 at a grocery shop).
- **Usual weekly amount:** usual monthly amount times 7 divided by 30.
- **Current balance:** `balance_after_eur` of the customer's last transaction on or before the as-of date.

### 6.2 Payday

- The payday is the 15th if at least half of the customer's salaries arrived on the 15th, otherwise the last day of the month. Across the dataset 79% of salaries arrive on the 15th and most of the rest on days 26 to 31.
- Next payday: the next such date after the as-of date. If the 15th of the current month has passed without a salary, the next payday is the last day of the current month.
- **Late-salary note:** the working panel states how many of the customer's salaries arrived at month end and what the shortfall would be if the next one does.

### 6.3 Safe-to-spend

```
days            = days from as-of date to next payday (at least 1)
housing_due     = median of the last 3 housing payments, once for each month
                  whose day 1 to 8 window falls before payday and is not yet paid
running_costs   = (usual monthly utilities
                   + usual monthly groceries and essential transport) * days / 30
buffer          = average monthly unexpected necessities over the whole history
                  (each transaction counted up to EUR 5,000) * days / 30
savings_reserve = savings target - investment deposits made since the last salary
                  (not below 0)
safe_total      = balance - housing_due - running_costs - buffer - savings_reserve
safe_per_week   = safe_total / days * 7   (or safe_total if days < 7)
```

- The savings target defaults to the usual monthly investment deposit and can be changed by the user.
- The displayed weekly figure is rounded down to the nearest EUR 5. Negative totals display as EUR 0 with the shortfall.

**Worked example: Aino on 2026-09-30.**

| Line | Amount (EUR) | Source |
|---|---|---|
| Balance | 1,259.49 | Last transaction, 2026-09-30 |
| Next payday | 2026-10-15, 15 days | 21 of 24 salaries on the 15th |
| Housing due | 625.56 | Median of 607.12, 625.56, 626.47. October's payment not yet made |
| Utilities | 63.50 | Usual 127.00 a month, 15 of 30 days |
| Groceries and essential transport | 236.41 | Usual 472.82 a month, 15 of 30 days |
| Buffer | 49.75 | 2,387.79 over 24 months is 99.49 a month, 15 of 30 days |
| Savings reserve | 0.00 | No investment deposits in the history |
| **Safe total** | **284.27** | |
| Per week | 132.66 | Shown as **EUR 130** |

Aino's usual weekly everyday spending is EUR 200.34, so the coach adds: "That is about EUR 70 less than your usual week."

Late-salary note for Aino: 3 of 24 salaries arrived at month end. With payday on 31 October the same calculation gives a shortfall of EUR 88.69.

### 6.4 Safe-to-save

```
cautious_income = lowest of the last 6 salaries
safe_to_save    = cautious_income - usual monthly regular essentials
                  - average monthly unexpected necessities - usual monthly everyday spending
```

Rounded down to the nearest EUR 10. Not below zero in the display.

| | Aino | Mikko |
|---|---|---|
| Cautious income | 1,970.05 | 2,251.96 |
| Regular essentials | 1,217.25 | 1,288.72 |
| Unexpected necessities | 99.49 | 101.20 |
| Everyday spending | 858.61 | 480.41 |
| **Safe-to-save** | **-205.30, shown as EUR 0** | **381.63, shown as EUR 380** |

For Aino the coach adds that a 24% cut in everyday spending (205.30 of 858.61) would bring the figure to zero.

### 6.5 What-if

- **Cut by a percentage:** usual monthly amount of the target times the percentage. Yearly figure is twelve times that. Safe-to-save is recomputed with the lower amount. Aino, restaurants at 20%: 323.86 times 0.20 is EUR 64.77 a month and EUR 777.26 a year. Safe-to-save moves from -205.30 to -140.53.
- **One-off expense:** subtract the amount from the safe total and recompute the weekly figure.
- **Savings goal:** goal amount divided by months gives the monthly need. If it is above safe-to-save, the gap divided by usual monthly everyday spending gives the cut required.

What-if never changes stored data.

### 6.6 Spender type

Computed over the reference months. Basket spending means the three baskets together.

| Spending style | Rule | Customers |
|---|---|---|
| Experience-led | Everyday spending is 35% or more of basket spending | 1,247 (24%) |
| Essentials-heavy | Otherwise, regular essentials are 70% or more | 1,615 (32%) |
| Balanced | Otherwise | 2,238 (44%) |

| Cash-flow state | Rule | Customers |
|---|---|---|
| Stretched | Basket spending exceeded income, or the balance was below zero in 2 or more of the months | 2,107 (41%) |
| Building | Otherwise, 15% or more of income was left after basket spending | 1,853 (36%) |
| Steady | Otherwise | 1,140 (22%) |

The reply also names the category where the user stands highest among peers.

Aino: income 13,065.43, regular 8,189.77, unexpected 0.00, everyday 5,056.58. Everyday share 38.2%, so experience-led. Spending 13,246.35 exceeds income, so stretched.
Mikko: regular essentials 72.3% of basket spending and 34.2% of income left, so essentials-heavy and building.

### 6.7 Peer comparison

- Age bands: 18 to 29, 30 to 39, 40 to 49, 50 to 59, 60 and over.
- Areas by the first two digits of the postal code: 00 Helsinki, 01 Vantaa region, 02 Espoo region.
- This gives 15 groups of 73 to 1,059 customers. A group under 30 customers falls back to the age band alone.
- For each group and each metric (the baskets, each category, each merchant type) the 10th to 90th percentiles of the customers' usual monthly amounts are precomputed.
- The reply states the user's amount, the group median, the share of the group below the user, and the group in words.

### 6.8 Area benchmark

One card for the user's postal code from the table in section 9. The card shows the figures as published, with year and source. It does not combine them with the user's transactions in any calculation, because the published income is annual and before tax while salaries in the dataset look monthly and after tax.

### 6.9 Insight cards

Rules are evaluated when the home screen loads. At most four cards are shown, largest euro amount first.

| Card | Fires when |
|---|---|
| Category running high | An everyday category this month is at least 30% and at least EUR 50 above its usual monthly amount |
| Tight before payday | The safe total is negative |
| Unexpected necessity | An unexpected-necessity purchase of EUR 300 or more in the last 30 days that the user has not yet confirmed (B3) |
| Room to save | Safe-to-save is EUR 50 or more and above the user's usual monthly investment deposit |
| High among peers | A category's usual monthly amount is above 90% of the peer group |
| Going well | Everyday spending this month is at least 15% below usual, checked from the 20th of the month |

Sara on 2026-09-30: "Category running high" fires for Restaurants (EUR 1,937.20 against a usual EUR 276.78) and "Unexpected necessity" fires for EUR 564.73 at a hardware store.

### 6.10 Mortgage affordability

What the 200 mortgage applications in the data show:

- `required_monthly_income_eur` equals the loan times 0.0184086 in every application. That is the monthly payment on the loan at 6% interest over 25 years, divided by 0.35. In words: the stressed payment may take at most 35% of income.
- Equity share (equity divided by price) among the 150 approved applications: median 14.8%, middle half 8.7% to 18.3%.
- Salary divided by required income is about 0.95 for approved and rejected applicants alike. Approval therefore cannot be predicted from transactions, and the feature does not try.

Calculation for a home price P:

```
equity_needed    = 15% of P                 (default, the user can change the share)
loan             = P - equity_needed
required_income  = loan * 0.0184086
user_income      = median of the last 12 salaries
max_loan         = user_income / 0.0184086
max_price        = max_loan / 0.85, rounded down to the nearest EUR 1,000
equity_gap       = equity_needed for the chosen price - current balance
months_to_equity = equity_gap / safe_to_save, rounded up
```

**Worked example: Mikko asks about a EUR 250,000 home.**

| Line | Amount (EUR) |
|---|---|
| Equity needed at 15% | 37,500.00 |
| Loan | 212,500.00 |
| Required monthly income | 3,911.83 |
| Mikko's income (median of 12 salaries) | 2,993.82 |
| Short by | 918.01 a month |
| Largest loan that fits the income | 162,631.22 |
| Largest price at 15% equity | 191,000 |
| Equity for that price | 28,650.00 |
| Balance in this account | 16,393.91 |
| Equity gap | 12,256.09 |
| At safe-to-save of 381.63 a month | 33 months |

Check against the data: Mikko's real application was for a EUR 174,500 home with a EUR 160,000 loan, required income EUR 2,945.38, and it was approved. That is inside the EUR 191,000 the calculation allows.

## 7. Language model usage

### 7.1 Two tasks only

| Task | Input | Output | If it fails |
|---|---|---|---|
| Understand | The user's message, the as-of date, the last question's form | One query form (7.2) | Fallback parser (7.4) |
| Word | The computed facts as a short list of labelled values | At most three sentences | Template sentence (7.3) |

The model never sees transaction rows. It never does arithmetic.

### 7.2 Query form

```json
{
  "intent": "measure",
  "measure": "spend",
  "filters": {
    "basket": null,
    "category": ["Transportation"],
    "merchant_type": ["taxi"],
    "min_amount": null,
    "max_amount": null
  },
  "period": "last_month",
  "from": null,
  "to": null,
  "group_by": "none",
  "compare_to": "none",
  "what_if": null,
  "concept": null,
  "home_price": null
}
```

| Field | Allowed values |
|---|---|
| `intent` | `measure`, `safe_to_spend`, `safe_to_save`, `what_if`, `spender_type`, `compare_peers`, `area_benchmark`, `mortgage`, `explain`, `unsupported` |
| `measure` | `spend`, `income`, `net`, `count`, `average`, `largest` |
| `filters.basket` | `regular`, `unexpected`, `everyday` |
| `filters.category` | The 15 category names in the data |
| `filters.merchant_type` | The 36 keys in appendix B |
| `period` | `this_week`, `last_week`, `this_month`, `last_month`, `last_3_months`, `last_6_months`, `last_12_months`, `this_year`, `last_year`, `all_time`, `custom` (then `from` and `to` are dates) |
| `group_by` | `none`, `basket`, `category`, `merchant_type`, `merchant`, `month`, `week`, `weekday` |
| `compare_to` | `none`, `previous_period`, `same_period_last_year`, `my_usual`, `peers` |
| `what_if` | `{ "kind": "cut_percent" or "one_off" or "goal", "percent", "amount", "months" }`. The target of a cut is given in `filters` |
| `concept` | A key from the stored explanations list |
| `home_price` | A number in euros |

Code validates the form against this table before running it. An invalid form counts as a failure.

### 7.3 Safeguards

- **Constrained output.** The model server is given the form's schema so that the output is always valid JSON of the right shape.
- **Number check.** Every number in a worded reply must equal a value in the facts it was given, after the same rounding. If any number does not match, the template sentence for that intent is shown instead.
- **Templates exist for every intent** and are the fallback for wording. Example: "You spent EUR {amount} on {what} in {period}, across {count} purchases."
- **Time limits.** If the form is not ready within 8 seconds the fallback parser is used. If wording has not started 6 seconds after the numbers are on screen, the template is shown.
- **No history of rows.** Only the previous form is passed as context, so follow-ups such as "and the month before?" work without sending data to the model.
- **Refusals.** Product advice, other people's data and anything not about money give `unsupported`.

### 7.4 Fallback parser

A keyword table maps words to categories, merchant types, periods and intents ("taxi", "last month", "safe", "what if", "%"). It handles the questions in the demo script and the common lookups. If it cannot build a valid form, the coach gives the T2 reply. The whole demo script must pass with the model switched off.

### 7.5 Model and serving

- Hardware: this laptop, AMD Ryzen 5 7535HS, 14 GB RAM, no dedicated GPU. Nothing is installed yet.
- Model class: 3 to 4 billion parameters, 4-bit quantised, served locally by a runtime that supports schema-constrained output (llama.cpp server or Ollama).
- The model is chosen by measurement in the first three hours, not in advance. Each candidate runs the question set from section 15. Pass marks: at least 90% of forms exactly right, form ready in 4 seconds or less at the median, memory use under 6 GB.
- Prompts keep their fixed part first and unchanged so the runtime's prompt cache is reused between questions.
- Output is short by design: a form is about 60 tokens, a reply about 60.

## 8. Data model and loading

One DuckDB file is built once from the CSV files by a script. The app only reads it, apart from the overrides table.

| Table | Content |
|---|---|
| `transactions` | One row per CSV row: `tx_id` (file row number), `customer_id`, `tx_date`, `tx_ts`, `category`, `amount_eur`, `balance_after_eur`, `transaction_type`, `merchant_id`, `mcc_code`, `default_basket` |
| `customers` | `customer_id`, `postal_code` (text), `age`, `age_band`, `area` |
| `merchant_types` | `mcc_code`, `key`, `label`, `category` (appendix B) |
| `basket_overrides` | `customer_id`, `level` (category, merchant_type, transaction), `key`, `basket`, `created_at` |
| `monthly_summary` | Total and count per customer, month, basket, category and merchant type |
| `peer_stats` | Percentiles per age band, area and metric, with group size |
| `area_stats` | Statistics Finland figures per postal code (section 9) |
| `mortgage_applications` | The link file as provided. Used to derive the constants in 6.10 and in tests |

Loading rules:

- Files start with a UTF-8 byte-order mark. Strip it.
- Timestamps look like `05OCT24:17:51:20` (day, English month abbreviation, two-digit year).
- Missing merchant and merchant type are empty strings in the file. The brief also mentions "." as a missing value. Both load as null.
- Postal codes are text. Leading zeros matter.
- File order is kept as `tx_id` and is the tie-break for "last transaction", since balance follows file order.
- A load check confirms 3,626,755 transactions, 5,100 customers, and that previous balance plus amount equals balance for every row after a customer's first.

A customer with overrides has figures computed from `transactions` directly (a few hundred to 1,543 rows), not from the summaries.

## 9. Open data

Source: Statistics Finland, Paavo postal code area statistics, an open PxWeb database with an API. Checked on 2026-11-14:

- Database page: https://stat.fi/en/services/statistical-data-services/statistical-databases/paavo
- Latest tables: https://pxdata.stat.fi/PxWeb/pxweb/en/Postinumeroalueittainen_avoin_tieto/Postinumeroalueittainen_avoin_tieto__uusin/
- Data covers 2010 to 2024. The next update is expected in January 2027.
- The API's table and variable identifiers changed on 8 June 2026. Query examples older than that will not work unchanged.
- Small cells are suppressed and appear as "..." in the tables. Load them as null and hide the figure.

Use:

- Fetch once before the event for the 290 postal codes in the customer file and store the result in `area_stats`. The demo makes no network calls.
- Figures to load: median income of inhabitants, median income of households, average household size, number of inhabitants, and the share of rented dwellings if the current tables carry it. The person doing the load confirms the exact variables against the current handbook.
- Show the figures with their year and "Source: Statistics Finland, Paavo". Check the terms of use for the required credit line.

## 10. API contract

Base path `/api`. JSON throughout. Every request carries `customer_id` and optionally `as_of`.

| Method and path | Purpose |
|---|---|
| `GET /customers?pinned=true` | Demo customers for the switcher |
| `GET /home` | Safe-to-spend with its working, the three baskets for this month and the usual month, insight cards |
| `POST /chat` | Send a message. Streams events |
| `POST /transactions/query` | Rows behind a figure. Body is a query form |
| `POST /whatif` | Run a what-if directly from interface controls |
| `GET /overrides`, `POST /overrides`, `DELETE /overrides/{id}`, `DELETE /overrides` | Basket overrides. The last one resets all |
| `GET /health` | Database loaded, model loaded, model name |

`POST /chat` streams server-sent events in this order: `form` (the parsed query form), `card` (the answer card with all numbers), `text` (wording, in pieces), `done`. An `error` event can replace any of them.

Answer card:

```json
{
  "id": "ans_0001",
  "intent": "measure",
  "title": "Taxis, August 2026",
  "value": { "amount_eur": 90.76, "count": 2 },
  "basket": "everyday",
  "chart": { "type": "none", "series": [] },
  "working": [
    { "label": "Period", "value": "1 to 31 August 2026" },
    { "label": "Merchant type", "value": "Taxi" }
  ],
  "form": { "intent": "measure", "measure": "spend", "period": "last_month" },
  "follow_ups": ["Compare with July", "Show the rides", "Taxis this year"],
  "parsed_by": "model"
}
```

- `chart.type` is `none`, `bars`, `bars_over_time` or `line`.
- `parsed_by` is `model` or `fallback`.
- The card arrives before any wording, so numbers are on screen first.
- React Native's `fetch` cannot read a streamed response body reliably and has no built-in `EventSource`. The app reads the stream with the `react-native-sse` library, which sends POST requests with a body. If that library fails on the phone, the fallback is a plain JSON response with all four events in one array, behind the same path with `?stream=false`. The mock server supports both.
- The app reaches the API at `http://localhost:8000` on the phone, forwarded to the laptop over USB with `adb reverse tcp:8000 tcp:8000`. No Wi-Fi is needed.

The shapes in this section are frozen at hour 2 and backed by a mock server so the interface work does not wait.

## 11. UI specification

React Native app built with Expo and TypeScript, using Expo Router with a bottom tab bar for the four screens. The target is one physical Android phone, designed for a 390 dp wide screen and usable from 320 dp. The app uses no device features beyond the screen and keyboard: no camera, location, notifications or storage permissions.

Build and run:

- The demo runs from a development build installed on the phone with `npx expo run:android`, not from Expo Go, because Expo Go may need internet access to start.
- A release APK is built before hour 42 so the app also runs without the Metro bundler. The same APK is offered to judges, with a note that it needs the laptop on USB.
- Do not run an Android emulator alongside the model server. The emulator uses 2 to 4 GB of RAM and the laptop has 14 GB. Use the physical phone.

Libraries:

- Charts: `react-native-svg` with four small chart components of our own (`none`, `bars`, `bars_over_time`, `line`). Web chart libraries do not run in React Native.
- Streaming: `react-native-sse` (section 10).
- Fonts: bundled with `expo-font` so nothing is fetched at run time.
- Chat input: `KeyboardAvoidingView` so the input stays above the keyboard. Long chat threads use `FlatList`.

| Screen | Content |
|---|---|
| **Home** | Safe to spend this week with "how I got this". Three basket bars for this month against the usual month. Up to four insight cards. A text field that opens the chat |
| **Chat** | Messages and answer cards. Each card: title, the figure, basket tag, chart when there is one, one to three sentences, "How I got this", "Show transactions", follow-up suggestions. Suggested questions when the chat is empty |
| **Baskets** | The three baskets, each opening to categories, merchant types and transactions. Move controls at every level. Moved items marked. Reset |
| **Compare** | Spender type with its reasons. Peer comparison per basket and category. Area card |

Rules:

- Each basket has a fixed colour, icon and text label, and is never shown by colour alone.
- Amounts use a space as thousands separator, two decimals for looked-up figures, whole euros for rounded guidance, and always the currency.
- Touch targets are at least 48 dp, the Android guideline. Text contrast meets WCAG AA. Every control has an `accessibilityLabel`.
- While the model works, the card area shows a skeleton and the text "Looking at your transactions".
- A demo panel, opened by a long press on the app title, holds the customer switch, the as-of date and reset.

## 12. Demo script and pitch

Before the demo: laptop offline, phone in airplane mode and connected by USB, `adb reverse` set, as-of date 2026-09-30, overrides reset, Aino selected. The phone screen is shown to the audience through `scrcpy` on the laptop.

### Scene 1: Ask and baskets (about 60 seconds)

1. Type "How much did I spend on taxis last month?" The card shows EUR 90.76, 2 rides, everyday spending.
2. Tap "Show the rides": two rows, 5 and 29 August.
3. Type "Where did my money go in September?" Three baskets: EUR 1,363.01, EUR 183.18, EUR 682.27.
4. Tap everyday spending: Home & Tech 271.09, Entertainment 219.37, Restaurants 191.81.

### Scene 2: Safe-to-spend and what-if (about 60 seconds)

1. Home screen: "Safe to spend this week: EUR 130".
2. Open "How I got this": the table from section 6.3, including rent of EUR 625.56 due before payday.
3. Type "What if I cut dining out by 20%?" EUR 64.77 a month, EUR 777.26 a year.
4. Type "How much can I safely save?" EUR 0, about EUR 205 a month over, and the 24% cut that would close the gap.

### Scene 3: People like me, and a home (about 60 seconds)

1. Type "What kind of spender am I?" Experience-led and stretched. Restaurants above 83% of peers.
2. Switch to Mikko. Home screen shows "Well covered until payday" and safe-to-save EUR 380.
3. Type "Could I afford a 250,000 euro home?" The table from section 6.10: not at EUR 250,000, about EUR 191,000 fits, 33 months to the equity.

Spare if time allows: switch to Sara and show the two insight cards and the coach's question about the hardware-store purchase.

### Pitch outline (3 minutes)

1. The problem: statements and transaction lists do not tell people what they can do this week. (20 seconds)
2. Scenes 1 to 3. (about 2 minutes)
3. Why it can be trusted: the model never calculates and never sees rows, every number opens its transactions, and it all runs on a laptop with the network off. (25 seconds)
4. What comes next: Finnish, the second bank account, real categories from S-Bank. (15 seconds)

## 13. Non-functional requirements

- **Offline.** No network request leaves the laptop or the phone during use. The only connection is the USB link between them. Fonts and data are bundled or served locally.
- **Speed targets, measured on the demo laptop:** home screen in under 1 second, any calculation without the model in under 300 ms, answer card on screen within 5 seconds of sending, wording finished within 12 seconds. These are targets until the hour-3 measurement confirms them.
- **Privacy.** Transaction rows are never sent to the model. Nothing is logged outside the laptop. The data is synthetic, and the design does not depend on that.
- **Reproducible.** The same question, customer and as-of date give the same numbers. Wording may vary, numbers may not.
- **Recoverable.** If the model process dies the app keeps working through the fallback parser and templates, and `/health` reports it.

## 14. 48-hour plan

Stack: Python with FastAPI and DuckDB for the backend, React Native with Expo and TypeScript for the app, a local model server. None of it is installed on the laptop yet. The app also needs Node.js, a JDK 17, the Android SDK platform tools, `scrcpy`, and an Android phone with USB debugging turned on.

| Workstream | Owns |
|---|---|
| **Data** | Loading script, basket rules, summaries, peer statistics, every calculation in section 6, unit tests |
| **Model** | Model comparison, prompts, query form validation, fallback parser, number check, chat endpoint |
| **App** | The four screens, answer card, charts, drill-down, demo panel |
| **Story** | Open-data load, stored concept explanations, the question set, demo customers, visual design, pitch |

| By hour | Milestone |
|---|---|
| 1 | Tools installed, CSV files loaded, repository set up. Expo starter app running on the phone over USB |
| 2 | API shapes frozen, mock server running, the question set drafted. A streamed `/chat` reply from the mock server shows on the phone, or the `?stream=false` fallback is chosen |
| 3 | Model chosen from measurements, or decision to rely on the fallback parser |
| 12 | A1 and A2 work end to end on the phone |
| 24 | Baskets with overrides, safe-to-spend, safe-to-save and what-if work end to end. Scenes 1 and 2 run |
| 36 | Spender type, peers, insight cards, area card, mortgage. Feature freeze. Apply the cut order to anything unfinished |
| 42 | Release APK built and installed. First full rehearsal offline. Only fixes after this point |
| 46 | Pitch final, three clean run-throughs done |

## 15. Test plan and definition of done

**Question set.** About 40 questions, each with the expected query form and, for the three demo customers, the expected numbers. It covers every intent, every period value, follow-ups, and at least five questions that must give `unsupported`. It is used to choose the model and is rerun before each rehearsal.

**Calculation tests.** One test per fixture below, as-of 2026-09-30:

| Check | Expected |
|---|---|
| Basket shares, all customers | 62.3% / 8.4% / 29.3% |
| Aino, taxis in August 2026 | EUR 90.76, 2 transactions |
| Aino, September baskets | 1,363.01 / 183.18 / 682.27 |
| Aino, safe total and weekly | 284.27 and 132.66 |
| Aino, safe-to-save | -205.30 |
| Aino, restaurants cut 20% | 64.77 a month |
| Aino, restaurants among peers | 323.86 against 158.88, 83%, group of 207 |
| Aino, spender type | Experience-led, stretched |
| Mikko, safe-to-save | 381.63 |
| Mikko, EUR 250,000 home | Required income 3,911.83, largest price 191,000, 33 months |
| Sara, restaurants in September against usual | 1,937.20 against 276.78 |
| Required income divided by loan, all applications | 0.0184086 |

**Safeguard tests.** A reply with a changed number is replaced by the template. An invalid form triggers the fallback parser. The demo script passes with the model stopped.

**Done means:**

- Every story in section 4 that survived the cut order meets its criteria.
- All fixture tests pass.
- The demo script runs three times in a row, offline, from the release APK on the demo phone connected to the demo laptop, without a restart.
- The app is usable with one hand on the demo phone.

## 16. Known limits, risks and open questions

**Risks**

| Risk | Handling |
|---|---|
| A small model on a CPU is slow or misreads questions | Measured at hour 3. Fallback parser and templates cover the demo script. Numbers appear before wording |
| The basket rules are our reading, not S-Bank's | Rules are one table in configuration. The user can move anything. Say so in the pitch |
| Salaries vary 20 to 50% between months and one in five arrives late | Safe-to-spend does not count the next salary. Safe-to-save uses the lowest of six. Late-salary note |
| Extreme single transactions in the data | Medians for usual amounts. The buffer counts each transaction up to EUR 5,000 |
| 218 customers have no housing payments, and some spend very little | Calculations treat missing lines as zero. Demo customers are chosen to be typical |
| Open-data income is annual and before tax | Shown as published and never mixed into calculations |
| Mortgage constants come from 200 synthetic applications | Presented as an estimate from the data, with the disclaimer in M1 |
| Guidance read as regulated advice | T3. No product recommendations. Disclaimer on mortgage card |
| One laptop is a single point of failure | A recorded run of the demo script is kept ready |
| The USB link or `adb reverse` drops during the demo | A spare cable. A script that resets `adb reverse` in one command. The recorded run |
| Android tooling setup eats the first hours | One person owns setup from hour 0. If the phone build is not running by hour 2, use Expo Go with the laptop's hotspot until the development build works |
| Streaming does not work in React Native | `react-native-sse`, checked by hour 2, with the `?stream=false` fallback (section 10) |
| S-Bank would embed a web app, not a separate app | Say in the pitch that the screens are React components and Expo can export them to web later |

**Limits of the data**

- No merchant names, so questions about named shops or about coffee specifically cannot be answered.
- No recurring fixed-amount payments exist, so subscriptions cannot be detected.
- One account per customer. Savings and investments held elsewhere are invisible. 264 customers move salary out every month.

**Open questions, with the default used until someone decides otherwise**

1. ~~Should pharmacy purchases count as regular essentials instead of unexpected necessities?~~ Decided: it depends on the customer's history. Pharmacy purchases are regular essentials for customers who buy at a pharmacy in at least 4 of the 6 reference months, and unexpected necessities otherwise (section 5, rule 7). The basket totals in section 5, the demo figures and the acceptance figures were computed with the old rule and must be recomputed.
2. Should safe-to-spend plan for a late salary instead of only noting it? Default: note only.
3. Should the buffer be a full month's average instead of a share for the days to payday? Default: share for the days.
4. Should the peer group use the full postal code where enough customers exist? Default: first two digits.
5. Is 15% the right default equity share, given approved applications range from 2% to 24%? Default: 15%, user can change.
6. Multi-bank view: the natural next step is a second account for the 264 customers who move salary out. Not specified here.

---

## Appendix A: data profile

| File | Rows | Notes |
|---|---|---|
| `tx_junction_transactions.csv` | 3,626,755 | 363 MB. 2024-10-01 to 2026-09-30. 5,100 customers, one account each, 148 to 1,543 rows per customer (median 700) |
| `tx_customers_junction.csv` | 5,100 | Age 18 to 90 (median 44). 290 postal codes, all starting 00, 01 or 02 |
| `mtg_negotiation_history.csv` | 3,452 | 200 applicants, 12 event types, 2026-01-02 to 2026-09-10. Not used by the app |
| `mtg_tx_customer_link_and_final_mtg_infio.csv` | 200 | Links applicants to customers. 150 approved, 50 rejected (34 collateral, 8 income, 6 equity, 2 existing debt) |

| Category | Transaction type | Rows | Sign |
|---|---|---|---|
| Groceries | purchase | 868,519 | out |
| Restaurants | purchase | 759,280 | out |
| Transportation | purchase | 626,930 | out |
| Utilities | utilities_payment | 342,728 | out |
| Entertainment | purchase | 302,691 | out |
| Health | purchase | 151,912 | out |
| Salary | salary | 121,725 | in |
| Home & Tech | purchase | 115,086 | out |
| Housing | housing_payment | 112,903 | out |
| Lifestyle | purchase | 110,916 | out |
| Travel | purchase | 65,377 | out |
| Invest Deposit | investment_deposit | 35,668 | out |
| Other Income | other_income | 6,299 | in |
| Salary Sweep | salary_sweep | 6,189 | out |
| Invest Withdraw | investment_withdrawal | 532 | in |

Other facts used in this spec:

- 515 merchants, each with exactly one merchant type.
- Every customer has salary. 5,000 have exactly 24 salaries, one per month.
- Housing is paid once a month on days 1 to 8, and the amount changes from month to month.
- Utilities are usually three payments a month.
- 3,526 customers are below zero at some point (lowest EUR -1,985.06). 40% of customer-months have more going out than coming in.
- 1,500 customers make investment deposits, mostly monthly.

## Appendix B: merchant types

| Code | Key | Label | Category |
|---|---|---|---|
| 4111 | `public_transport` | Public transport | Transportation |
| 4121 | `taxi` | Taxi | Transportation |
| 5541 | `fuel_station` | Fuel station | Transportation |
| 5542 | `fuel_pump` | Self-service fuel | Transportation |
| 7523 | `parking` | Parking | Transportation |
| 5411 | `supermarket` | Supermarket | Groceries |
| 5422 | `butcher` | Meat and frozen food | Groceries |
| 5451 | `dairy` | Dairy shop | Groceries |
| 5499 | `convenience` | Convenience and speciality food | Groceries |
| 5812 | `restaurant` | Restaurant | Restaurants |
| 5813 | `bar` | Bar | Restaurants |
| 5814 | `fast_food` | Fast food | Restaurants |
| 7832 | `cinema` | Cinema | Entertainment |
| 7922 | `tickets` | Theatre and event tickets | Entertainment |
| 7991 | `attraction` | Attractions and exhibitions | Entertainment |
| 7996 | `amusement_park` | Amusement park | Entertainment |
| 7999 | `recreation` | Recreation services | Entertainment |
| 5912 | `pharmacy` | Pharmacy | Health |
| 8011 | `doctor` | Doctor | Health |
| 8021 | `dentist` | Dentist | Health |
| 8099 | `medical_other` | Other medical services | Health |
| 5200 | `home_supply` | Home supply store | Home & Tech |
| 5251 | `hardware` | Hardware store | Home & Tech |
| 5712 | `furniture` | Furniture | Home & Tech |
| 5732 | `electronics` | Electronics | Home & Tech |
| 5734 | `software` | Computer software | Home & Tech |
| 5651 | `clothing_family` | Family clothing | Lifestyle |
| 5691 | `clothing` | Clothing | Lifestyle |
| 5941 | `sports` | Sporting goods | Lifestyle |
| 5942 | `books` | Books | Lifestyle |
| 5945 | `hobby_toys` | Hobby, toys and games | Lifestyle |
| 5999 | `retail_other` | Other retail | Lifestyle |
| 4511 | `airline` | Airline | Travel |
| 4722 | `travel_agency` | Travel agency | Travel |
| 7011 | `hotel` | Hotel | Travel |
| 7512 | `car_rental` | Car rental | Travel |
