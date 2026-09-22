# Open questions — what is still missing

Everything that was **not** resolved by writing the [business plan](./business-plan.en.md).
The quality of the idea depends on how honestly this list is maintained, so it gets updated as
answers arrive.

Priority:
- **P0** — without this there is no business (working on anything else is wasted)
- **P1** — needed before a pilot
- **P2** — needed to scale
- **P3** — worth thinking about, no action now

Status: `not started` / `researching` / `hypothesis` / `validated`

---

## A. Does the business exist at all (P0)

| # | Question | Why it is fatal | How to close it | Status |
|---|---|---|---|---|
| A-1 | **What does one redelivery actually cost inside a carrier's books?** | It sets the success-fee price. There is no public figure, and the ¥300 I use is a guess | Ask logistics planners and branch managers directly: "what number do you use internally?" | not started |
| A-2 | **How much does a dynamic destination reduce redelivery?** | No effect, no reason to pay. The 20% is an assumption | Get usage and success-rate data for the existing "change pickup location" features; otherwise measure in a pilot | not started |
| A-3 | **How is the reduction measured and agreed?** | Nobody pays for an improvement they cannot measure | Before/after or area A/B. Agree the method first | not started |
| A-4 | **Who is the first customer, by name?** | Generalities do not move | List carriers and management companies reachable through people I know | not started |
| A-5 | **Do residents actually want this?** | If they will not use it, success rates do not move (the carrier pays, but the resident acts) | 30 responses via the [demo](../app/) feedback tab; measure live at the event | in progress |

---

## B. Customer and demand (P0–P1)

| # | Question | The issue | Status |
|---|---|---|---|
| B-1 | Which segment feels it hardest — single commuters, families with small children, the elderly? | 34.6% single-person households is a big pool, but who inside it is both "often out" and "buys fresh food"? | hypothesis |
| B-2 | Which is stronger: "I want chilled/frozen to arrive reliably" or "I am afraid of theft at the door"? | It changes the first feature (temperature vs. authenticated containment) | not started |
| B-3 | Is "delivered to me while I move" appealing or creepy? | Resistance to location sharing may be far stronger than assumed. This would break the flagship feature | not started |
| B-4 | Is there real demand to delegate receipt to a friend? | Easy to build, unknown whether anyone wants it | not started |
| B-5 | What will a resident pay (probably ¥0)? | If it is ¥0, B2B2C is confirmed — and that is a valuable conclusion in itself | in progress |

---

## C. Product scope (P1)

| # | Question | The issue | Status |
|---|---|---|---|
| C-1 | What do we build and what do we leave to others? | Take only the permission layer, or run lockers too? The latter makes it capital intensive | hypothesis (permission layer only) |
| C-2 | How do we get free-slot data for pickup points? | Lifeline of the Receiving Graph. Need a fallback when locker operators have no API | not started |
| C-3 | Are carriers' "change pickup location" APIs open to third parties? | Decides whether Phase 0 is possible at all. If closed, a partnership is a precondition | not started |
| C-4 | How do we get access to parcel identifiers (tracking numbers)? | Likely by letting the resident connect their carrier accounts with consent | not started |
| C-5 | How does a handover complete with no connectivity? | The grant needs to be a locally verifiable signed token (JWT/COSE-shaped) | hypothesis |
| C-6 | How do existing building parcel boxes get registered as capabilities? | Manual entry by the management company, or automatic detection? | not started |

---

## D. Legal and regulatory (P1 — needs a professional)

| # | Question | The issue | Status |
|---|---|---|---|
| D-1 | **How far can medicine handover be substituted?** | Japanese pharmaceutical law requires a pharmacist's guidance and delivery to the patient or family. Whether locker pickup qualifies needs checking. The demo implements third-party delegation as impossible | hypothesis (unconfirmed) |
| D-2 | **Is sharing location with a carrier lawful?** | Under the Act on the Protection of Personal Information this is third-party provision. Consent mechanics and retention need design | not started |
| D-3 | **What is delegated receipt, legally?** | The nature of agency in receipt; whether carriage terms permit delivery to someone other than the named recipient | not started |
| D-4 | **Is an AI-placed order a valid contract, and who is liable?** | The "the AI ordered it by itself" case. Does a recorded delegation make it valid? | not started |
| D-5 | Liability and insurance for theft at a door or locker | Whose policy covers it; scope of existing carriage insurance | not started |
| D-6 | Food hygiene treatment of a temperature breach | Does having a record exempt you, or does it become the evidence against you? | not started |
| D-7 | Robots entering common areas of a building | Does the management agreement need changing? Relationship to condominium ownership law | not started |

