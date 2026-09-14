/* Action Runs — prototype. Hash routes: #/overview · #/actions?status&type&target&impact&sort&q · #/action/:id · #/run · #/review · #/handoff · #/report?day=7|30 · #/about */
(function () {
  const $ = (s, el = document) => el.querySelector(s);
  const h = (html) => { const t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstElementChild; };
  const pct = (v) => Math.round(v * 100) + "%";
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const impLevel = (i) => ({ VERY_HIGH: 3, HIGH: 3, MEDIUM: 2, LOW: 1, VERY_LOW: 1 }[i] || 1);
  const impLabel = (i) => ({ VERY_HIGH: "Very high", HIGH: "High", MEDIUM: "Medium", LOW: "Low", VERY_LOW: "Very low" }[i] || i);
  const impRank = (i) => ({ VERY_HIGH: 5, HIGH: 4, MEDIUM: 3, LOW: 2, VERY_LOW: 1 }[i] || 0);
  const main = $("#main"), crumb = $("#crumb");

  /* ---------- fixture validation (SMA-5) ---------- */
  const REQUIRED = ["project", "channels", "brand_30d", "brand_by_channel_14d", "prompts", "anchor_action", "action_groups", "counts", "target_prompts_baseline", "SYNTHETIC_verify_timeline"];
  function validate(D) {
    const missing = REQUIRED.filter(k => !(k in D));
    if (missing.length) return `Fixture is missing: ${missing.join(", ")}`;
    if (!Array.isArray(D.prompts) || D.prompts.length !== 20) return `Expected 20 target prompts, got ${D.prompts && D.prompts.length}`;
    if (!D.anchor_action.sections || D.anchor_action.sections.length !== 3) return "Anchor action needs 3 sections";
    const total = D.action_groups.reduce((n, g) => n + g.items.length, 0);
    if (total !== D.counts.total) return `Action count mismatch: ${total} rows vs counts.total ${D.counts.total}`;
    return null;
  }
  function errorScreen(title, body) {
    crumb.innerHTML = `<span>Error</span>`;
    main.innerHTML = `<div class="content fade"><div class="card"><div class="hd"><span class="dot neg"></span><b>${esc(title)}</b></div><div class="bd muted">${esc(body)}<br><br><a href="#/actions">Back to Actions</a></div></div></div>`;
  }
  const D = window.DATA, DR = window.DRAFT;
  const err = D ? validate(D) : "No fixture loaded (window.DATA is undefined)";
  if (err) { errorScreen("The prototype's fixture didn't load", err); return; }
  const chName = (id) => (D.channels.find(c => c.id === id) || { name: id }).name;
  const anchor = D.anchor_action, targetPrompts = D.prompts, base = D.target_prompts_baseline, SYN = D.SYNTHETIC_verify_timeline;
  const allItems = D.action_groups.flatMap(g => g.items.map(it => ({ ...it, group: g.title })));
  const byId = Object.fromEntries(allItems.map(it => [it.id, it]));

  /* ---------- state ---------- */
  const freshRun = () => ({ status: "none", decisions: [], version: 1, liveUrl: null, inputAnswered: false, edited: false, startedBy: null, cancelReason: null });
  const state = { run: freshRun(), action: "PENDING", accepted: new Set(), declined: new Set(), settings: { autoApprove: false, band: "Very high", paused: false, destination: "gdoc" }, scn: {}, undo: null, reduced: matchMedia("(prefers-reduced-motion: reduce)").matches, presHidden: false, _fast: false };
  const SCENARIOS = [["", "Scenario: none (happy path)"], ["budget", "B4 · Budget exhausted mid-run"], ["source", "B5 · A source can't be read"], ["toolerr", "B6 · Tool error, resumable"], ["stale", "C5 · Reviewer never responds"], ["nodest", "D2 · Destination not configured"], ["autofound", "D4 · URL found automatically"], ["nudged", "D5 · Nothing published after 7 days"], ["broken", "D6 · Published URL returns 404"], ["nomove", "E3 · Day 30: nothing moved"], ["noconn", "E5 · Logs / GA4 not connected"]];
  let timers = []; const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };
  const RUN_LABEL = { none: null, running: ["blue", "Running"], paused: ["warn", "Paused"], failed: ["neg", "Failed · resumable"], cancelled: ["", "Cancelled"], review: ["warn", "Waiting for review"], stale: ["neg", "Stale · no review in 14 days"], revision: ["blue", "Revising · v2"], publish: ["warn", "Waiting to publish"], nudged: ["warn", "Waiting to publish · nudged"], watching7: ["blue", "Watching · day 7"], watching: ["blue", "Watching · day 30"], done: ["pos", "Done · verified"], notverified: ["warn", "Done · not verified"] };
  const actionTag = () => ({ PENDING: "", ACCEPTED: `<span class="tag">Accepted</span>`, SCHEDULED: `<span class="tag blue"><span class="dot blue"></span>Scheduled · tonight 02:00</span>`, POLICY: `<span class="tag blue"><span class="dot blue"></span>Scheduled by policy · tonight</span>`, DECLINED: `<span class="tag">Declined</span>`, DONE: `<span class="tag pos">Done</span>` }[state.action] || "");
  const runTag = () => { const l = RUN_LABEL[state.run.status]; if (l) return `<span class="tag ${l[0]}"><span class="dot ${l[0]}"></span>${l[1]}</span>`; return state.action === "PENDING" ? `<span class="runs">No run yet · 4 days old</span>` : actionTag(); };
  const decide = (who, what) => state.run.decisions.push({ t: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), who, what });

  /* ---------- routing ---------- */
  function parseHash() { const raw = location.hash.replace(/^#\/?/, "") || "actions"; const [path, q = ""] = raw.split("?"); const params = Object.fromEntries(new URLSearchParams(q)); const [seg, id] = path.split("/"); return { seg, id, params }; }
  function nav(path, params) { const clean = params ? Object.fromEntries(Object.entries(params).filter(([, v]) => v)) : null; const q = clean && Object.keys(clean).length ? "?" + new URLSearchParams(clean).toString() : ""; const target = "#/" + path + q; if (location.hash === target) render(); else location.hash = target; }
  window.addEventListener("hashchange", render);

  const impBars = (i) => `<span class="imp l${impLevel(i)}" title="Relative impact: ${impLabel(i)}"><i></i><i></i><i></i></span>`;

  /* ---------- Overview (SMA-6) ---------- */
  function renderOverview() {
    crumb.innerHTML = `<span class="faint">Home</span><span class="faint">›</span><span>Overview</span>`;
    const b = D.brand_30d, n = b.Nike;
    main.innerHTML = `<div class="toolbar"><span class="chip">▤ Nike ▾</span><span class="chip">📅 Last 30 days ▾</span><span class="chip">All filters ▾</span></div>
    <div class="content fade">
      <div style="display:flex;align-items:center;gap:14px"><span class="logo" style="width:44px;height:44px;border-radius:50%;background:var(--black);display:inline-block"></span><div><h1>Nike <span class="tag pos">You</span></h1><div class="muted">nike.com</div></div></div>
      <div class="tiles" style="grid-template-columns:repeat(5,1fr)">
        <div><h4>Visibility ⓘ</h4><div class="v">${pct(n.visibility)}</div></div><div><h4>SoV ⓘ</h4><div class="v">${pct(n.sov)}</div></div><div><h4>Sentiment ⓘ</h4><div class="v"><span class="dot pos"></span> ${n.sentiment}</div></div><div><h4>Position ⓘ</h4><div class="v">#${n.position}</div></div><div><h4>Open actions</h4><div class="v">${D.counts.total}</div></div>
      </div>
      <div class="pair">
        <div class="card"><div class="hd"><b>Top brands</b><span class="sp" style="flex:1"></span><span class="small faint">30 days · via Peec MCP</span></div><div class="bd"><table class="gp"><tr><th>#</th><th>Brand</th><th style="text-align:right">Visibility</th><th style="text-align:right">SoV</th><th style="text-align:right">Sentiment</th></tr>${Object.entries(b).map(([k, v], i) => `<tr><td>${i + 1}</td><td>${esc(k)}</td><td class="n">${pct(v.visibility)}</td><td class="n">${pct(v.sov)}</td><td class="n">${v.sentiment}</td></tr>`).join("")}</table></div></div>
        <div class="card"><div class="hd"><b>By engine</b><span class="sp" style="flex:1"></span><span class="small faint">14 days</span></div><div class="bd bars">${Object.entries(D.brand_by_channel_14d).map(([k, v]) => `<div class="bar"><span>${chName(k)}</span><div class="tr"><span class="a" style="width:${v.visibility * 100}%"></span></div><span class="n">${pct(v.visibility)}</span></div>`).join("")}
          <div class="small faint" style="margin-top:8px">On the 20 prompts the open content brief targets: ${pct(base.mean_visibility_14d)} average · ${base.prompts_under_35pct} under 35% · ${base.prompts_at_zero} at 0%. <a href="#/action/${anchor.id}">Open the action →</a></div></div></div>
      </div>
      <div class="card"><div class="hd"><b>Runs</b></div><div class="bd" style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">${runTag()}<span class="muted">${state.run.status === "none" ? "No runs yet. Accepting an action starts one tonight." : "1 run in progress on “" + esc(anchor.title) + "”."}</span><span class="sp" style="flex:1"></span><a href="#/actions">Go to Actions →</a></div></div>
    </div>`;
  }

  /* ---------- Actions list (SMA-6) ---------- */
  const STATUS_OPTS = ["All", "New", "Accepted", "Scheduled", "Running", "Waiting for review", "Waiting to publish", "Watching", "Done", "Declined"];
  function itemStatus(it) {
    if (it.type === "brief") { const l = RUN_LABEL[state.run.status]; if (l) return l[1].split(" ·")[0]; return { PENDING: "New", ACCEPTED: "Accepted", SCHEDULED: "Scheduled", POLICY: "Scheduled", DECLINED: "Declined", DONE: "Done" }[state.action]; }
    if (state.declined.has(it.id)) return "Declined"; if (state.accepted.has(it.id)) return "Accepted"; return it.status === "COMPLETED" ? "Done" : "New"; }
  const otherTag = (it) => state.declined.has(it.id) ? `<span class="tag">Declined</span>` : state.accepted.has(it.id) ? `<span class="tag">Accepted</span>` : "—";
  function renderList(params) {
    crumb.innerHTML = `<span class="faint">Optimize</span><span class="faint">›</span><span>Actions</span>`;
    const f = { status: params.status || (params.status === "" ? "All" : "All"), type: params.type || "All", target: params.target || "All", impact: params.impact || "All", sort: params.sort || "impact", q: params.q || "", group: params.group || "What to do" };
    const types = ["All", ...D.action_groups.map(g => g.title)];
    let items = allItems.filter(it => (f.status === "All" ? itemStatus(it) !== "Declined" : true) && (f.status === "All" || itemStatus(it) === f.status || (f.status === "Watching" && itemStatus(it).startsWith("Watching")) || (f.status === "Running" && itemStatus(it).startsWith("Revising"))) && (f.type === "All" || it.group === f.type) && (f.target === "All" || (f.target === "Owned" ? ["brief", "opt", "seo"].includes(it.type) : it.type === "earned")) && (f.impact === "All" || impLabel(it.impact) === f.impact) && (!f.q || it.title.toLowerCase().includes(f.q.toLowerCase())));
    if (f.sort === "impact") items.sort((a, b) => impRank(b.impact) - impRank(a.impact)); else if (f.sort === "title") items.sort((a, b) => a.title.localeCompare(b.title));
    const groups = (f.group === "Owned vs earned" ? [{ title: "Owned", items: items.filter(i => i.type !== "earned") }, { title: "Earned", items: items.filter(i => i.type === "earned") }] : D.action_groups.map(g => ({ title: g.title, items: items.filter(i => i.group === g.title) }))).filter(g => g.items.length);
    const c = D.counts;
    const sel = (key, name, opts, cur) => `<label class="chip" style="gap:4px"><span class="faint small">${name}</span><select data-f="${key}" style="border:0;background:transparent;font:inherit;color:inherit">${opts.map(o => `<option ${o === cur ? "selected" : ""}>${o}</option>`).join("")}</select></label>`;
    main.innerHTML = `
      <div class="toolbar">
        ${sel("status", "Status", STATUS_OPTS, f.status)} ${sel("type", "Type", types, f.type)} ${sel("target", "Target", ["All", "Owned", "Earned"], f.target)} ${sel("impact", "Impact", ["All", "Very high", "High", "Medium", "Low", "Very low"], f.impact)}
        <label class="chip" style="gap:4px"><span class="faint small">Sort</span><select data-f="sort" style="border:0;background:transparent;font:inherit;color:inherit"><option value="impact" ${f.sort === "impact" ? "selected" : ""}>Impact</option><option value="title" ${f.sort === "title" ? "selected" : ""}>Title</option></select></label>
        ${sel("group", "Group by", ["What to do", "Owned vs earned"], f.group)}
        <input id="q" type="search" placeholder="Search actions" value="${esc(f.q)}" style="font:inherit;padding:6px 10px;border:1px solid var(--line);border-radius:8px;min-width:160px" aria-label="Search actions">
        <span class="sp"></span><span class="chip">+ Add content</span><button class="pill-btn" id="acceptall">✓ Accept all</button>
      </div>
      <div class="content fade">
        <div><h1>Close the gaps keeping you out of AI answers</h1><p class="muted">Prioritized site fixes, owned surfaces, and earned placements — ranked by the impact each has on how AI engines see your brand.</p></div>
        <div class="tiles"><div><h4>Site audit ⓘ</h4><div class="v">${c.site_audit} fixes open</div></div><div><h4>Owned ⓘ</h4><div class="v">${c.owned} actions on your surfaces</div></div><div><h4>Earned ⓘ</h4><div class="v">${c.earned} placements to win</div></div></div>
        <div class="card" style="position:relative">
          <div class="hd"><span class="dot"></span><b>${f.status === "All" ? "All statuses" : esc(f.status)}</b><span class="cnt tag">${items.length}</span><span class="sp" style="flex:1"></span><span class="tag blue">Runs</span></div>
          <div id="bulkbox" class="hidden" style="padding:12px 18px;border-bottom:1px solid var(--line);background:#FAFCFF"></div>
          ${groups.length ? groups.map(g => `<div class="grp"><div class="gh"><span class="tri">▾</span><span>${esc(g.title)}</span><span class="cnt">${g.items.length}</span></div>${g.items.map(it => `
            <div class="row clickable ${it.type === "brief" ? "hl" : ""}" data-id="${esc(it.id)}" tabindex="0" role="button">
              <span>${impBars(it.impact)}</span>
              <div class="t"><span class="txt">${esc(it.title)}</span>${it.status === "COMPLETED" ? '<span class="tag pos">Done</span>' : ""}</div>
              <span class="sub">${esc(it.sub || "")}</span>
              <span class="runs">${it.type === "brief" ? runTag() : otherTag(it)}</span>
              <span class="sub">${impLabel(it.impact)}</span>
            </div>`).join("")}</div>`).join("")
        : `<div class="bd" style="padding:40px;text-align:center"><b>No actions match these filters</b><div class="muted" style="margin-top:6px">Try clearing the status or type filter.</div><div style="margin-top:12px"><a href="#/actions">Clear filters</a></div></div>`}
          <div class="foot"><span>${items.length} of ${c.total} actions</span><span class="sp" style="flex:1"></span><button class="pill-btn ghost faint" id="declineall">✕ Decline all</button></div>
          ${state.run.status === "none" && f.status === "All" && !f.q ? `<div class="tip up" id="tip1" style="right:18px;top:52px"><b>Accepting an action starts a run</b>Tonight, the runner picks up every accepted action and takes it to a draft. Or start one now from the action.<button class="x" aria-label="close">✕</button></div>` : ""}
        </div>
      </div>`;
    const t1 = $("#tip1"); if (t1) t1.querySelector(".x").onclick = () => t1.remove();
    $("#acceptall").onclick = () => { const box = $("#bulkbox"); const tp = $("#tip1"); if (tp) tp.remove(); box.classList.remove("hidden"); box.scrollIntoView({ block: "center", behavior: "smooth" }); box.innerHTML = `<b>Accept all 38 actions?</b> <span class="muted">Runs will start tonight for <b>1</b> (the content brief). 7 content-optimisation actions and 13 technical fixes are accepted but wait for the next release of runs; 17 earned placements are accepted and never run.</span> <button class="pill-btn primary" id="bulkgo" style="margin-left:8px">Accept all</button> <button class="pill-btn ghost" id="bulkno">Cancel</button>`; $("#bulkgo").onclick = () => { allItems.forEach(it => { if (it.type !== "brief" && it.status !== "COMPLETED") state.accepted.add(it.id); }); if (state.action === "PENDING") { state.action = "SCHEDULED"; decide("maya@nike.com", "Accepted all actions — 1 run scheduled for tonight"); } render(); }; $("#bulkno").onclick = () => box.classList.add("hidden"); };
    $("#declineall").onclick = () => { const box = $("#bulkbox"); const tp = $("#tip1"); if (tp) tp.remove(); box.classList.remove("hidden"); box.scrollIntoView({ block: "center", behavior: "smooth" }); box.innerHTML = `<b>Decline all ${items.length} shown actions?</b> <span class="muted">They move to Declined; nothing runs. You can undo from the Declined filter.</span> <button class="pill-btn primary" id="bulkgo">Decline all</button> <button class="pill-btn ghost" id="bulkno">Cancel</button>`; $("#bulkgo").onclick = () => { items.forEach(it => { if (it.type === "brief") { if (state.run.status === "none") state.action = "DECLINED"; } else state.declined.add(it.id); }); render(); }; $("#bulkno").onclick = () => box.classList.add("hidden"); };
    const clean = (p) => { Object.keys(p).forEach(k => { if (p[k] === "All" || (k === "sort" && p[k] === "impact") || !p[k]) delete p[k]; }); return p; };
    main.querySelectorAll("select[data-f]").forEach(s => s.onchange = () => nav("actions", clean({ ...f, [s.dataset.f]: s.value })));
    let qt; $("#q").oninput = (e) => { clearTimeout(qt); const val = e.target.value; qt = setTimeout(() => { nav("actions", clean({ ...f, q: val })); setTimeout(() => { const el = $("#q"); if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); } }, 0); }, 300); };
    main.querySelectorAll(".row.clickable").forEach(r => { const open = () => nav("action/" + r.dataset.id); r.onclick = open; r.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } }; });
  }

  /* ---------- Action detail (SMA-7) ---------- */
  function renderDetail(id) {
    const it = byId[id];
    if (!it) return errorScreen("Action not found", `No action with id “${id}” in this project.`);
    if (it.type === "brief") return renderBriefDetail();
    crumb.innerHTML = `<span class="faint">Optimize</span><span class="faint">›</span><span class="faint">Actions</span><span class="faint">›</span><span>${esc(it.title)}</span>`;
    const kind = { seo: "Technical SEO fix · site audit", opt: "Content optimization · owned page", earned: "Earned placement · " + esc(it.group) }[it.type];
    const body = it.type === "seo" ? `<div class="section"><h4>What to do</h4><p class="why">${esc(it.title)}.</p><p class="muted">Audit check: <span class="mono">${esc(it.sub)}</span> · Site: nike.com · applies to the whole site, not one page.</p></div>
        <div class="section"><h4>Runs</h4><div class="card"><div class="bd muted">Runs cover content briefs in this release. For technical fixes the next release produces the diff (robots.txt, JSON-LD, meta) and hands it to a ticket — it never pushes to your site.</div></div></div>`
      : it.type === "opt" ? `<div class="section"><h4>What to do</h4><p class="why">${esc(it.title)}.</p><p class="muted">Page type: ${esc(it.sub)}.</p></div>
        <div class="section"><h4>Evidence</h4><div class="card"><div class="bd muted">Content-optimisation actions exist in Peec but aren't exposed through the API this prototype was built from, so their evidence isn't loaded here.</div></div></div>
        <div class="section"><h4>Runs</h4><div class="card"><div class="bd muted">Same loop as a content brief, starting from an existing page. Second release.</div></div></div>`
      : `<div class="section"><h4>Playbook</h4><p class="why">${esc(it.title)}.</p><p class="muted">Platform: <b>${esc(it.sub)}</b> · ${esc(it.group)}.</p></div>
        <div class="section"><h4>Runs</h4><div class="card"><div class="bd muted">Earned placements are out of scope for runs: Peec has no contact data and doesn't send outreach. The runner can queue a target list; a person pitches.</div></div></div>`;
    const st = itemStatus(it);
    main.innerHTML = `<div class="detail-hd"><button class="pill-btn ghost" id="back">‹ Back</button><span class="sp" style="flex:1"></span>${st === "Declined" ? '<button class="pill-btn" id="undo">↶ Undo decline</button>' : st === "Accepted" ? '<span class="tag">Accepted</span>' : '<button class="pill-btn" id="dec">✕ Decline</button><button class="pill-btn primary" id="acc">✓ Accept</button>'}</div>
      <div class="content fade"><div><div class="small faint">${kind}</div><h1 style="font-size:24px;margin-top:4px">${esc(it.title)}</h1></div>
      <div class="kv"><div><h4>Relative impact</h4><div>${impBars(it.impact)} ${impLabel(it.impact)}</div></div><div><h4>Status</h4><div>${st === "Done" ? '<span class="tag pos">Done</span>' : `<span class="tag">${st}</span>`}</div></div><div><h4>Target</h4><div>${it.type === "earned" ? "Earned" : "Owned"}</div></div></div>${body}</div>`;
    $("#back").onclick = () => nav("actions");
    const acc = $("#acc"), dec = $("#dec"), und = $("#undo");
    if (acc) acc.onclick = () => { state.accepted.add(it.id); render(); };
    if (dec) dec.onclick = () => { state.declined.add(it.id); render(); };
    if (und) und.onclick = () => { state.declined.delete(it.id); render(); };
  }
  function renderBriefDetail() {
    const a = anchor;
    crumb.innerHTML = `<span class="faint">Optimize</span><span class="faint">›</span><span class="faint">Actions</span><span class="faint">›</span><span>${esc(a.title)}</span>`;
    const promptsHtml = targetPrompts.map(p => { const v = p[3]; const cls = v === 0 ? "zero" : v < 0.35 ? "bad" : ""; return `<div class="prompt"><span>${esc(p[1])}</span><span class="vis ${cls} num">${pct(v)}</span><span class="pos num">${p[4] == null ? "—" : "#" + p[4]}</span></div>`; }).join("");
    let hdBtns;
    if (state.run.status !== "none" && state.run.status !== "cancelled") hdBtns = `<button class="pill-btn primary" id="openrun">Open the run →</button>`;
    else if (state.action === "DECLINED") hdBtns = `<span class="tag">Declined</span><button class="pill-btn" id="undo">↶ Undo</button>`;
    else if (state.action === "SCHEDULED" || state.action === "POLICY" || state.action === "ACCEPTED") hdBtns = `${actionTag()}<button class="pill-btn primary" id="acceptrun">▶ Run now</button>`;
    else hdBtns = `<button class="pill-btn" id="decline">✕ Decline</button><button class="pill-btn" id="accept">✓ Accept</button><button class="pill-btn primary" id="acceptrun">✓ Accept &amp; run now</button>`;
    const pausedNote = state.settings.paused ? `<div class="card" style="border-color:var(--warn)"><div class="bd"><b>Runs are paused for this project.</b> <span class="muted">Accepting still works; nothing starts until runs are resumed in AI settings.</span> <a href="#/settings">Open settings</a></div></div>` : "";
    main.innerHTML = `
      <div class="detail-hd"><button class="pill-btn ghost" id="back">‹ Back</button><span class="sp" style="flex:1"></span>${hdBtns}</div>
      <div class="content fade">
        ${pausedNote}
        ${state.action === "DECLINED" && state.run.status === "none" ? `<div class="card"><div class="bd"><b>Declined.</b> <span class="muted">No run will be created. It stays under Status → Declined; Peec may propose a fresh version when the data changes.</span></div></div>` : ""}
        ${state.action === "SCHEDULED" && state.run.status === "none" ? `<div class="card" style="border-color:var(--blue)"><div class="bd"><b>Accepted — the runner picks it up tonight at 02:00</b> <span class="muted">after the daily prompt run, so the baseline is fresh. Or start it now.</span></div></div>` : ""}
        ${state.action === "POLICY" && state.run.status === "none" ? `<div class="card" style="border-color:var(--blue)"><div class="bd"><b>Scheduled by policy.</b> <span class="muted">Auto-approve is on for Very high actions (AI settings → Behavior), so this run starts tonight without anyone accepting. It still stops at Review.</span></div></div>` : ""}
        <div><div class="small faint">Content brief · Article · created Sep 10</div><h1 style="font-size:24px;margin-top:4px">${esc(a.title)}</h1><p class="muted" style="margin-top:6px;max-width:70ch">${esc(a.usp)}</p></div>
        <div class="kv"><div><h4>Topic</h4><div>Nike</div></div><div><h4>Models</h4><div>${a.models.map(chName).join(" · ")}</div></div><div><h4>Relative impact</h4><div>${impBars(a.impact)} ${impLabel(a.impact)}</div></div><div><h4>Run</h4><div>${runTag()}</div></div></div>
        <div class="section"><h4>Why this matters</h4><p class="why">${esc(a.why)}</p></div>
        <div class="section"><h4>The brief</h4><div class="brief"><div class="bh">${esc(a.title)}<span style="flex:1"></span><span class="pill-btn small">💬 Work with Agent ▾</span></div><div class="bb">
          <div><div class="lbl">Headline options</div><ol>${a.h1_options.map(x => `<li>${esc(x)}</li>`).join("")}</ol></div>
          <div><div class="lbl">Meta title <span class="num">55 / 60</span></div>${esc(a.meta_title)}</div>
          <div><div class="lbl">Meta description <span class="num">149 / 155</span></div>${esc(a.meta_description)}</div>
          <div><div class="lbl">Primary query</div>“${esc(a.primary_query)}”</div>
          <div><div class="lbl">What this page must argue</div>${esc(a.usp)}</div>
          <div><div class="lbl">Proof points</div>${a.proof_points.join(" · ")}</div>
          ${a.sections.map((s, i) => `<div><div class="lbl">H2 ${i + 1} · ${esc(s.label)} <span class="tag">score ${s.score}</span></div><div class="small muted">Answers: ${s.questions.map(q => `“${esc(q)}”`).join(" · ")}</div></div>`).join("")}
          <div><div class="lbl">Never write</div><span class="muted">${a.never_write_terms.join(" · ")}</span></div>
          <div><div class="lbl">Required inputs</div><span class="tag warn">1 needs a human</span> ${esc(a.required_inputs[0])}</div>
        </div></div></div>
        <div class="section"><h4>Sources <span class="faint">10</span></h4><div class="srcs">${[["youtube.com/watch?v=OJbSeLuX06Q", "2%"], ["youtube.com/watch?v=JBcyMLaBJXQ", "1%"], ["youtube.com/shorts/0oCDrCr4PoY", "1%"], ["cleatshub.com/learn/the-best-football-boots-for-artificial-grass-ag", "1%"], ["youtube.com/watch?v=uCwLXNZjCA8", "1%"], ["runrepeat.com/guides/best-ankle-support-basketball-shoes", "2%"], ["pmc.ncbi.nlm.nih.gov/articles/PMC9051004", "1%"], ["trainwell.net/blog/the-best-personalized-fitness-apps…", "2%"], ["irunfar.com/best-marathon-shoes", "3%"], ["sensai.fit/blog/best-ai-personal-trainer-apps-2026", "1%"]].map(([u, n]) => `<div class="src"><span class="fav">${esc(u.split(".")[0].slice(0, 2)).toUpperCase()}</span><span class="u">${esc(u)}</span><span class="n">${n} ♥</span></div>`).join("")}</div></div>
        <div class="section"><h4>Prompts to answer <span class="faint">20</span> <span class="tag neg" style="margin-left:6px">${base.prompts_under_35pct} under 35% · ${base.prompts_at_zero} at 0%</span></h4><div class="card"><div class="bd" style="padding-top:6px;padding-bottom:6px"><div class="prompt" style="border:0;color:var(--ink3);font-size:12px"><span>Prompt</span><span class="vis">Nike visibility · 14 d</span><span class="pos">Position</span></div>${promptsHtml}</div></div></div>
        <div class="section"><h4>Expected outcome</h4><div class="card"><div class="bd" style="display:flex;gap:12px;align-items:center">${impBars(a.impact)}<div><div class="small faint">Relative impact</div><b>${impLabel(a.impact)}</b></div></div></div></div>
        ${state.run.status === "none" ? `<div style="position:relative;height:0"><div class="tip left" id="tip2" style="left:0;top:-18px;max-width:360px"><b>Six of the twenty prompts are red</b>Two are at 0%. ChatGPT searched <span class="mono">site:nike.com Pegasus … Vomero cushioning</span> five times last week — it is looking for a page that doesn't exist.<button class="x" aria-label="close">✕</button></div></div>` : ""}
      </div>`;
    $("#back").onclick = () => nav("actions");
    const t2 = $("#tip2"); if (t2) t2.querySelector(".x").onclick = () => t2.remove();
    const ar = $("#acceptrun"); if (ar) ar.onclick = () => { if (state.settings.paused) { alert("Runs are paused for this project. Resume them in AI settings → Behavior."); return; } if (state.run.status === "cancelled") state.run = { ...freshRun(), decisions: state.run.decisions }; state.run.status = "running"; state.run.startedBy = state.action === "POLICY" ? "policy" : "maya@nike.com"; state.action = "ACCEPTED"; decide(state.run.startedBy === "policy" ? "policy (auto-approve)" : "maya@nike.com", "Accepted the action and started a run"); nav("run"); };
    const ac = $("#accept"); if (ac) ac.onclick = () => { state.action = "SCHEDULED"; decide("maya@nike.com", "Accepted the action — run scheduled for tonight"); render(); };
    const dc = $("#decline"); if (dc) dc.onclick = () => { state.action = "DECLINED"; decide("maya@nike.com", "Declined the action"); render(); };
    const un = $("#undo"); if (un) un.onclick = () => { state.action = "PENDING"; decide("maya@nike.com", "Undid the decline"); render(); };
    const or = $("#openrun"); if (or) or.onclick = () => { const s = state.run.status; if (s === "watching7") nav("report", { day: 7 }); else if (s === "watching") nav("report", { day: 30 }); else nav({ running: "run", paused: "run", failed: "run", cancelled: "run", review: "review", stale: "review", revision: "run", publish: "handoff", nudged: "handoff", done: "report", notverified: "report" }[s] || "run"); };
  }

  /* ---------- Run (SMA-8) ---------- */
  const STEPS = [
    { l: "Read the action and its brief", tool: "get_action", r: `Brief · 3 sections · 20 target prompts · 5 winning sources · 1 required input`, plan: "brief" },
    { l: "Read the target prompts and their baseline", tool: "get_brand_report · prompt_id", r: `Average visibility <span class="k">${pct(base.mean_visibility_14d)}</span> · <span class="k">${base.prompts_under_35pct}</span> under 35% · <span class="k">${base.prompts_at_zero}</span> at 0%`, plan: "baseline" },
    { l: "Read what the engines answer today", tool: "list_chats · get_chat", r: `AI Overview, Sep 10: 10 sources cited — <span class="k">1</span> is Nike (the newsroom). rtings, marathonhandbook, Reddit, TikTok, YouTube carry the rest.`, plan: "today" },
    { l: "Read the searches behind the prompt", tool: "list_search_queries", r: `ChatGPT ran <span class="k">site:nike.com Pegasus … Vomero cushioning daily trainer</span> 5× in 7 days. Engine vocabulary: ReactX, ZoomX, Air Zoom, Cushlon 3.0, “daily trainer”.`, plan: "fanout" },
    { narr: "Reading the pages that win this topic in full." },
    { l: "Read the winning sources", tool: "get_url_content × 5", r: `irunfar.com (74,033 chars) · runrepeat.com · pmc.ncbi.nlm.nih.gov · trainwell.net · sensai.fit`, plan: "sources", scn: { source: { warn: true, r: `4 of 5 read. <b>sensai.fit not yet scraped by Peec</b> (can take up to 24 h) — continuing with 4; the plan notes the gap.` }, toolerr: { fail: true, r: `<span style="color:var(--neg)">get_url_content failed (upstream 502) on runrepeat.com.</span> Run stopped here — nothing written. Resume retries this step.` }, budget: { pause: true, r: `Budget used up for this month (Agent budget, usage menu). Run paused here — resumes when the month resets or the budget is raised. Nothing is lost.` } } },
    { l: "Load brand facts and register", tool: "get_project_profile · list_facts", r: `Positioning: performance-driven, innovative. Never write: best · most · perfect · ultimate · unbeatable · revolutionary · guaranteed.`, plan: "facts" },
    { l: "Plan the page", r: `3 sections · 14 sub-questions covered in prose · 4 in an FAQ · JSON-LD Article + FAQPage`, plan: "plan" },
    { l: "One input needs a human", warn: true, r: `“Confirm the current arch-support classification for the latest Pegasus and Vomero.” Asked once; continuing with a marked placeholder.`, plan: "need" },
    { narr: "Drafting against the brief." },
    { l: "Draft the content", skill: "/draft-the-content", r: `H1 “${esc(DR.h1)}” · meta title 55/60 · 3 H2s, each opening with a citation-ready chunk · FAQ · 1,340 words`, plan: "draft" },
    { l: "Score the draft", skill: "/optimize-your-content", r: `Citation-readiness <span class="k">${DR.score}/100</span> · answer in first 1,000 tokens ✓ · question-form H2s ✓ · 1 never-write term replaced (“best” → “prioritise”)`, plan: "score" },
    { l: "Check every claim", r: `<span class="k">${DR.claims.total}</span> factual sentences · <span class="k">${DR.claims.sourced}</span> sourced · <span class="k">${DR.claims.confirm}</span> marked “confirm”`, plan: "claims" },
    { l: "Generate structured data", r: `JSON-LD: Article + FAQPage (4 questions)`, plan: "jsonld" },
    { l: "Checkpoint: waiting for review", tool: "→ content owner", r: `Sent to the content owner where they work. Nothing ships until a person approves.`, plan: "review", final: true }
  ];
  const REVISION_STEPS = [
    { l: "Send-back received", tool: "content owner", r: `Note: “{note}”`, plan: "need" },
    { l: "Revise the draft", skill: "/draft-the-content", r: `Applied the note · re-scored: citation-readiness <span class="k">84/100</span> · claims unchanged`, plan: "draft" },
    { l: "Checkpoint: waiting for review (v2)", tool: "→ content owner", r: `Revision sent with a change summary.`, plan: "review", final: true }
  ];
  const PLAN = [["brief", "Brief", "Performance Footwear and Apparel Selection Guide · VERY_HIGH"], ["baseline", "Baseline", `<b>${pct(base.mean_visibility_14d)}</b> avg on 20 prompts · 6 under 35%`], ["today", "Today’s answer", "10 sources, 1 Nike"], ["fanout", "Engine is searching for", "<b>site:nike.com Pegasus … Vomero</b>"], ["sources", "Studied", "5 winning pages, in full"], ["facts", "Voice", "Declarative · no superlatives"], ["plan", "Structure", "H1 · 3 H2 · FAQ · JSON-LD"], ["need", "Needs a human", "arch-support classification"], ["draft", "Draft", "1,340 words"], ["score", "Citation-readiness", `<b>${DR.score}</b>/100`], ["claims", "Claims", `<b>${DR.claims.sourced}/${DR.claims.total}</b> sourced · ${DR.claims.confirm} to confirm`], ["review", "Status", "<b>Waiting for review</b>"]];

  function renderRun(fast) {
    if (state.run.status === "none") state.run.status = "running";
    if (state.settings.paused && state.run.status === "running") state.run.status = "paused";
    const revising = state.run.status === "revision";
    crumb.innerHTML = `<span class="faint">Actions</span><span class="faint">›</span><span class="faint">${esc(anchor.title)}</span><span class="faint">›</span><span>Run</span>`;
    main.innerHTML = `
      <div class="detail-hd"><button class="pill-btn ghost" id="back">‹ Action</button><span id="runtag">${runTag()}</span><span class="sp" style="flex:1"></span><button class="pill-btn hidden" id="resume">↻ Resume</button><button class="pill-btn" id="cancel">✕ Cancel run</button><button class="pill-btn" id="skip">Skip to end</button><button class="pill-btn primary hidden" id="openreview">Open the review request →</button></div>
      <div class="content fade"><div class="runwrap">
        <div class="card runlog"><div class="hdr"><span class="st">${revising ? "Revision · v2" : "Run started"}</span><span class="faint">·</span><span class="faint" id="stepcount">0 steps</span><span class="sp" style="flex:1"></span><span class="small faint">Auto-approve: off · budget: 12% of month</span></div><div class="progress"><i id="prog"></i></div><div class="steps" id="steps"></div></div>
        <div class="card plan"><div class="hd"><b>Plan</b><span class="sp" style="flex:1"></span><span class="small faint">fills as steps complete</span></div><div class="bd">${PLAN.map(([k, t, v]) => `<div class="pi ${revising ? "on" : ""}" data-k="${k}"><h4>${t}</h4><div class="v">${v}</div></div>`).join("")}</div></div>
      </div>
      ${state.run.status === "cancelled" ? `<div class="card"><div class="bd"><b>Run cancelled.</b> <span class="muted">${esc(state.run.cancelReason || "")} The action goes back to Accepted; nothing was written anywhere.</span> <button class="pill-btn" id="restartrun" style="margin-left:8px">▶ Start a new run</button></div></div>` : ""}
      <div class="card" id="inputcard"><div class="hd"><b>The one thing the runner needs from a human</b><span class="tag warn">Required input</span></div><div class="bd" style="display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap"><label style="flex:1;min-width:260px"><div class="small faint" style="margin-bottom:4px">${esc(anchor.required_inputs[0])}</div><input id="answer" type="text" ${state.run.inputAnswered ? 'disabled value="Pegasus 41: neutral, daily training · Vomero 18: neutral, high-mileage and recovery"' : 'placeholder="e.g. Pegasus 41: neutral · Vomero 18: neutral, high-mileage"'} style="width:100%;font:inherit;padding:8px 10px;border:1px solid var(--line);border-radius:8px"></label><button class="pill-btn primary" id="useanswer" ${state.run.inputAnswered ? "disabled" : ""}>${state.run.inputAnswered ? "✓ Used in the draft" : "Use this answer"}</button><div class="small muted" style="width:100%">Answer it now, at review, or never — the run doesn't block. Unanswered, the draft keeps a marked placeholder and the report reminds you.</div></div></div>
      ${decisionsCard()}</div>`;
    $("#back").onclick = () => nav("action/" + anchor.id);
    $("#cancel").onclick = () => { clearTimers(); const why = prompt("Cancel this run? Optional reason:", "Priorities changed") ; if (why === null) return; state.run.status = "cancelled"; state.run.cancelReason = why ? "Reason: “" + why + "”." : ""; state.action = "ACCEPTED"; decide("maya@nike.com", "Cancelled the run" + (why ? " — " + why : "")); render(); };
    const rr = $("#restartrun"); if (rr) rr.onclick = () => { state.run = { ...freshRun(), decisions: state.run.decisions, status: "running" }; decide("maya@nike.com", "Started a new run"); nav("run"); };
    $("#useanswer").onclick = () => { const v = $("#answer").value.trim(); if (!v) return; state.run.inputAnswered = true; DR.claims.confirm = 2; DR.claims.sourced = 25; const b = DR.sections[0].bullets.find(x => x.k === "c"); if (b) { b.k = "s"; b.src = "Provided by product team: " + v; b.t = "Arch type: " + v + "."; } decide("maya@nike.com", "Answered the required input"); render(); };
    if (state.run.status === "cancelled") { $("#skip").classList.add("hidden"); $("#cancel").classList.add("hidden"); $("#steps").innerHTML = ""; return; }
    const stepsEl = $("#steps"), countEl = $("#stepcount"), prog = $("#prog");
    const list = revising ? REVISION_STEPS.map(s => ({ ...s, r: s.r.replace("{note}", esc(state.run.note || "")) })) : STEPS;
    let n = 0; const real = list.filter(s => !s.narr).length;
    const scnKey = ["budget", "source", "toolerr"].find(k => state.scn[k]);
    let halted = false;
    function show(i) {
      if (halted) return;
      let s = list[i]; let el;
      const v = s.scn && scnKey && s.scn[scnKey] && !state.run.resumed ? s.scn[scnKey] : null;
      if (v) s = { ...s, r: v.r, warn: v.warn || v.pause, fail: v.fail, pause: v.pause };
      if (s.narr) el = h(`<div class="step narr"><span></span><div class="l">${s.narr}</div></div>`);
      else el = h(`<div class="step ${s.fail ? "warn" : s.warn ? "warn" : "active"}"><span class="d" ${s.fail ? 'style="background:var(--neg)"' : ""}></span><div><div class="l">${s.l}${s.tool ? `<span class="tool">${s.tool}</span>` : ""}${s.skill ? `<span class="skill">✦ ${s.skill}</span>` : ""}</div><div class="r">${s.r}</div></div></div>`);
      stepsEl.appendChild(el); requestAnimationFrame(() => el.classList.add("show"));
      if (s.fail || s.pause) { halted = true; clearTimers(); state.run.status = s.fail ? "failed" : "paused"; $("#runtag").innerHTML = runTag(); $("#skip").classList.add("hidden"); $("#resume").classList.remove("hidden"); $("#resume").onclick = () => { state.run.resumed = true; state.run.status = "running"; delete state.scn[scnKey]; nav("run"); }; updatePres(); return; }
      if (!s.narr) { n++; countEl.textContent = `${n} steps`; prog.style.width = Math.round(n / real * 100) + "%"; stepsEl.querySelectorAll(".step.active").forEach(p => { if (p !== el) { p.classList.remove("active"); p.classList.add("done"); } }); if (s.plan) { const pi = main.querySelector(`.pi[data-k="${s.plan}"]`); if (pi) pi.classList.add("on"); } if (s.plan === "need" && !revising) { const pi = main.querySelector('.pi[data-k="need"] .v'); if (pi) pi.className = "need"; } }
      if (s.final) { el.classList.remove("active"); el.classList.add("done"); state.run.status = "review"; $("#openreview").classList.remove("hidden"); $("#skip").classList.add("hidden"); $("#runtag").innerHTML = runTag(); updatePres(); }
    }
    const gap = fast || state.reduced ? 30 : 900;
    list.forEach((s, i) => timers.push(setTimeout(() => show(i), 300 + i * gap)));
    $("#skip").onclick = () => { clearTimers(); stepsEl.innerHTML = ""; n = 0; list.forEach((s, i) => show(i)); };
    $("#openreview").onclick = () => nav("review");
  }

  /* ---------- Review (SMA-9) ---------- */
  function decisionsCard() {
    if (!state.run.decisions.length) return "";
    return `<div class="card"><div class="hd"><b>Decisions</b><span class="sp" style="flex:1"></span><span class="small faint">recorded on the action</span></div><div class="bd" style="display:flex;flex-direction:column;gap:6px;font-size:13px">${state.run.decisions.map(d => `<div><span class="mono faint">${d.t}</span> · <b>${esc(d.who)}</b> — ${esc(d.what)}</div>`).join("")}</div></div>`;
  }
  const claim = (c) => `<span class="cl ${c.k}" title="${c.k === "s" ? "Source: " : "Needs confirmation: "}${esc(c.src)}">${esc(c.t)}</span>`;
  function renderReview() {
    const a = anchor, v = state.run.version;
    if (state.scn.stale && state.run.status === "review") state.run.status = "stale";
    crumb.innerHTML = `<span class="faint">Run</span><span class="faint">›</span><span>Review request${v > 1 ? " · v" + v : ""}</span>`;
    main.innerHTML = `
      <div class="detail-hd"><button class="pill-btn ghost" id="back">‹ Run</button>${runTag()}<span class="sp" style="flex:1"></span><div class="actions-bar"><button class="pill-btn" id="declinerev">✕ Decline</button><button class="pill-btn" id="sendback">↩ Send back</button><button class="pill-btn" id="edit">✎ Edit &amp; approve</button><button class="pill-btn ok" id="approve">✓ Approve</button></div></div>
      <div class="content fade">
        <div class="mail"><div class="mh"><span>📨 To: <b>content-team@nike.com</b></span><span class="faint">·</span><span>From: Peec · Action Runs</span><span class="faint">·</span><span>Today 07:12</span><span class="sp" style="flex:1"></span><span class="tag">This is the digest — the reviewer never opened Peec</span></div>
          <div class="mb"><div class="subj">Review a draft${v > 1 ? " (revision " + v + ")" : ""}: “${esc(DR.h1)}”</div><p class="muted">Peec drafted this page against the action you accepted on Sep 14 (“${esc(a.title)}”, Very high impact). It answers ${targetPrompts.length} prompts where Nike averages ${pct(base.mean_visibility_14d)} visibility and is at 0% on two.${v > 1 ? " <b>Change summary:</b> " + esc(state.run.note || "") + " — applied." : ""}</p>
          <div class="stats"><span><b>3</b> sections</span><span><b>14</b> questions answered in prose, <b>4</b> in FAQ</span><span><b>${DR.claims.sourced}/${DR.claims.total}</b> claims sourced</span><span><b>1</b> thing to confirm</span><span>Citation-readiness <b>${v > 1 ? 84 : DR.score}</b>/100</span></div></div></div>
        ${state.scn.stale ? `<div class="card" style="border-color:var(--neg)"><div class="bd"><b>No review in 14 days.</b> <span class="muted">Reminded content-team@nike.com on day 3 and day 7. The run is parked as <span class="tag neg">Stale</span>; maya@nike.com has been told and can approve, reassign, or cancel.</span> <button class="pill-btn" id="reassign" style="margin-left:8px">Reassign to me</button></div></div>` : ""}
        ${state.run.edited ? `<div class="card" style="border-color:var(--blue)"><div class="bd"><b>Editing.</b> <span class="muted">Click into the draft to change it; approving records the edit and lands your text.</span> <button class="pill-btn ok" id="approveedits" style="margin-left:8px">✓ Approve with edits</button></div></div>` : ""}
        <div id="declinebox" class="card hidden"><div class="bd" style="display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap"><label for="dreason" style="flex:1;min-width:240px"><div class="small faint" style="margin-bottom:4px">Why decline? (the runner learns from this)</div><textarea id="dreason" rows="2" style="width:100%;font:inherit;padding:8px;border:1px solid var(--line);border-radius:8px">We're not publishing comparison content this quarter.</textarea></label><button class="pill-btn primary" id="declinego">Decline and cancel the run</button></div></div>
        <div id="sendbackbox" class="card hidden"><div class="bd" style="display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap"><label for="note" style="flex:1;min-width:240px"><div class="small faint" style="margin-bottom:4px">What should change?</div><textarea id="note" rows="2" style="width:100%;font:inherit;padding:8px;border:1px solid var(--line);border-radius:8px">Lead with the Vomero for high-mileage runners; shorten the apps section.</textarea></label><button class="pill-btn primary" id="sendbackgo">Send back to the runner</button></div></div>
        <div class="legend"><span><i style="border-color:#A9D9B9"></i>sourced (hover for the source)</span><span><i style="border-color:#F0C766"></i>needs your confirmation</span></div>
        <div class="review">
          <div class="briefcol"><div class="card"><div class="hd"><b>The brief</b></div><div class="bd">
            <div><h4>Argue</h4><div>${esc(a.usp)}</div></div><div><h4>Primary query</h4><div>“${esc(a.primary_query)}”</div></div>
            <div><h4>Sections</h4><ol style="margin:0;padding-left:18px">${a.sections.map(s => `<li>${esc(s.label)}</li>`).join("")}</ol></div>
            <div><h4>Never write</h4><div class="muted">${a.never_write_terms.join(" · ")}</div><div class="small faint" style="margin-top:4px">1 hit in draft, replaced: <s>best</s> → prioritise</div></div>
            <div><h4>Required input</h4><div style="border:1px dashed var(--warn);background:var(--warn2);border-radius:8px;padding:6px 8px">${esc(a.required_inputs[0])}</div></div>
            <div><h4>Winning sources studied</h4><div class="small muted">${a.winning_sources.map(w => w[0].split("/")[0]).join(" · ")}</div></div>
          </div></div>${decisionsCard()}</div>
          <div class="card doc" ${state.run.edited ? 'contenteditable="true" style="outline:2px solid var(--blue);outline-offset:2px"' : ""}>
            <div class="meta">meta title · ${esc(DR.meta_title)} <span class="faint">55/60</span>${v > 1 ? ' · <span class="tag blue">v2</span>' : ""}</div>
            <h1>${esc(DR.h1)}</h1>
            <div class="chunk"><div class="lb">citation-ready chunk · 64 words</div>${DR.sections[0].chunk.slice(0, 2).map(claim).join(" ")}</div>
            ${DR.sections.map(s => `<h2>${esc(s.h2)}</h2><div class="chunk"><div class="lb">citation-ready chunk</div>${s.chunk.map(claim).join(" ")}</div><ul>${s.bullets.map(b => `<li>${claim(b)}</li>`).join("")}</ul>`).join("")}
            <h2>Frequently asked questions</h2><ul>${DR.faq.map(f => `<li><b>${esc(f.q)}</b> ${esc(f.a)}</li>`).join("")}</ul>
            <details><summary>Structured data · JSON-LD (Article + FAQPage)</summary><pre>${esc(JSON.stringify(JSON.parse(DR.jsonld), null, 1))}</pre></details>
          </div>
        </div>
      </div>`;
    $("#back").onclick = () => nav("run");
    $("#approve").onclick = () => { decide("content-team@nike.com", `Approved draft v${v}`); state.run.status = "publish"; nav("handoff"); };
    $("#edit").onclick = () => { state.run.edited = !state.run.edited; render(); };
    const ae = $("#approveedits"); if (ae) ae.onclick = () => { decide("content-team@nike.com", `Edited and approved draft v${v}`); state.run.status = "publish"; nav("handoff"); };
    $("#declinerev").onclick = () => { $("#declinebox").classList.toggle("hidden"); $("#dreason").focus(); };
    $("#declinego").onclick = () => { const why = $("#dreason").value.trim(); decide("content-team@nike.com", `Declined the draft — “${why}”`); state.run.status = "cancelled"; state.run.cancelReason = "Declined at review: “" + why + "”."; state.action = "ACCEPTED"; nav("run"); };
    const ra = $("#reassign"); if (ra) ra.onclick = () => { delete state.scn.stale; state.run.status = "review"; decide("maya@nike.com", "Reassigned the review to herself after 14 days"); render(); };
    $("#sendback").onclick = () => { $("#sendbackbox").classList.toggle("hidden"); $("#note").focus(); };
    $("#sendbackgo").onclick = () => { state.run.note = $("#note").value.trim() || "Revise."; decide("content-team@nike.com", `Sent back v${v}: “${state.run.note}”`); state.run.version = v + 1; state.run.status = "revision"; nav("run"); };
  }

  /* ---------- Hand-off (SMA-10) ---------- */
  function renderHandoff() {
    crumb.innerHTML = `<span class="faint">Actions</span><span class="faint">›</span><span class="faint">${esc(anchor.title)}</span><span class="faint">›</span><span>Run</span>`;
    main.innerHTML = `
      <div class="detail-hd"><button class="pill-btn ghost" id="back">‹ Action</button>${runTag()}<span class="sp" style="flex:1"></span><button class="pill-btn" id="jump" style="border-color:var(--warn);color:var(--warn)">⏭ Jump to day 30 <span class="small">(demo control)</span></button></div>
      <div class="content fade">
        ${state.scn.nodest ? `<div class="card" style="border-color:var(--warn)"><div class="hd"><b>Where should drafts land?</b><span class="tag warn">Not configured</span></div><div class="bd" style="display:flex;gap:10px;flex-wrap:wrap;align-items:center"><span class="muted">One-time setup per project. Until then the approved draft waits here and can be downloaded.</span><span class="sp" style="flex:1"></span>${["Google Docs", "WordPress", "Webflow", "GitHub PR", "Linear ticket"].map(d => `<button class="pill-btn dest" data-d="${d}">${d}</button>`).join("")}<button class="pill-btn ghost">⬇ Download .docx</button></div></div>` : ""}
        ${state.scn.nudged ? `<div class="card" style="border-color:var(--warn)"><div class="bd"><b>7 days, no URL.</b> <span class="muted">One nudge sent to content-team@nike.com today. No further nudges — the run keeps checking daily and picks the URL up itself when it appears.</span></div></div>` : ""}
        <div class="card runlog"><div class="hdr"><span class="st">Approved by content-team@nike.com</span><span class="faint">·</span><span class="faint">just now</span></div><div class="steps" id="steps2"></div></div>
        <div class="card"><div class="hd"><b>Tell the run the page is live</b><span class="sp" style="flex:1"></span><span class="small faint">or it finds the URL itself in Crawl Insights / Sources</span></div><div class="bd" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><input id="liveurl" type="url" value="https://www.nike.com/a/pegasus-vs-vomero-cushioning-guide" style="flex:1;min-width:260px;font:inherit;padding:8px 10px;border:1px solid var(--line);border-radius:8px" aria-label="Published URL"><button class="pill-btn primary" id="marklive">Mark as live</button><div class="small muted" style="width:100%">The run does not trust a Done click. It waits until the URL exists: a pasted link, a CMS publish webhook, or the URL appearing in Crawl Insights or Sources. If nothing appears in 7 days it nudges the owner once.</div></div></div>
        ${decisionsCard()}
      </div>`;
    $("#back").onclick = () => nav("action/" + anchor.id);
    const el = $("#steps2");
    const items = [
      `<div class="step done show"><span class="d"></span><div><div class="l">Landed the approved draft <span class="tool">Google Docs</span></div><div class="r">📄 <b>Nike / Content / GEO / Pegasus vs Vomero — draft.gdoc</b> · shared with content-team@nike.com · link recorded on the action</div></div></div>`,
      `<div class="step done show"><span class="d"></span><div><div class="l">Marked the action’s steps as covered <span class="tool">update_action_steps</span></div><div class="r">3 brief points · 14 of 20 prompts · the only write the runner makes inside Peec</div></div></div>`,
      `<div class="step done show"><span class="d"></span><div><div class="l">Baseline frozen for verification <span class="tool">get_brand_report</span></div><div class="r">20 prompts × 3 engines, as of today</div></div></div>`,
      `<div class="step warn show"><span class="d"></span><div><div class="l">Waiting to publish</div><div class="r">Checking daily for the URL. Nudge after 7 days.</div></div></div>`
    ];
    if (state.scn.nodest) { items[0] = `<div class="step warn show"><span class="d"></span><div><div class="l">Draft ready — no destination configured</div><div class="r">Waiting for a destination. Draft is held on the run.</div></div></div>`; }
    if (state.scn.autofound) items.push(`<div class="step done show"><span class="d"></span><div><div class="l">URL found by Peec <span class="tool">Crawl Insights · Sources</span></div><div class="r">nike.com/a/pegasus-vs-vomero-cushioning-guide appeared in server logs (GPTBot, 09:14) — no one had to paste it. <button class="pill-btn primary small" id="autogo">Start watching →</button></div></div></div>`);
    if (state.scn.nudged) state.run.status = "nudged";
    items.forEach((s, i) => timers.push(setTimeout(() => { el.appendChild(h(s)); const ag = $("#autogo"); if (ag) ag.onclick = () => { state.run.liveUrl = "https://www.nike.com/a/pegasus-vs-vomero-cushioning-guide"; decide("Peec", "Found the published URL in Crawl Insights"); state.run.status = "watching7"; nav("report", { day: 7 }); }; }, state.reduced ? 0 : 250 + i * 500)));
    main.querySelectorAll(".dest").forEach(b => b.onclick = () => { state.settings.destination = b.dataset.d; delete state.scn.nodest; decide("maya@nike.com", "Configured destination: " + b.dataset.d); render(); });
    $("#marklive").onclick = () => { state.run.liveUrl = $("#liveurl").value; decide("content-team@nike.com", "Marked the page live: " + state.run.liveUrl); state.run.status = "watching7"; nav("report", { day: 7 }); };
    $("#jump").onclick = () => { state.run.liveUrl = state.run.liveUrl || $("#liveurl").value; state.run.status = "watching"; nav("report", { day: 30 }); };
  }

  /* ---------- Report (SMA-10) ---------- */
  function spark(day, flat) {
    const pts = flat ? [0.66, 0.66, 0.66, 0.67, 0.66, 0.66, 0.67, 0.66, 0.66] : day === 7 ? [0.66, 0.66, 0.67, 0.68] : [0.66, 0.66, 0.67, 0.68, 0.70, 0.71, 0.72, 0.73, 0.74];
    const w = 300, hh = 40, x = (i) => i / 8 * w, y = (v) => hh - (v - 0.6) / 0.2 * hh;
    const d = pts.map((v, i) => (i ? "L" : "M") + x(i).toFixed(1) + " " + y(v).toFixed(1)).join(" ");
    return `<svg viewBox="0 0 ${w} ${hh + 4}" class="spark" preserveAspectRatio="none" aria-label="visibility on target prompts"><path d="${d}" fill="none" stroke="#141414" stroke-width="1.5"/><circle cx="${x(1)}" cy="${y(0.66)}" r="3" fill="#C7891C"/><circle cx="${x(pts.length - 1)}" cy="${y(pts[pts.length - 1])}" r="3" fill="${flat ? "#C7891C" : "#1F9D55"}"/></svg>`;
  }
  function renderReport(params) {
    const day = params.day === "7" ? 7 : 30;
    const closed = ["done", "notverified"].includes(state.run.status);
    if (!closed) state.run.status = day === 7 ? "watching7" : "watching";
    crumb.innerHTML = `<span class="faint">Run</span><span class="faint">›</span><span>Day ${day} report</span>`;
    const t = SYN.target_prompt_visibility, url = state.run.liveUrl || ("https://www." + SYN.url), d7 = day === 7;
    const nomove = !!state.scn.nomove && !d7, noconn = !!state.scn.noconn, broken = !!state.scn.broken;
    const chain = nomove ? [
      ["ok", "Published", "Sep 18", url.replace(/^https?:\/\/(www\.)?/, "")], [noconn ? "" : "ok", "Fetched by", noconn ? "—" : "3 of 3 bots", noconn ? "connect server logs to see fetches" : "GPTBot · PerplexityBot · Google-Extended"], ["ok", "Retrieved", "2 / 20 prompts", "retrieved, rarely cited"], ["bad", "Cited", "0 chats", "the engines still cite RunRepeat and iRunFar"], ["bad", "Target prompts", `${pct(t.before)} → ${pct(t.before)}`, "flat on every engine"], [noconn ? "" : "ok", "AI referrals", noconn ? "—" : "3 sessions", noconn ? "connect GA4 to see referrals" : "GA4 · 30 days"]
    ] : d7 ? [
      ["ok", "Published", "Sep 18", url.replace(/^https?:\/\/(www\.)?/, "")], ["bad", "Fetched by", "2 of 3 bots", "GPTBot Sep 19 · PerplexityBot Sep 20 · <b>Google-Extended: no</b>"], ["ok", "Retrieved", "1 / 20 prompts", "first retrieval Sep 21"], ["", "Cited", "0 chats", "typical crawl-to-citation here: 5–12 days"], ["", "Target prompts", `${pct(t.before)} → ${pct(t.day7)}`, "too early to read"], ["", "AI referrals", "4 sessions", "GA4 · 7 days"]
    ] : [
      ["ok", "Published", "Sep 18", url.replace(/^https?:\/\/(www\.)?/, "")], [noconn ? "" : "bad", "Fetched by", noconn ? "—" : "2 of 3 bots", noconn ? "connect server logs to see fetches" : "GPTBot Sep 19 · PerplexityBot Sep 20 · <b>Google-Extended: no</b>"], ["ok", "Retrieved", "6 / 20 prompts", "first retrieval Sep 21 · crawl-to-retrieval 3 days"], ["ok", "Cited", "4 chats", "ChatGPT 3 · Perplexity 1"], ["ok", "Target prompts", `${pct(t.before)} → ${pct(t.day30)}`, "avg visibility, 20 prompts"], [noconn ? "" : "ok", "AI referrals", noconn ? "—" : `${SYN.ai_referred_sessions_30d} sessions`, noconn ? "connect GA4 to see referrals" : "GA4 · 30 days · 2 conversions"]
    ];
    if (broken) chain[0] = ["bad", "Published", "Sep 18", "URL returned <b>404</b> on Sep 20 — redirect or restore it"];
    const bars = Object.entries(SYN.by_channel_day30).map(([k, [b, a]]) => { const av = nomove ? b + 0.004 : d7 ? b + (a - b) * 0.2 : a; return `<div class="bar"><span>${chName(k)}</span><div class="tr"><span class="a" style="width:${av * 100}%;opacity:.85"></span><span class="mk" style="left:${b * 100}%"></span></div><span class="n">${pct(b)} → ${pct(av)} <span class="${av > b + 0.005 ? "up" : "flat"}">${av > b + 0.005 ? "+" + Math.round((av - b) * 100) : "±0"}</span></span></div>`; }).join("");
    const summary = nomove ? `Published Sep 18 and fetched by all three bots, but after 30 days it is retrieved for only 2 of the 20 target prompts and cited in none. Visibility on the target prompts is flat. Most likely reason: the engines keep citing RunRepeat and iRunFar for these questions — the page is reachable and readable, it just isn't winning. This run is closed as <b>not verified</b>. Proposed next action: a comparison-format page (the format that wins these prompts), not another article.` : d7 ? `Published Sep 18. Fetched by GPTBot and PerplexityBot within two days; Google-Extended has not fetched it — robots.txt lists it as Partial, and the fix already exists as an action. Retrieved once so far, not yet cited; that's normal for day 7 in this category. Next check: day 30.`
      : `Published Sep 18. Fetched by GPTBot and PerplexityBot within two days; Google-Extended has not fetched it — robots.txt lists it as Partial, and the fix already exists as an action. Retrieved for 6 of the 20 target prompts, cited in 4 chats. Visibility on the target prompts moved from ${pct(t.before)} to ${pct(t.day30)}: ChatGPT +10, Perplexity +11, AI Overview unchanged. ${SYN.ai_referred_sessions_30d} sessions arrived from AI assistants.`;
    main.innerHTML = `
      <div class="detail-hd"><button class="pill-btn ghost" id="back">‹ Action</button>${runTag()}<span class="tag ill">Illustrative — nothing has been published; mechanics real, numbers invented</span><span class="sp" style="flex:1"></span>
        <span class="seg" style="margin:0;display:inline-grid"><span class="${d7 ? "on" : ""}" id="d7" role="button" tabindex="0">Day 7</span><span class="${d7 ? "" : "on"}" id="d30" role="button" tabindex="0">Day 30</span></span><button class="pill-btn" id="restart">↺ Start over</button></div>
      <div class="content fade">
        <div class="mail"><div class="mh"><span>📨 To: <b>maya@nike.com</b>, content-team@nike.com</span><span class="faint">·</span><span>From: Peec · Action Runs</span><span class="faint">·</span><span>Day ${day}</span></div><div class="mb"><div class="subj">“${esc(DR.h1)}” — what happened in ${day} days</div><p class="muted">${summary}</p></div></div>
        <div class="chain">${chain.map(([c, k, v, s]) => `<div class="node ${c}"><h4>${k}</h4><div class="v">${v}</div><div class="s ${k === "Published" ? "mono small" : ""}">${s}</div></div>`).join("")}</div>
        <div class="pair">
          <div class="card"><div class="hd"><b>By engine</b><span class="sp" style="flex:1"></span><span class="small faint">before → day ${day}</span></div><div class="bd bars">${bars}</div></div>
          <div class="card"><div class="hd"><b>The six red prompts</b></div><div class="bd"><table class="gp"><tr><th>Prompt</th><th style="text-align:right">Before</th><th style="text-align:right">Day ${day}</th></tr>${SYN.gap_prompts_day30.map(([p, b, a]) => { const av = (d7 || nomove) ? b : a; return `<tr><td>${esc(p)}</td><td class="n">${pct(b)}</td><td class="n" style="${av > b ? "color:var(--pos)" : "color:var(--ink3)"}">${pct(av)}</td></tr>`; }).join("")}<tr><td>Show me where to order custom-designed sports apparel.</td><td class="n">30%</td><td class="n" style="color:var(--ink3)">${(d7 || nomove) ? "30%" : "31%"}</td></tr></table></div></div>
        </div>
        ${broken ? `<div class="card" style="border-color:var(--neg)"><div class="hd"><b>Blocker</b><span class="tag neg">URL broken</span></div><div class="bd">The published URL returned 404 on Sep 20 and again on Sep 21. Bots that fetched it earlier will drop it. Restore the page or add a redirect; the run keeps watching.</div></div>` : ""}
        ${noconn ? `<div class="card" style="border-color:var(--warn)"><div class="hd"><b>Two signals missing</b></div><div class="bd muted">Server logs (Crawl Insights) and GA4 (AI Referrals) aren't connected on this project, so the run can't see fetches or referrals. Citations and prompt movement still verify. <a href="#/about">Connect in Agent analytics →</a></div></div>` : ""}
        ${state.run.inputAnswered || d7 ? "" : `<div class="card" style="border-color:var(--warn)"><div class="bd muted"><b>Still unanswered:</b> the arch-support classification. The page carries a marked placeholder; one sentence from the product team closes it.</div></div>`}
        <div class="card ${nomove ? "hidden" : ""}"><div class="hd"><b>Blocker</b><span class="tag warn">1</span></div><div class="bd" style="display:flex;gap:12px;align-items:center;flex-wrap:wrap"><span>Google-Extended isn’t fetching the page — robots.txt lists it as <b>Partial</b> (Crawlability: 49 bots with restrictions, 0 fully open).</span><span class="sp" style="flex:1"></span><a class="pill-btn" href="#/action/01a0667a-a9ad-77c2-8188-54e4cfae67ca" style="text-decoration:none">Open a site-audit action →</a></div></div>
        ${d7 ? "" : `<div class="next"><div><div class="small faint">Next action · proposed by the run</div><b>${nomove ? "Create a Pegasus vs Vomero comparison page — the format that wins these prompts." : "Expand the FAQ: “arch type” is answered but not cited yet; 2 sub-questions still uncovered."}</b><div class="muted small" style="margin-top:4px">${nomove ? "New content brief; runs tonight if accepted." : "Same page, same run — starts tonight if accepted."}</div></div><div style="display:flex;gap:8px"><button class="pill-btn primary" id="acceptnext">✓ Accept</button><button class="pill-btn" id="markdone">Close run</button></div></div>`}
        <div class="impact-strip"><b>Impact</b><span class="faint">·</span><span class="muted">visibility, target prompts, ${day} days</span>${spark(day, nomove)}<span class="tag" style="border-color:var(--warn);color:var(--warn)">⚡ links to this run</span></div>
        ${decisionsCard()}
      </div>`;
    $("#back").onclick = () => nav("action/" + anchor.id);
    $("#restart").onclick = resetAll;
    const d7b = $("#d7"), d30b = $("#d30");
    d7b.onclick = () => nav("report", { day: 7 }); d30b.onclick = () => nav("report", { day: 30 });
    [d7b, d30b].forEach(b => b.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); b.click(); } });
    const an = $("#acceptnext"); if (an) an.onclick = (e) => { e.target.textContent = "✓ Accepted — runs tonight"; e.target.disabled = true; decide("maya@nike.com", "Accepted the next action proposed by the run"); };
    const md = $("#markdone"); if (md) md.onclick = () => { state.run.status = nomove ? "notverified" : "done"; state.action = "DONE"; decide("Peec", nomove ? "Closed the run as not verified" : "Closed the run as done · verified"); render(); };
  }

  /* ---------- AI settings (A7, A8) ---------- */
  function renderSettings() {
    crumb.innerHTML = `<span class="faint">Agent</span><span class="faint">›</span><span>AI settings</span>`;
    const s = state.settings;
    main.innerHTML = `<div class="content fade" style="max-width:820px">
      <div><h1>AI settings</h1><p class="muted">Usage, context, and permissions for the agent in this project</p></div>
      <div class="seg" style="max-width:320px"><span>Usage</span><span>Context</span><span class="on">Behavior</span></div>
      <div class="card"><div class="bd" style="display:flex;flex-direction:column;gap:18px">
        <label style="display:flex;gap:14px;align-items:flex-start;cursor:pointer"><input type="checkbox" id="aa" ${s.autoApprove ? "checked" : ""} style="margin-top:4px"><div><b>Auto-approve actions</b> ${s.autoApprove ? '<span class="tag blue">On</span>' : ""}<div class="muted small">Skip tool approval cards — the agent acts without asking. Only affects new chats.</div><div class="small" style="margin-top:6px">Also start runs without a person accepting, for actions rated <select id="band" style="font:inherit;padding:2px 6px;border:1px solid var(--line);border-radius:6px"><option ${s.band === "Very high" ? "selected" : ""}>Very high</option><option ${s.band === "High" ? "selected" : ""}>High</option></select> or above. Runs still stop at Review.</div></div></label>
        <label style="display:flex;gap:14px;align-items:flex-start;cursor:pointer"><input type="checkbox" id="pause" ${s.paused ? "checked" : ""} style="margin-top:4px"><div><b>Pause all runs</b> ${s.paused ? '<span class="tag warn">Paused</span>' : '<span class="tag pos">Runs active</span>'}<div class="muted small">No new runs start; running ones pause at their next checkpoint. Nothing is deleted. Resume any time.</div>${s.paused ? '<div class="small" style="margin-top:6px">Status: all runs <b>Paused</b>' + (state.run.status === "paused" ? " · the open run stopped at its next checkpoint" : "") + '</div>' : ""}</div></label>
        <div style="display:flex;gap:14px;align-items:flex-start"><span style="width:13px"></span><div><b>Where approved drafts land</b><div class="muted small">One destination per project.</div><select id="dest" style="font:inherit;padding:6px 8px;border:1px solid var(--line);border-radius:6px;margin-top:6px">${["Google Docs", "WordPress", "Webflow", "GitHub PR", "Linear ticket"].map(d => `<option ${s.destination === d || (s.destination === "gdoc" && d === "Google Docs") ? "selected" : ""}>${d}</option>`).join("")}</select></div></div>
        <div style="display:flex;gap:14px;align-items:flex-start"><span style="width:13px"></span><div><b>Agent budget</b><div class="muted small">12% of this month used · a run costs roughly 15 tool calls to ground, one draft, one optimise pass, and daily verify calls for 30 days.</div></div></div>
      </div></div>
      <a href="#/actions">← Back to Actions</a></div>`;
    $("#aa").onchange = (e) => { s.autoApprove = e.target.checked; if (s.autoApprove && state.action === "PENDING" && state.run.status === "none") { state.action = "POLICY"; decide("policy (auto-approve)", "Scheduled a run for the Very high content brief"); } if (!s.autoApprove && state.action === "POLICY") state.action = "PENDING"; render(); };
    $("#band").onchange = (e) => { s.band = e.target.value; };
    $("#pause").onchange = (e) => { s.paused = e.target.checked; if (s.paused && state.run.status === "running") state.run.status = "paused"; if (!s.paused && state.run.status === "paused") state.run.status = "running"; decide("maya@nike.com", s.paused ? "Paused all runs" : "Resumed runs"); render(); };
    $("#dest").onchange = (e) => { s.destination = e.target.value; };
  }

  /* ---------- About / assumptions (SMA-11) ---------- */
  function renderAbout() {
    crumb.innerHTML = `<span>About this prototype</span>`;
    main.innerHTML = `<div class="content fade" style="max-width:760px">
      <h1>What is real and what is simulated</h1>
      <div class="card"><div class="bd" style="display:flex;flex-direction:column;gap:12px;font-size:14px">
        <div><b>Real (read from the “Nike for Maya” project via Peec's MCP on 14 Sep 2026):</b> the 31 actions and their impact bands; the content brief in full (headline options, meta, sections, questions, evidence, winning sources, never-write terms, required input); the 20 target prompts with Nike's 14-day visibility and position; brand and per-engine metrics; the fan-out searches behind the primary prompt; the sources cited by Google AI Overview on Sep 10; the top-cited pages for the topic; Crawlability's “49 bots with restrictions”.</div>
        <div><b>Added from the product UI (not exposed via MCP):</b> the 7 content-optimisation rows in the Actions list.</div>
        <div><b>Simulated:</b> the run itself — steps, timing and the plan panel are scripted; no agent, scheduler or tool is called. The draft was written for this prototype against the real brief. The Google Doc hand-off is a card, not a document. Everything after “Mark as live” — fetches, retrievals, citations, visibility movement, referrals — is invented and labelled <span class="tag ill">Illustrative</span>. Nothing has been published on nike.com.</div>
        <div><b>Not in this prototype:</b> real permissions, cost accounting beyond the budget line, content-optimisation and technical runs (second release), earned placements (out of scope).</div>
        <div><b>How production differs:</b> the run is a scheduled multi-step agent on Peec's existing harness using existing skills as steps; every read is an existing MCP tool (named in the run log); the one write inside Peec is <span class="mono">update_action_steps</span>; hand-off and live-detection are integrations; verification joins Crawl Insights, Sources, the brand report and AI Referrals to the action.</div>
      </div></div>
      <p class="muted small">Keys: 1–6 jump between screens · R resets · P hides the presenter bar · <b>C shows “Changes”</b> — numbered callouts on every element that differs from Peec today, with Today / Proposed / Why in a side panel (same numbers as 04-feature-spec.md). Filters on the Actions page live in the URL.</p>
      <div class="card"><div class="hd"><b>Beyond the happy path</b></div><div class="bd small"><b>On the pages:</b> Decline / Undo, Accept (scheduled tonight) vs Accept &amp; run now, Accept all / Decline all, Cancel a run, answer the required input, Edit &amp; approve, Send back, Decline at review, Close run, <a href="#/settings">AI settings</a> (auto-approve by impact band, pause all runs, destination). <b>In the Scenarios menu on the presenter bar:</b> budget exhausted, unreadable source, tool error (resumable), stale review, destination not configured, URL found automatically, nothing published after 7 days, published URL 404, day 30 nothing moved, logs / GA4 not connected. Full list with expected behaviour in <span class="mono">05-use-cases.md</span>.</div></div>
      <a href="#/actions">← Back to Actions</a></div>`;
  }

  /* ---------- presenter bar ---------- */
  const ORDER = [["actions", "1 Actions"], ["action/" + anchor.id, "2 Action"], ["run", "3 Run"], ["review", "4 Review"], ["handoff", "5 Hand-off"], ["report?day=30", "6 Day 30"]];
  function resetAll() { clearTimers(); state.run = freshRun(); state.action = "PENDING"; state.accepted = new Set(); state.declined = new Set(); state.scn = {}; state.settings = { autoApprove: false, band: "Very high", paused: false, destination: "gdoc" }; DR.claims.confirm = 3; DR.claims.sourced = 24; const b = DR.sections[0].bullets.find(x => x.src && x.src.startsWith("Provided by")); if (b) { b.k = "c"; b.src = "Required input — confirm with product team"; b.t = "Arch type: the current arch-support classification and recommended usage for the latest Pegasus and Vomero models."; } const sel = $("#scn"); if (sel) sel.value = ""; nav("actions"); }
  function coerce(seg, params) {
    const idx = { run: 2, review: 3, handoff: 4, report: 5 }[seg];
    if (idx == null) return;
    if (state.run.status === "none") { state.run.status = "running"; state.action = "ACCEPTED"; decide("maya@nike.com", "Accepted the action and started a run"); }
    if (idx >= 3 && ["running", "paused", "failed", "cancelled"].includes(state.run.status)) state.run.status = "review";
    if (idx >= 4 && ["review", "revision", "running"].includes(state.run.status)) { state.run.status = "publish"; if (!state.run.decisions.some(d => d.what.startsWith("Approved"))) decide("content-team@nike.com", "Approved draft v" + state.run.version); }
    if (idx >= 4 && state.run.status === "stale") state.run.status = "publish";
    if (idx >= 5 && ["publish", "nudged"].includes(state.run.status)) state.run.status = params.day === "7" ? "watching7" : "watching";
  }
  function updatePres() { const { seg, params } = parseHash(); document.querySelectorAll(".pres button[data-s]").forEach(b => { const k = b.dataset.s.split("?")[0].split("/")[0]; b.classList.toggle("on", k === seg && (seg !== "report" || (params.day || "30") === "30")); }); }
  function buildPres() {
    const bar = h(`<div class="pres" role="navigation" aria-label="presenter"><span class="lab">Demo</span>${ORDER.map(([s, l]) => `<button data-s="${s}">${l}</button>`).join("")}<select id="scn" title="Scenarios" style="font:inherit;font-size:12px;background:transparent;color:#ddd;border:1px solid rgba(255,255,255,.2);border-radius:999px;padding:4px 8px;max-width:210px">${SCENARIOS.map(([k, l]) => `<option value="${k}">${l}</option>`).join("")}</select><button data-a="spec" title="Show what changed vs Peec today (key C)">Changes</button><button data-a="about" title="What is real and what is simulated">ⓘ</button><span class="lab">1–6 · R reset · P hide</span></div>`);
    bar.querySelector("#scn").onchange = (e) => { state.scn = {}; if (e.target.value) state.scn[e.target.value] = true; const target = { budget: "run", source: "run", toolerr: "run", stale: "review", nodest: "handoff", autofound: "handoff", nudged: "handoff", broken: "report?day=30", nomove: "report?day=30", noconn: "report?day=30" }[e.target.value]; if (e.target.value) { state.run.resumed = false; if (["budget", "source", "toolerr"].includes(e.target.value)) { state.run = { ...freshRun(), status: "running", decisions: state.run.decisions }; } jumpTo(target); } else render(); };
    document.body.appendChild(bar);
    bar.querySelectorAll("button[data-s]").forEach(b => b.onclick = () => jumpTo(b.dataset.s));
    bar.querySelector("[data-a=about]").onclick = () => nav("about");
    bar.querySelector("[data-a=spec]").onclick = toggleSpec;
    document.addEventListener("keydown", (e) => { if (["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName)) return; const i = parseInt(e.key, 10); if (i >= 1 && i <= 6) jumpTo(ORDER[i - 1][0]); if (e.key === "r" || e.key === "R") resetAll(); if (e.key === "p" || e.key === "P") { state.presHidden = !state.presHidden; bar.classList.toggle("hidden", state.presHidden); } if (e.key === "c" || e.key === "C") toggleSpec(); });
  }
  function jumpTo(s) { const [path, q] = s.split("?"); const params = Object.fromEntries(new URLSearchParams(q || "")); if (path === "run") state._fast = true; nav(path, q ? params : undefined); }


  /* ---------- "Changes" mode: numbered callouts from 04-feature-spec.md §6.2 ---------- */
  let specObs = null, specTimer = null;
  try { state.spec = localStorage.getItem("ar.spec") === "1"; } catch (e) { state.spec = false; }
  function toggleSpec() { state.spec = !state.spec; try { localStorage.setItem("ar.spec", state.spec ? "1" : "0"); } catch (e) {} applySpec(); }
  function specKey() { const { seg, id } = parseHash(); if (seg === "action") return id === anchor.id ? "action" : null; return window.SPEC && window.SPEC[seg] ? seg : null; }
  function findEl(sel) {
    if (sel.css) { try { return main.querySelector(sel.css); } catch (e) { return null; } }
    if (sel.text) { const [tag, txt] = sel.text; const els = [...main.querySelectorAll(tag)].filter(e => (e.textContent || "").replace(/\s+/g, " ").includes(txt)); return els.length ? els[els.length - 1] : null; }
    return null;
  }
  function clearSpec() { document.querySelectorAll(".spec-badge,.spec-ring").forEach(e => e.remove()); document.querySelectorAll(".spec-hl").forEach(e => e.classList.remove("spec-hl", "spec-hot")); const d = $("#specdrawer"); if (d) d.remove(); document.body.classList.remove("spec"); if (specObs) { specObs.disconnect(); specObs = null; } const pb = document.querySelector('.pres [data-a=spec]'); if (pb) pb.classList.toggle("act", !!state.spec); }
  function placeSpec() {
    document.querySelectorAll(".spec-badge,.spec-ring").forEach(e => e.remove());
    const key = specKey(); if (!key) return;
    const mr = main.getBoundingClientRect();
    window.SPEC[key].items.forEach(it => {
      const el = findEl(it.sel); if (!el) return;
      const r = el.getBoundingClientRect(); if (!r.width && !r.height) return;
      el.classList.add("spec-hl");
      const ring = h(`<div class="spec-ring" data-n="${it.n}"></div>`); ring.style.cssText = `left:${r.left - mr.left - 4}px;top:${r.top - mr.top - 4}px;width:${r.width + 8}px;height:${r.height + 8}px`;
      const b = h(`<div class="spec-badge" data-n="${it.n}" title="${esc(it.label)}">${it.n}</div>`); b.style.cssText = `left:${r.left - mr.left - 14}px;top:${r.top - mr.top - 14}px`;
      main.appendChild(ring); main.appendChild(b);
      const hot = (on) => { document.querySelectorAll(`#specdrawer .e[data-n="${it.n}"]`).forEach(x => { x.classList.toggle("hot", on); if (on) x.scrollIntoView({ block: "nearest" }); }); el.classList.toggle("spec-hot", on); ring.classList.toggle("hot", on); };
      [b, el].forEach(x => { x.addEventListener("mouseenter", () => hot(true)); x.addEventListener("mouseleave", () => hot(false)); });
      b.onclick = (e) => { e.stopPropagation(); hot(true); };
    });
  }
  function applySpec() {
    clearSpec();
    if (!state.spec) return;
    document.body.classList.add("spec");
    const key = specKey();
    const sp = key ? window.SPEC[key] : null;
    const d = h(`<aside id="specdrawer" aria-label="What changed"><div class="dh"><b>What changed vs Peec today</b><span class="sp" style="flex:1"></span><button class="x" id="specclose" title="Hide (C)">✕</button></div>
      ${sp ? `<div class="dt">${esc(sp.title)}</div><div class="ds">Hover a number on the screen, or an entry here. Same numbers as 04-feature-spec.md §6.2.</div>
      ${sp.items.map(it => `<div class="e" data-n="${it.n}"><span class="n">${it.n}</span><div class="t"><b>${esc(it.label)}</b><span><span class="k">Today</span><span class="today">${esc(it.today)}</span></span><span><span class="k">Proposed</span>${esc(it.proposed)}</span><span><span class="k">Why</span><span class="why">${esc(it.why)}</span></span></div></div>`).join("")}
      ${sp.notes.map(n => `<div class="note">${esc(n)}</div>`).join("")}` : `<div class="ds">No callouts on this page. The changes are on: Overview, Actions, the content-brief action, Run, Review, Hand-off, Report, AI settings.</div>`}</aside>`);
    document.body.appendChild(d);
    $("#specclose").onclick = toggleSpec;
    d.querySelectorAll(".e").forEach(e => { const n = e.dataset.n; e.addEventListener("mouseenter", () => { document.querySelectorAll(`.spec-ring[data-n="${n}"]`).forEach(r => r.classList.add("hot")); e.classList.add("hot"); }); e.addEventListener("mouseleave", () => { document.querySelectorAll(`.spec-ring[data-n="${n}"]`).forEach(r => r.classList.remove("hot")); e.classList.remove("hot"); }); e.onclick = () => { const r = document.querySelector(`.spec-badge[data-n="${n}"]`); if (r) r.scrollIntoView({ block: "center", behavior: "smooth" }); }; });
    placeSpec();
    specObs = new MutationObserver(() => { clearTimeout(specTimer); specTimer = setTimeout(placeSpec, 120); });
    specObs.observe(main, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "style"] });
  }
  window.addEventListener("resize", () => { if (state.spec) placeSpec(); });

  /* ---------- router ---------- */
  function render() {
    clearTimers();
    const { seg, id, params } = parseHash();
    coerce(seg, params);
    const fast = state._fast; state._fast = false;
    switch (seg) {
      case "overview": renderOverview(); break;
      case "actions": renderList(params); break;
      case "action": renderDetail(id); break;
      case "run": renderRun(fast); break;
      case "review": renderReview(); break;
      case "handoff": renderHandoff(); break;
      case "report": renderReport(params); break;
      case "about": renderAbout(); break;
      case "settings": renderSettings(); break;
      default: errorScreen("Page not found", `There is no page at “#/${seg}”.`);
    }
    window.scrollTo({ top: 0 }); updatePres(); applySpec();
    document.querySelectorAll(".nav a[data-r]").forEach(a => a.classList.toggle("on", a.dataset.r === seg || (a.dataset.r === "actions" && ["action", "run", "review", "handoff", "report"].includes(seg))));
  }
  /* self-test hook for automated checks (SMA-11) */
  window.__selftest = function () {
    const out = []; const t = (name, ok) => out.push({ name, ok: !!ok });
    t("fixture validates", validate(D) === null);
    t("all actions rendered", allItems.length === D.counts.total);
    t("anchor action is a content brief", anchor.type === "CONTENT_BRIEF");
    t("20 target prompts", targetPrompts.length === 20);
    t("draft has 3 sections", DR.sections.length === 3);
    t("claims add up", DR.claims.sourced + DR.claims.confirm === DR.claims.total);
    t("synthetic block labelled", typeof SYN.note === "string" && /invented/.test(SYN.note));
    return out;
  };
  buildPres(); render();
})();
