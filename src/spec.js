// Spec callouts (04-feature-spec.md §6.2) — shown by the presenter bar's “Changes” toggle
window.SPEC = {
 "overview": {
  "title": "S0 · Overview",
  "items": [
   {
    "n": 1,
    "sel": {
     "text": [
      "b",
      "Runs"
     ]
    },
    "label": "Runs card",
    "today": "—",
    "proposed": "Run status tag + one line (“No runs yet. Accepting an action starts one tonight.” / “1 run in progress on ‹action›”) + Go to Actions →.",
    "why": "The account owner lands here; one line says whether anything is being done. Nothing else on the page changes."
   }
  ],
  "notes": [
   "Optional in the demo — this is the “before” picture the panel already knows."
  ]
 },
 "actions": {
  "title": "S1 · Actions list",
  "items": [
   {
    "n": 1,
    "sel": {
     "css": "label.chip:has(select[data-f=status])"
    },
    "label": "Status filter",
    "today": "New · In progress · Done · Declined",
    "proposed": "New · Accepted · Scheduled · Running · Waiting for review · Waiting to publish · Watching · Done · Declined. Default hides Declined.",
    "why": "“Where is it stuck?” — In progress cannot answer it."
   },
   {
    "n": 2,
    "sel": {
     "css": "label.chip:has(select[data-f=type])"
    },
    "label": "Filters",
    "today": "One “All filters” menu",
    "proposed": "Visible dropdowns: Type (what-to-do group) · Target (Owned / Earned) · Impact · Sort, plus search. All persist in the URL.",
    "why": "Daily working tool once actions move; a URL view can be shared. UX opinion, reversible."
   },
   {
    "n": 4,
    "sel": {
     "css": ".card .hd .tag.blue"
    },
    "label": "Runs column",
    "today": "—",
    "proposed": "Per row: run status tag, or “No run yet · N days old” for accepted-and-idle actions; “—” for types that cannot run.",
    "why": "Makes the doing visible in the queue; “4 days old” is the nudge."
   },
   {
    "n": 6,
    "sel": {
     "css": "#acceptall"
    },
    "label": "Accept all",
    "today": "Accepts everything silently",
    "proposed": "Confirm box: “Runs start tonight for 1 (the content brief); 7 optimisation + 13 technical accepted but wait for the next release; 17 earned never run.”",
    "why": "Bulk accept now has consequences (runs, budget); the box states them."
   },
   {
    "n": 7,
    "sel": {
     "css": "#declineall"
    },
    "label": "Decline all",
    "today": "Declines everything",
    "proposed": "Same confirm pattern; declined actions move to the Declined filter with Undo.",
    "why": "Reversibility."
   },
   {
    "n": 8,
    "sel": {
     "css": "#tip1"
    },
    "label": "First-run tooltip",
    "today": "“Open an action…” tour",
    "proposed": "“Accepting an action starts a run tonight. Or start one now from the action.”",
    "why": "Peec already introduces behaviour with tour tooltips — reuse the pattern."
   },
   {
    "n": 9,
    "sel": {
     "css": ".row.hl"
    },
    "label": "Content brief row",
    "today": "As others",
    "proposed": "Highlighted as the demo anchor (prototype only).",
    "why": "Demo device, not product."
   }
  ],
  "notes": [
   "Unchanged: Group by (What to do / Owned–Earned / Topic), the three stat cards, + Add content.",
   "Open: keep “In progress” as an umbrella in the filter, or replace it with the run states (prototype replaces it)."
  ]
 },
 "action": {
  "title": "S2 · Action detail — the content brief",
  "items": [
   {
    "n": 1,
    "sel": {
     "css": "#acceptrun"
    },
    "label": "Header buttons",
    "today": "Decline · Accept",
    "proposed": "Decline · Accept · Accept & run now. After Accept: tag “Scheduled · tonight 02:00” + Run now. After Decline: “Declined” + Undo. During a run: Open the run →.",
    "why": "Three intents: no; yes, tonight; yes, now. Tonight is default — the baseline is freshest after the daily prompt run."
   },
   {
    "n": 2,
    "sel": {
     "css": ".content > div:first-child"
    },
    "label": "Status banner (after a decision)",
    "today": "—",
    "proposed": "One-line card per state: Scheduled · Scheduled by policy · Declined · Runs paused (link to settings).",
    "why": "The action page is where a person checks “what will happen now?”."
   },
   {
    "n": 3,
    "sel": {
     "css": ".kv > div:nth-child(4)"
    },
    "label": "Run field",
    "today": "—",
    "proposed": "“Run” added to the meta row (Topic · Models · Relative impact · Run) with the run tag.",
    "why": "Same information as the list column, in place."
   },
   {
    "n": 4,
    "sel": {
     "css": ".card:has(.prompt)"
    },
    "label": "Prompts to answer",
    "today": "Count + link (“Prompts to answer 20 ›”)",
    "proposed": "Inline table of the 20 prompts with today’s visibility and position per prompt (real, via get_brand_report); red under 35%, dark red at 0%. First-run tooltip on the six red prompts.",
    "why": "The evidence that makes Accept urgent, and the baseline the run is measured against."
   },
   {
    "n": 5,
    "sel": {
     "css": ".brief .bh .pill-btn"
    },
    "label": "The brief card",
    "today": "“Work with Agent” split button",
    "proposed": "Unchanged — Work with Agent stays for people who want to stay in chat (on-demand trigger).",
    "why": "Don’t remove a working path."
   },
   {
    "n": 6,
    "sel": {
     "text": [
      "div",
      "Required input"
     ]
    },
    "label": "Required input",
    "today": "Listed inside the brief text",
    "proposed": "Its own labelled block (“Required input — confirm with product team”) because the run will ask for it.",
    "why": "The one thing only a human can supply must be visible before Accept, not discovered mid-run."
   }
  ],
  "notes": [
   "7 · Non-brief actions (technical, optimisation, earned): same panel, Decline/Accept only, plus one line on what a run would and would not do for that type."
  ]
 },
 "run": {
  "title": "S3 · The run",
  "items": [
   {
    "n": 1,
    "sel": {
     "css": "#cancel"
    },
    "label": "Header",
    "today": "— (no page today)",
    "proposed": "‹ Action · run status tag · ↻ Resume (when paused/failed) · ✕ Cancel run. Meta: “Run started · N steps · Auto-approve: off · budget: 12% of month”.",
    "why": "Same vocabulary as Agent chat; the person can always stop it."
   },
   {
    "n": 2,
    "sel": {
     "css": ".runlog .hdr"
    },
    "label": "Run log",
    "today": "Agent chat’s “10 steps ⌄” collapsible",
    "proposed": "Steps tick in on a timer, each naming the tool or skill it used (get_action, get_brand_report, list_chats · get_chat, list_search_queries, get_url_content × 5, get_project_profile · list_facts, /draft-the-content, /optimize-your-content) and one line of result; grey narration between phases; ends at “Checkpoint: waiting for review”.",
    "why": "The panel must recognise every tool as their own: proof that the runner is their harness scheduled, not a new AI. Also the audit trail."
   },
   {
    "n": 3,
    "sel": {
     "css": ".plan .hd"
    },
    "label": "Plan card",
    "today": "—",
    "proposed": "Fills as steps complete: Brief · Baseline · Today’s answer · Engine is searching for · Studied · Voice · Structure · Needs a human · Draft · Citation-readiness · Claims · → review.",
    "why": "The reasoning at a glance without reading the log."
   },
   {
    "n": 4,
    "sel": {
     "css": "#inputcard"
    },
    "label": "Required-input card",
    "today": "—",
    "proposed": "Text field + “Use this answer”. Answer now, at review, or never — the run doesn’t block. Answering replaces the placeholder and moves one claim from confirm to sourced.",
    "why": "Never invent expert facts; never block on a human who is away."
   },
   {
    "n": 5,
    "sel": {
     "css": "#runtag"
    },
    "label": "Run states",
    "today": "—",
    "proposed": "Running · Paused (budget / kill switch; resumes from the same step) · Failed (tool error; Resume retries) · Cancelled (reason; action returns to Accepted). Revision runs: 3 steps to a v2.",
    "why": "Every failure mode has a visible state and a way back; nothing is written outside Peec before review."
   },
   {
    "n": 6,
    "sel": {
     "text": [
      "b",
      "Decisions"
     ]
    },
    "label": "Decisions card",
    "today": "—",
    "proposed": "Every human/system decision with actor and time, on every screen of the run.",
    "why": "Traceability."
   }
  ],
  "notes": []
 },
 "review": {
  "title": "S4 · Review request",
  "items": [
   {
    "n": 1,
    "sel": {
     "css": ".mail .mh"
    },
    "label": "Message header",
    "today": "— (a brief link, maybe)",
    "proposed": "To / From / subject “Review a draft: ‹H1›”, a two-line summary, and five numbers: 3 sections · 14 questions in prose, 4 in FAQ · 24/27 claims sourced · 1 to confirm · citation-readiness 82/100.",
    "why": "The reviewer’s first question is “why me, and how much work?” — answered in five numbers."
   },
   {
    "n": 2,
    "sel": {
     "css": "#approve"
    },
    "label": "Buttons",
    "today": "—",
    "proposed": "✓ Approve · ✎ Edit & approve · ↩ Send back (note → run revises → v2 with change summary) · ✕ Decline (reason → run cancelled, action back to Accepted).",
    "why": "Four outcomes cover every reviewer intent; Send back is unbounded."
   },
   {
    "n": 3,
    "sel": {
     "css": ".review .doc"
    },
    "label": "The draft",
    "today": "—",
    "proposed": "Brief left, draft right: H1, meta, three H2s each opening with a citation-ready chunk, FAQ, JSON-LD. Every factual sentence marked green = sourced (hover shows source) or amber = confirm; never-write terms enforced.",
    "why": "Reviewers check claims, not prose; colour makes the three unconfirmed sentences findable in seconds."
   },
   {
    "n": 4,
    "sel": {
     "css": "#edit"
    },
    "label": "Edit & approve",
    "today": "—",
    "proposed": "Draft becomes editable in place; approving records “edited by …” and lands the edited text.",
    "why": "Small fixes must not cost a round-trip through the runner."
   },
   {
    "n": 6,
    "sel": {
     "css": ".mail .mh .tag"
    },
    "label": "Where it lives",
    "today": "Reviewer would need a Peec seat",
    "proposed": "Email/Slack card links here; the page works without a seat (signed link, run-scoped).",
    "why": "The TAM screen: the person doing the work never becomes a Peec user, and doesn’t need to."
   }
  ],
  "notes": [
   "5 · Stale: reminder after 3 days; after 14 days the run parks as Stale (red), the accepter can approve, reassign to me, or cancel.",
   "Out of release 1: auto-approving drafts (needs the eval in 06)."
  ]
 },
 "handoff": {
  "title": "S5 · Hand-off and the wait",
  "items": [
   {
    "n": 1,
    "sel": {
     "css": "#steps2"
    },
    "label": "Run log continues",
    "today": "A person publishes somewhere and later clicks Done",
    "proposed": "Landed the approved draft (Google Docs, link on the action) · Marked the action’s steps as covered (update_action_steps — the only write inside Peec) · Baseline frozen (get_brand_report, 20 prompts × 3 engines) · Waiting to publish (checking daily; nudge after 7 days).",
    "why": "Each line is a promise about what the runner does and does not touch; freezing the baseline is what makes day 30 honest."
   },
   {
    "n": 2,
    "sel": {
     "css": "#marklive"
    },
    "label": "“Tell the run the page is live”",
    "today": "Nothing links the action to a URL",
    "proposed": "URL field + Mark as live. Also automatic: the URL appears in Crawl Insights / Sources (“found by Peec”), or a CMS webhook later.",
    "why": "The Live checkpoint is a system fact, never a Done click. Publishing stays the customer’s act in release 1."
   },
   {
    "n": 4,
    "sel": {
     "text": [
      "div",
      "nudges the owner once"
     ]
    },
    "label": "Nudge rule",
    "today": "—",
    "proposed": "Day 7 without a URL: one nudge, status “Waiting to publish · nudged”, no further nudges; the run keeps checking daily.",
    "why": "Persistent without nagging."
   },
   {
    "n": 5,
    "sel": {
     "css": "#jump"
    },
    "label": "Demo control",
    "today": "—",
    "proposed": "“Jump to day 30” styled as a demo control, not product.",
    "why": "Presenter shortcut."
   }
  ],
  "notes": [
   "3 · Destination not configured: one-time setup card (Google Docs · WordPress · Webflow · GitHub PR · Linear ticket · download .docx meanwhile); set per project in AI settings."
  ]
 },
 "report": {
  "title": "S6 · The report — day 30",
  "items": [
   {
    "n": 1,
    "sel": {
     "css": ".detail-hd .tag.ill"
    },
    "label": "Header",
    "today": "Impact tab: markers on a chart; Action tracker empty",
    "proposed": "‹ Action · run tag (Watching · day 30) · Illustrative tag · Day 7 / Day 30 toggle · Start over (demo control).",
    "why": "Every post-publish number in the prototype is invented — labelled, always."
   },
   {
    "n": 2,
    "sel": {
     "css": ".mail .mb"
    },
    "label": "Summary sentence",
    "today": "—",
    "proposed": "Plain prose: published when, fetched by whom (and not), retrieved n/20, cited n, target prompts 66% → 74% per engine, sessions arrived.",
    "why": "The sentence customer #10 asked for; it names the cause of what didn’t move."
   },
   {
    "n": 3,
    "sel": {
     "css": ".chain"
    },
    "label": "Verify chain",
    "today": "Evidence split across Crawl Insights, Sources, AI Referrals",
    "proposed": "Six tiles left to right: Published → Fetched by → Retrieved → Cited → Target prompts → AI referrals. Border green = happened, amber = attention, plain = neutral.",
    "why": "The causal argument in order: a page can only move prompts if fetched, only be cited if retrieved. Where the chain breaks tells you what to fix."
   },
   {
    "n": 4,
    "sel": {
     "css": ".bars"
    },
    "label": "By engine",
    "today": "—",
    "proposed": "Before → day-30 bar per engine with a marker at the baseline; delta green (up) or grey (±0).",
    "why": "Engines move independently; AI Overview ±0 with Google-Extended not fetching is the diagnosis."
   },
   {
    "n": 5,
    "sel": {
     "css": "table.gp"
    },
    "label": "The six red prompts",
    "today": "—",
    "proposed": "Same six prompts as S2: before · day 30, green when up.",
    "why": "Closes the loop with the evidence that started it."
   },
   {
    "n": 6,
    "sel": {
     "css": ".detail-hd .seg"
    },
    "label": "Day 7 vs day 30",
    "today": "—",
    "proposed": "Day 7 says it is too early (fetches, first retrieval, no verdict). Day 30 carries the verdict: verified / not verified with the likely reason and a next action chosen accordingly.",
    "why": "Honesty about crawl-to-citation latency prevents a false “it didn’t work” at day 7."
   },
   {
    "n": 7,
    "sel": {
     "text": [
      "b",
      "Blocker"
     ]
    },
    "label": "Blockers",
    "today": "—",
    "proposed": "Card linking to the existing action when a bot is blocked or the URL 404s; “connect server logs / GA4 to see this” when integrations are missing.",
    "why": "Turns verification gaps into the reason to connect Crawl Insights and AI Referrals."
   },
   {
    "n": 8,
    "sel": {
     "text": [
      "b",
      "Still unanswered"
     ]
    },
    "label": "Unanswered input",
    "today": "—",
    "proposed": "One amber line if the required input was never answered.",
    "why": "The placeholder must not be forgotten on a live page."
   },
   {
    "n": 9,
    "sel": {
     "css": ".next"
    },
    "label": "Next action",
    "today": "—",
    "proposed": "One card proposed by the run with ✓ Accept (scheduled tonight) and Close run.",
    "why": "The loop closes with one click — what makes it an agent rather than a report."
   },
   {
    "n": 10,
    "sel": {
     "css": ".impact-strip"
    },
    "label": "Impact strip",
    "today": "Marker on the Impact chart",
    "proposed": "The marker for this action now links to the run.",
    "why": "Impact becomes causal instead of decorative."
   },
   {
    "n": 11,
    "sel": {
     "text": [
      "b",
      "Decisions"
     ]
    },
    "label": "Decisions",
    "today": "—",
    "proposed": "Full log.",
    "why": "—"
   }
  ],
  "notes": []
 },
 "settings": {
  "title": "S7 · AI settings › Behavior",
  "items": [
   {
    "n": 1,
    "sel": {
     "css": "label:has(#aa)"
    },
    "label": "Auto-approve actions",
    "today": "One toggle: “Skip tool approval cards — the agent acts without asking. Only affects new chats.”",
    "proposed": "Extended: “Also start runs without a person accepting, for actions rated [Very high ▾] or above. Runs still stop at Review.” The action shows “Scheduled by policy”.",
    "why": "Reuses the switch that exists; the impact band bounds the blast radius."
   },
   {
    "n": 2,
    "sel": {
     "css": "label:has(#pause)"
    },
    "label": "Pause all runs",
    "today": "—",
    "proposed": "Kill switch: no new runs start; running ones pause at their next checkpoint; nothing is deleted; resume any time.",
    "why": "Every agent needs a one-click off. Per project."
   },
   {
    "n": 3,
    "sel": {
     "css": "#dest"
    },
    "label": "Where approved drafts land",
    "today": "—",
    "proposed": "Google Docs · WordPress · Webflow · GitHub PR · Linear ticket. One per project, set by an owner.",
    "why": "The destination decision belongs in settings, made once."
   },
   {
    "n": 4,
    "sel": {
     "text": [
      "b",
      "Agent budget"
     ]
    },
    "label": "Agent budget",
    "today": "Usage tab shows “Usage remaining 90%”",
    "proposed": "What a run costs against the existing budget: ~15 tool calls to ground, one draft, one optimise pass, daily verify calls for 30 days.",
    "why": "People should see the price before turning on policy runs."
   }
  ],
  "notes": []
 }
};