---

## E. Operations (P1–P2)

| # | Question | The issue | Status |
|---|---|---|---|
| E-1 | Who handles exceptions? | "Escalate to a human" is designed, but whose payroll is that human on? A low automation rate loses money on labour | not started |
| E-2 | What automatic-resolution rate do we need? | Above roughly 10% exceptions, operations break `[unverified]` | not started |
| E-3 | What does the SLA measure? | Three candidates: receipt success rate, handover duration, temperature breach rate | hypothesis |
| E-4 | How is support staffed? | Receiving is household infrastructure; failures need a phone number | not started |

---

## F. Technical (P1–P2)

| # | Question | The issue | Status |
|---|---|---|---|
| F-1 | What format is the grant? | Bespoke JSON, or ride an existing standard (OAuth 2.0 Rich Authorization Requests, Verifiable Credentials, W3C DID). **Standards spread faster** | hypothesis |
| F-2 | How are robots and vehicles attested? | mTLS plus device certificates. Who issues them — the carrier, or a third party? | hypothesis |
| F-3 | Tamper resistance of the evidence chain | Are signatures enough, or do we need third-party timestamping? | not started |
| F-4 | How is temperature evidence captured? | Sensor on the parcel or in the compartment — wildly different cost | not started |
| F-5 | What counts as identity verification? | Face match, national ID card, one-time code. How strict does medicine have to be? | not started |

---

## G. Competition and standards (P2)

| # | Question | The issue | Status |
|---|---|---|---|
| G-1 | Will carriers join a cross-carrier platform? | It conflicts with their own app lock-in. How is neutrality guaranteed? | not started |
| G-2 | Who do we standardise with? | Ministry review panels (MLIT, METI), logistics standardisation bodies, an industry consortium | not started |
| G-3 | How do we counter a vertically integrated player like Amazon? | "We can aggregate everyone else" is the only weapon | hypothesis |

---

## H. What *I* am missing (capability, not idea)

Separate from holes in the concept: things I do not have that are needed to move.

| # | Missing | What exactly | How to get it |
|---|---|---|---|
| H-1 | **Access to operational data** | Real redelivery cost; usage of destination-change features | Reach someone inside a logistics operator. Look for them at the event |
| H-2 | **A pilot site** | One area with one carrier, or one building | Through contacts in management companies or developers |
| H-3 | **Legal counsel** | Pharmaceutical law, privacy law, carriage terms | In-house legal, or a lawyer who knows logistics |
| H-4 | **Hardware knowledge** | Real cost of lockers, sensors, robot-side integration | Phase 2 onward. Talk to equipment vendors |
| H-5 | **People to build with** | Someone who knows the logistics floor; someone who can own the hardware side | This is exactly why I am presenting at the event |
| H-6 | **Time** | Has to fit into evenings and weekends | Which is why scope is limited to Phase 0, software only |

---

## I. What is missing for the event itself

| # | To do | Status |
|---|---|---|
| I-1 | QR code and link site for introductions | **Done** ([site](../) / [QR kit](../qr/)) |
| I-2 | A working demo | **Done** ([demo](../app/)) |
| I-3 | A one-page pitch | **Done** ([pitch](../pitch/)) |
| I-4 | Fill in the profile config (name, social URLs) | **Not done** → edit `assets/js/profile-config.js` |
| I-5 | Print the QR (business card + A6 poster, both languages) | Not done → print from the [QR kit](../qr/) |
| I-6 | Rehearse the 30-second and 3-minute spoken pitch, in English | Not started |
| I-7 | Narrow "what I want to ask" down to three questions | Drafted below |

### The three questions to ask people at the event

1. "In the last month, did you miss a delivery and have it actually cost you something?" (is the pain real)
2. "If frozen food had to arrive somewhere other than your home, where would you accept?" (preference among pickup points)
3. (Logistics / real estate) "What number does your company use for the cost of one redelivery?" (**closes A-1**)

---

## Change log

| Date | Change |
|---|---|
| 2026-09-22 | First version. All five P0 items unvalidated |
