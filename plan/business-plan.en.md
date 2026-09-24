# DELIVERY OS — Business Plan (v0.1)

> When AI and robots acting autonomously becomes ordinary, how do we redesign the work,
> systems, buildings and infrastructure that were all built around humans?
> I am attacking that question from the place where it physically jams: receiving a parcel.

- Written: 2026-09-22
- Status: **draft, unvalidated.** Numbers without a cited source are assumptions and are marked `[unverified]`
- See also: [Open questions](./open-questions.en.md) · [Validation plan](./validation-plan.en.md) · [Live demo](../app/) · [Pitch](../pitch/)

---

## 0. Executive summary

| | |
|---|---|
| In one line | An orchestration layer that moves **receiving from "a human is home" to "a system manages permissions"** |
| The problem | Delivery can be automated; receiving still assumes someone is home. That is the last bottleneck |
| First customers | **Carriers** (cut redelivery cost) and **buildings / real estate** (utilisation and differentiation). Residents pay nothing |
| Revenue | Success fee per redelivery avoided, plus SaaS on the receiving infrastructure |
| Moat | Not the box (lockers, robots) but the **layer that decides who may receive what, where, and for how long** |
| Built so far | A working [prototype](../app/) with dynamic destinations, a policy engine, receipt grants and exception escalation |
| Next 90 days | Test who actually pays: 20 resident interviews, 5 carrier / real-estate interviews |

**The thing I am least sure about, stated first:** individuals are unlikely to pay for "receiving is
annoying." So the whole business rests on whether this **measurably cuts a carrier's redelivery cost**.
If that falls, the business falls. The next 90 days test only that.

---

## 1. The premise — what happens when AI does the ordering

What is arriving now is AI that judges on a human's behalf and then *acts*. In a household:

```
Fridge and pantry track stock
  → AI decides something is missing
  → AI picks the product
  → AI orders and pays            ← all of this is close to fully automatable
  → the goods physically travel to your home
  → ???                           ← who receives them?
  → stored in the home
```

Humans are not virtual. Our bodies have not changed in tens of thousands of years, so food, water and
medicine must arrive **as physical objects**. Which means: **the more the deciding and ordering is
automated, the more volume flows through the physical touchpoint — delivery and receipt.**

Lower friction in ordering means more frequent orders, smaller baskets, more parcels. Keep today's
receiving model — a human at home, in person — and every gain in automation lands as load on logistics.

### 1.1 Current solutions automate delivery, not receiving

Replacing the driver with a robot or a drone does not finish the job:

```
AI order → automated warehouse → robot/drone → arrives at the building → ??? → into the fridge
```

Past the "last mile" sit the **last few meters**: getting into the building, the handover itself,
carrying goods inside. That is not a technology problem. It is a **permissions and liability** problem.

---

## 2. The problem, in numbers

None of this starts with AI. It is already happening.

| Metric | Value | Source / year |
|---|---|---|
| Parcels handled per year (Japan) | approx. **5.0 billion** | MLIT (both FY2023 and FY2024 ≈ 5.0bn) |
| Redelivery rate | **8.3%** (Oct 2025), 8.4% (Apr 2025) | MLIT sample survey, twice a year |
| Change since Oct 2022 | **▼2.2 points** | ibid. |
| Labour spent on redelivery | approx. **180 million hours/year** ≈ **90,000 drivers** | MLIT estimate (2015) |
| CO₂ from redelivery | **254,000 tonnes/year** | MLIT estimate (FY2020) |
| Freight capacity shortfall, FY2030 | approx. **34%** (~900m tonnes) | MLIT sustainable logistics review |
| Condominium stock | approx. **7.13 million units** (end 2024) | MLIT |
| Of which 40+ years old | approx. **1.48 million units** (~20%) | ibid. |
| Single-person households | **18.99 million / 34.6%** (2024) | MHLW Comprehensive Survey of Living Conditions |
| Single-person households, 2050 | **44.3%** projected | NIPSSR |
| PUDO parcel lockers | approx. **6,000 locations** (Mar 2025) | Packcity Japan |

### 2.1 How to read "8.3%"

