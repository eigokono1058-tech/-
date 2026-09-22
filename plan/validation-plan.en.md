# Validation plan — finding out whether anyone actually wants this

Every premise in the [business plan](./business-plan.en.md) is a hypothesis. This file is the procedure
for **trying to break them**.

Principles:

1. **Do not explain the idea.** Ask about past behaviour ("what happened in the last month"), not intent ("would you use this?")
2. **Compliments are not data.** "Interesting!" carries zero information
3. **Take numbers and proper nouns.** Not "sometimes annoying" but "twice last week", "the Yamato redelivery"
4. **A rejection is a success.** Every hypothesis killed early is time returned

---

## 1. Hypotheses, stated so they can fail

| # | Hypothesis | Falsified if… | Method |
|---|---|---|---|
| H1 | Residents have real pain around receiving | Fewer than 5 of 20 can name a specific problem in the last month | Resident interviews |
| H2 | Being able to change the destination mid-delivery has value | Mean intent after using the demo is below 3.0 of 5 | Demo + survey |
| H3 | "Delivered to me while I move" is acceptable | A majority object to sharing location | Demo + survey (Q6) |
| H4 | **Carriers hold a monetary figure for redelivery cost** | Not one of 5 companies can produce a number | Operator interviews |
| H5 | **They are willing to pay for the reduction** | "Even with an effect, there is no mechanism to pay for it" dominates | Operator interviews |
| H6 | Individuals are not the payer | 60%+ of individuals say they would pay — this hypothesis dies, which is a welcome falsification | Survey Q5 |

**If H4 and H5 die, the business does not exist.** They get tested first.

---

## 2. A two-week sprint

| Day | Work | Output |
|---|---|---|
| 1–2 | Watch 5 people I know use the demo, in person, saying nothing | Notes on where they got stuck |
| 3 | Fix only what they got stuck on | — |
| 4–10 | 20 resident interviews, 15 minutes each (the event counts) | 20 records |
| 4–14 | 5 operator interviews, 30–45 minutes each | Real cost per redelivery |
| 14 | Decide: Go / Pivot / Stop | A one-page decision memo |

---

## 3. Resident interview script (15 min)

> Do not describe the idea up front. Save the explanation for the last three minutes.

### Part 1 — past behaviour (7 min). This is the real interview.

1. "How often do you buy things online — times per week?"
2. "**In the last month**, was there a delivery you could not receive?"
   - Yes → "What was it? What did you do? How many attempts did it take?"
   - No → "How are you managing to receive things?" (unattended? at home? someone else there?)
3. "Do you use unattended delivery? Has it ever worried you?"
4. "Do you buy chilled or frozen food online?"
   - No → "Why not?" (**if the reason is receiving, that is a big signal**)
5. "Have you used store or locker pickup? How was it?"
6. "Have you ever changed your plans to be home for a delivery?"

### Part 2 — preferences (3 min)

7. "If frozen food had to arrive somewhere other than home, where would you accept?"
   (convenience store / station / office / a friend's place / handed to you while out)
8. "Which of those is absolutely not acceptable, and why?"

### Part 3 — hand over the demo (4 min)

9. Hand it over and **say nothing**. Watch only these:
   - Where they tap first
   - How they react to a "Denied" verdict (convinced, or confused?)
   - Whether they trigger an exception on their own
   - Their exact words, recorded verbatim
10. Then ask them to fill in the survey on the feedback tab (1 min)

### Part 4 — the last minute

11. "Who around you would this land hardest with?" (leads to referrals)

### Record template

```
Date / profile (household, work pattern, e-commerce frequency)
Missed deliveries last month: count, what kind, what they did
Buys chilled/frozen online: yes/no, why
Acceptable pickup points: / Absolutely not:
Where they got stuck in the demo:
Verbatim quotes (1–2):
Survey response ID:
```

---

## 4. Operator interview script (30–45 min)

Target: carriers (logistics planning, branch operations), building management companies, e-commerce logistics leads.

### For carriers

1. "How do you currently track redelivery volume?"
2. **"What does one redelivery cost, in the number your company uses internally?"** (← A-1, the most important question)
   - If nothing comes back → "Then how many deliveries does one driver make per day, and what share of their time goes to redelivery?" (build it up indirectly)
3. "What are you doing today to reduce redelivery? Is it working?"
4. "How much do customers actually use the change-pickup-location feature?"
5. "What share is unattended delivery? How many theft claims or complaints?"
6. "How does the failure rate for chilled/frozen compare to ambient?"
7. "Any objection to depositing a parcel in another company's locker or store?" (cross-carrier acceptance)
8. "If redelivery dropped, whose numbers would improve?" (who owns the budget)
9. "Who decides, in what order, when you adopt something new?"
10. "How does your organisation read the projected 34% freight capacity shortfall in 2030?"

### For building management and real estate

1. "How many parcel boxes do you have, and how often are they full?"
2. "What requests and complaints do residents raise about deliveries?"
3. "How do you currently manage carriers entering the building?"
4. "What are the management-agreement issues with a delivery robot in common areas?"
5. "As a resident-facing service, how much per month could come out of the management fee?"
6. "Who makes the capex decision — the owners' association, the developer, or you?"

---

## 5. Using the demo as an instrument

The [demo](../app/) is not a slide deck, it is a **measuring device**. Watch four things.

| Observation | What it tells you |
|---|---|
| The first pickup point they choose | Their real preference — more reliable than what they say |
| Their reaction to a "Denied" verdict | Whether the constraints (temperature, identity) match intuition |
| Where they set the autonomy level | Tolerance for delegating to AI. Anyone choosing L4 has not absorbed the risk argument |
| Whether they trigger an exception themselves | Interest in exception design. People who dig here are operators |

Responses collected in the feedback tab get **exported as CSV/JSON** after the event and analysed
outside this repository. Note: responses live in that browser's localStorage, so
**hand your own device to people** rather than asking them to open it on theirs.

### Collecting responses on a server instead

Add one line to `app/index.html`:

```html
<script>window.LM_SURVEY_ENDPOINT = "https://example.com/collect";</script>
```

A Google Form endpoint or something like Formspree will do. Saving to localStorage always happens
regardless, so a weak signal at the venue never loses an answer.

---

## 6. Decision criteria (Day 14)

| Result | Decision |
|---|---|
| H4 (real cost exists) and H5 (willingness to pay) both hold | **Go**: design the pilot |
| H4 holds but H5 fails (effect exists, no mechanism to pay) | **Pivot**: move the payer to building / real-estate SaaS |
| H1 fails (residents have no pain) | **Stop**: the premise is wrong. Look for a different AI-agent × logistics touchpoint |
| H2 fails (no value in dynamic destinations) | **Pivot**: the value may be in permissions and evidence. Push toward B2B audit use cases |
| H3 fails (location sharing rejected) | **Narrow**: drop "delivery to a moving person", keep rerouting between fixed hubs |

---

## 7. Explicitly not doing this yet

- Locker or robot hardware development
- Indoor delivery (rejected as a design choice)
- A national rollout plan
- A detailed financial model (meaningless while the premises are unvalidated)
- Patents or incorporating (validation comes first)