The rate is genuinely falling — from over 11% to 8.3% — because unattended delivery became standard.
But that is **the problem being pushed into the doorway**, not solved.

- 5.0bn × 8.3% ≈ **400 million parcels a year** are still redelivered
- At an assumed **¥300** of direct cost per redelivery, that is roughly **¥120bn a year** wasted `[unverified]`
  - assumption: driver + vehicle ≈ ¥3,000/hour, ~10 redeliveries per hour
- What moved to the doorstep **transferred theft, damage and privacy risk onto the resident**
- Chilled and frozen goods cannot be left at all, so **they sit outside this improvement curve entirely**

> The remaining problem is not "drive redelivery to zero." It is
> **handing over what cannot be left at a door — chilled, frozen, medicine, high value — when nobody is home.**
> And those are precisely the repeat-purchase goods an AI agent will order.

### 2.2 Pain by stakeholder

| Who | Pain | Economic weight | Decision maker |
|---|---|---|---|
| Residents | Out during the day; cold-chain windows; rescheduling; theft at the door | Mostly **time and hassle** — hard to price | The individual |
| Carriers | Redelivery labour, driver shortage, smaller parcels, falling efficiency | **Direct cost** (a share of that ¥120bn) `[unverified]` | Logistics planning, branch to HQ |
| Retail / e-commerce | Delivery cost; delivery quality moves conversion and churn | Indirect revenue and margin | Head of e-commerce |
| Buildings / real estate | Too few parcel boxes; controlling carrier access; resident-facing differentiation | Capex and asset value | Management company, developer, owners' association |
| Locker operators | Utilisation; securing sites | Payback period | Business owner |

**The key point:** the person in pain, the person using the service, the person installing hardware and
the person paying are not the same. A carrier's redelivery cost is a bigger *economic* pain than a
resident's inconvenience. **So the first paying customer is not the resident.**

---

## 3. The hypothesis — the thing to fix is permission, not transport

### 3.1 Core hypothesis

> Receiving fails not because physical capacity is missing, but because
> **there is no mechanism that dynamically decides who may receive what, where and when.**

Today the destination is frozen at order time into a static string: an address. So when the person
moves, it breaks. Invert that — make the destination **a permissioned place or person** — and the
success rate rises *without building anything new*.

### 3.2 What the target state looks like

- Collect it while you happen to be in a taxi
- Collect it at a convenience store or a station locker
- Collect it at the office
- Share a temporary code so a friend or family member can collect it
- **Have it delivered to you while you are moving** — to a person, not an address
- Say "receive here" by dropping a pin on a map, the same gesture you already use to say
  "pick me up here" in a ride-hailing app — and let the pin follow you while you walk

Each of these exists in isolation already (store pickup, locker pickup, doorstep instructions).
What is missing is **the layer that switches between them safely, instantly and automatically, mid-delivery.**

### 3.3 Deleting the idea that you must receive at home

Another answer is a humanoid robot that receives for you. But that means **handing the robot the right
to unlock your door**. Overpower or spoof the robot and trespass follows for free.

> So this project deliberately **does not grant indoor access**.
> It bets on removing the premise that receiving must happen at home.

That is not a product limitation; it is a stated design choice — which is why autonomy level L4 is
disabled by default in the demo.

---

## 4. The product — a receiving orchestration layer

Take the control layer in front of the box, not the box itself.

### 4.1 Three components

#### ① Receipt Grant — an access token for the physical world

Exactly as you hand an AI agent a scoped tool permission, this issues a physical right to receive with
least privilege and an expiry.

```json
{
  "grant_id": "rdg_8f21c7",
  "grantee": { "type": "delivery_robot", "id": "wm-tky-0473",
               "attestation": "mTLS + device_cert(verified)" },
  "order":   { "id": "ord_0031", "temp_class": "frozen", "value_jpy": 4280 },
  "place":   { "type": "locker", "id": "hub_station_04", "radius_m": 8 },
  "window":  { "from": "18:10", "to": "18:40" },
  "conditions": ["one_time_code", "temp_chain>=-18C", "photo_evidence"],
  "scope":   ["open:bay_A3"],
  "not_granted": ["unlock:entrance", "read:order_history",
                  "locate:subject_after_handover"],
  "revocable": true
}
```

The point is `not_granted`. **Being able to state what was withheld is the value of this layer.**

#### ② Receiving Graph — pickup points as capabilities

Model every point by what it can actually do:

- Temperature: ambient / chilled / frozen
- Authentication: identity check, signature, code only
- Containment: locked, staffed, indoors
- Dynamic: the location moves (a person, a vehicle)
- Capacity: free slots, in real time

A convenience store, a station locker, a building's parcel box, an office, a friend's home and the
recipient in transit all sit **behind one interface**. Nothing has to be built for them to become nodes.

#### ③ Handoff Protocol — custody transfer, evidenced

Record the handover as a **transfer of custody**, not as "dropped off / picked up".

```
DEVICE_AUTH → GRANT_CHECK → (IDENTITY / OTP) → TEMP_EVIDENCE
→ UNLOCK (scope only) → CUSTODY_TRANSFER → GRANT_EXPIRED
```

Every event is signed. That chain is the foundation for the liability model below.

### 4.2 Why start with software

Retrofitting existing homes with robot ports or three-zone lockers takes real capex. The honest answer
to **"would an individual invest that just to receive parcels automatically?"** is no.

So invert the order:

| Phase | What ships | Capex | Hypothesis under test |
|---|---|---|---|
| **0** | Orchestrate existing stores, station lockers and building boxes; allow the destination to change mid-delivery | **Zero** (API integration) | Does dynamic switching alone cut redelivery? |
| **1** | Dynamic rendezvous — delivery to a moving person or a delegate | Zero to low | Is there real demand to deliver to a *person*? |
| **2** | Machine-to-machine handover with delivery robots (grant unlocks a compartment) | Medium (site side) | Does M2M handover actually lower cost? |
| **3** | Carrying goods indoors | High | **Not doing it** — permission risk exceeds the gain |

If Phase 0 does not make money, there is no reason to reach Phase 2.

---

## 5. Business model — who pays, and for what

### 5.1 Three billing options

| Option | Payer | Basis | Unit | Verdict |
|---|---|---|---|---|
| **A. Success fee** | Carrier | One redelivery avoided | **¥100/event** (a third of the ¥300 saved) `[unverified]` | ◎ Effect and invoice line up. Start here |
| **B. Infrastructure SaaS** | Building management, locker operators | Utilisation and access control | ¥3,000–10,000 per building per month `[unverified]` | ○ Small ticket, but sticky |
| **C. Metered API** | Retail / e-commerce | Delivery success rate, conversion | ¥10–30 per delivery `[unverified]` | △ Hard to attribute the effect |

**Residents pay nothing.** They are not the payer; they are the participant who makes delivery succeed.

### 5.2 Unit economics (rough, `[unverified]`)

```
Assume: one mid-sized carrier, 30m parcels/year in the target area
        redelivery rate 8.3% → 2.49m redeliveries/year
        20% reduction with this service → 498k avoided/year
        ¥300 direct cost per redelivery → ¥149m saved/year
        success fee at one third → ¥49.8m/year from one carrier
```

Only three things decide whether this is real:

1. The **actual internal cost** of one redelivery (and who books it where)
2. **How much** dynamic destinations reduce redelivery
3. **How the reduction is measured and agreed** — nobody pays for an unmeasurable improvement

Those are the centre of the [validation plan](./validation-plan.en.md).

### 5.3 Market sizing (bottom-up, `[unverified]`)

| Layer | Calculation | Size |
|---|---|---|
| TAM (waste in redelivery) | 400m events × ¥300 | ~**¥120bn/year** |
| SAM (what this can address) | TAM × 20% reduction | ~**¥24bn/year** |
| SOM (realistic in 3 years) | SAM × 10% | ~**¥2.4bn/year** |
| Adjacent (infrastructure SaaS) | Share of 7.13m condominium units under management × monthly fee | Needs separate build-up |

---

## 6. Governance — how much to automate, and where humans stay

Structurally identical to guardrail design for AI agents. **Full automation is not the goal.**

| Level | Behaviour | Where it fits |
|---|---|---|
| L0 Manual | A human decides and receives | Delivery today |
| L1 Suggest only | AI proposes, human approves every time | Early adoption |
| L2 Low risk automated | Ambient and low value only | Household subscriptions |
| **L3 Humans on exceptions** (recommended) | Happy path autonomous, exceptions escalate | **The default** |
| L4 Indoor access delegated | Door unlocking and indoor carry | **Rejected** (see 3.3) |

Concrete decision points:

```
Check stock                  → automatic
Order a low-value item       → automatic
Order a high-value item      → human approval
Travel on public roads       → automatic
Deposit into a shared locker → automatic
Change the destination       → automatic, but must pass the policy engine
Hand over ID-required goods  → human (the recipient)
Enter the home               → never granted
```

---

## 7. Liability — who is responsible when it goes wrong

The more automation, the more this decides whether the business survives. It is a contract and rules
problem, not a technical one.

| Segment | Liable party | Main risk |
|---|---|---|
| Order | User / delegated AI agent | Wrong or excess orders |
| Fulfilment | Retailer | Wrong item, missing item, damage |
| Transport | Carrier / robot operator | Delay, damage, accidents |
| Handover | Pickup point operator | Theft, failed auth, temperature breach |
| Storage | User | Loss or spoilage after pickup |

### 7.1 Separating "delivered" from "handed over"

Unattended delivery today blurs these two and ends at "delivered", which is exactly why nobody can be
held responsible for a theft.

Here, **the handover completes when the CUSTODY_TRANSFER event succeeds**, and the conditions at that
moment — who, which authentication, what temperature, which evidence — are signed and stored.

- A temperature breach is attributable to a custody segment → the site operator
- A record of an unlock without authentication → the carrier
- Loss after pickup → the user

**Liability boundaries are decided by the granularity of the record.** That is why evidence design sits
at the centre of the product.

### 7.2 Who is liable for an AI's mistaken order

Liability for "the AI ordered it by itself" turns on **whether the delegation was recorded**. The
delegation of *ordering* authority therefore needs the same treatment as a grant (in the demo it shows
as `ordered_by: ai_agent(delegated)`). The legal analysis is not done — see
[open questions](./open-questions.en.md).

---

## 8. Exception design — this is the actual product

Automating the happy path (detect → order → deliver → receive → store) is the easy part.
**Value shows up in how fast exceptions are resolved.**

| Exception | Automatic | Back to a human |
|---|---|---|
| Locker full | Reroute to a nearby hub, revoke and reissue the grant | Offer candidates and let the user pick (L2 and below) |
| Auth failed 3× | — | **Always human.** Retries must never defeat authentication |
| Freezer failure | Log the breach, stop the delivery | Decide return vs. refund |
| Comms loss | The grant expires; permission dies on its own (fail-safe) | Dispatch someone on site |
| Robot attacked | Keep everything locked, revoke instantly, keep broadcasting location, preserve evidence | Halt, call police, notify shipper |
| Recipient away for a week | Move to a chilled hub before the deadline; propose a delegate | Extend storage or return |

Principles:

1. **Permissions expire.** When the network dies, *not opening* is the correct behaviour
2. **Failed authentication is never defeated by retrying.** Failure counts go to a human
3. **Overpowering the robot must not yield the contents or the keys to a home**
4. **Most exceptions are deadlines expiring.** Deadline design drives operating cost

---

## 9. Why now

| Shift | What changed |
|---|---|
| Labour cliff | Freight capacity projected ~34% short by FY2030. Cutting redelivery moved from cost saving to business continuity |
| Unattended delivery standardised | It became the institutional default — and its side effects (theft, privacy) surfaced |
| Regulation | Since April 2023, delivery robots may run on public sidewalks under a notification regime as "remote-controlled small vehicles" (≤120×70×120cm, ≤6km/h). In February 2025 a METI working group began examining higher-capacity robots |
| AI agents in production | Ordering and payment by AI became realistic, which makes **receiving the relative bottleneck** |
| Household structure | Single-person households at 34.6% (2024), projected 44.3% by 2050. "Nobody home" becomes the norm |

**What matters in the AI era is not replacing a step with a model, but redesigning the process on the
assumption that AI acts autonomously.** That is already happening in IT operations, and the same shape
propagates into the physical world.

```
IT operations: sense → reason → act → guardrail → supervise
Logistics:     sense → decide → order → move → access → hand over → store
```

Both are the same design problem: who executes, how far autonomy extends, who supervises, who is liable.

---

## 10. Competition and positioning

| Player | What they do | Relationship |
|---|---|---|
| PUDO (Packcity Japan) | Carrier-neutral open lockers, ~6,000 sites | **A node, not a competitor.** Goes into the Receiving Graph |
| Convenience store pickup | In-store collection | Same |
| Amazon Hub / lockers | A vertically integrated network | The counter-axis. We aggregate everything outside the walled garden |
| Carrier apps (Yamato, Sagawa, Japan Post) | Change pickup for their own parcels | **Fragmented per carrier** — which is the opportunity |
| Doorstep bags (e.g. OKIPPA) | Light containment at the door | Ambient only; solves neither cold chain nor identity |
| Delivery robot companies | Automating the travel itself | **Complementary.** We own permission and handover after arrival |
| Building parcel boxes | Ambient, fixed capacity | We absorb the "full" case by rerouting |

**The core differentiation:** while everyone competes to install more of their own boxes,
**nobody holds the layer that issues and revokes receiving permissions across carriers and sites.**
That is the IdP position of this market — once it becomes the standard, replacement cost is high.

---

## 11. Risks

| Risk | Severity | Response |
|---|---|---|
| Carriers lock customers into their own apps | High | Make cross-carrier the value itself: aggregate what no single carrier can |
| No agreement on measurement, so success fees never work | High | Bring an A/B-capable measurement design on day one; switch to a flat fee if it cannot be measured |
| Abuse of permissions, impersonation | High | Least privilege, time boxes, revocation, signed events. Never touch indoor access |
| Location privacy | Medium | Location exposed only in a short window before pickup, revoked on handover (`ephemeral_location`) |
| Site APIs are closed | Medium | Phase 0 orchestrates carriers' existing "change pickup location" features |
| Regulation (pharmaceutical law, food hygiene, carriage terms) | Medium | Third-party delegation of medicine is implemented as **legally impossible**; needs legal confirmation |
| Liability for AI-placed orders is unsettled | Medium | Treat ordering authority as a recorded grant. Legal analysis outstanding |

---

## 12. 90-day roadmap

| Window | Work | Exit criteria |
|---|---|---|
| Day 1–14 | Put the prototype in front of people, collect intent and willingness to pay (the demo's feedback tab) | 30+ valid responses; intent readable by role |
| Day 15–45 | Interview 5 carriers / real-estate companies | A real internal cost per redelivery from 2+ of them |
| Day 46–60 | Agree a measurement design with one of them | One signed-off memo on how the reduction is measured |
| Day 61–90 | Design a pilot for one area and one carrier (existing lockers + destination change only) | An LOI or a clear statement of intent to pilot |

**Kill criterion:** if nobody produces a real cost per redelivery by Day 45, there is no basis for
charging — rebuild the premise rather than continue.

---

## 13. The four questions at the centre

What I ultimately care about is not how to build a delivery robot, but how to redesign infrastructure.

| # | Question | Working answer |
|---|---|---|
| ① **Pain** | Where is the pain big enough to justify investment, and who holds it? | Not the resident's inconvenience but the carrier's redelivery cost — though the real number is unconfirmed |
| ② **Process** | How should the logistics process itself be redesigned for AI and robots? | Destination moves from a static address to a permissioned, dynamic point. Human-to-human becomes machine-to-machine |
| ③ **Governance** | How much runs autonomously, and where do human approval and oversight remain? | L3 (humans on exceptions) as default. Indoor access is never delegated |
| ④ **Responsibility** | With several AIs and robots involved, where does liability divide? | At the custody-transfer event, cut by fine-grained signed evidence |

Details of what remains unanswered live in [open-questions.en.md](./open-questions.en.md).
