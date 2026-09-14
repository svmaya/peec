"""Use-case coverage test for the Action Runs prototype (05-use-cases.md). Run: python3 tests/usecases.py [path-to-html]"""
import asyncio, sys, os
from playwright.async_api import async_playwright
PATH = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else "index.html")
async def main():
    fails = []
    def check(name, ok): print(("PASS " if ok else "FAIL ") + name); (ok or fails.append(name))
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={"width": 1440, "height": 900})
        errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.on("dialog", lambda d: asyncio.ensure_future(d.accept("Not this quarter")))
        U = "file://" + PATH
        async def go(h): await pg.goto(U + h); await pg.wait_for_timeout(300)
        async def reset(): await pg.goto(U + "#/actions"); await pg.reload(); await pg.wait_for_timeout(400)
        async def click(sel): await pg.click(sel); await pg.wait_for_timeout(300)
        async def txt(): return await pg.locator("body").inner_text()
        # A3 Decline + Undo on the brief
        await go("#/actions"); await click(".row.hl"); await click("#decline")
        check("A3 decline shows Declined + Undo", "Declined" in await txt() and await pg.locator("#undo").count() == 1)
        await go("#/actions"); check("A3 declined leaves New list", await pg.locator(".row.hl").count() == 0)
        await go("#/actions?status=Declined"); check("A3 visible under status=Declined", await pg.locator(".row").count() >= 1)
        await go("#/action/01a08c13-7f79-7a11-b946-220fcdeb48fe"); await click("#undo")
        check("A3 undo restores accept buttons", await pg.locator("#acceptrun").count() == 1)
        # A1 Accept -> Scheduled -> Run now
        await click("#accept"); t = await txt()
        check("A1 accept schedules tonight", "02:00" in t and "Run now" in t)
        await go("#/actions?status=Scheduled"); check("A1 listed under Scheduled", await pg.locator(".row").count() >= 1)
        # A6 non-brief detail: accept, no run
        await go("#/actions?type=Technical+SEO+fix"); await click(".row >> nth=0")
        check("A6 technical detail has Accept, no Run", await pg.locator("#acc").count() == 1 and await pg.locator("#acceptrun").count() == 0)
        await click("#acc"); check("A6 accepted tag", await pg.locator(".detail-hd .tag:has-text('Accepted')").count() == 1)
        await go("#/actions?type=Technical+SEO+fix"); await click(".row >> nth=1"); await click("#dec"); check("A6 decline + undo", await pg.locator("#undo").count() == 1)
        # A4 / A5 bulk
        await go("#/actions"); await click("#acceptall"); check("A4 bulk confirm box", await pg.locator("#bulkbox").count() == 1)
        await click("#bulkgo"); await go("#/actions?status=Accepted"); n_acc = await pg.locator(".row").count()
        check("A4 accept all accepted many", n_acc >= 8)
        await reset()
        await click("#declineall"); await click("#bulkgo"); await go("#/actions?status=Declined")
        check("A5 decline all", await pg.locator(".row").count() >= 8)
        # A7 policy
        await reset(); await go("#/settings"); await click("#aa")
        await go("#/action/01a08c13-7f79-7a11-b946-220fcdeb48fe"); check("A7 started by policy", "policy" in (await txt()).lower())
        # A8 pause
        await go("#/settings"); await click("#pause"); t = await txt(); check("A8 paused shown", "Paused" in t)
        await click("#pause")
        # B3 cancel
        await reset(); await click(".row.hl"); await click("#acceptrun"); await pg.wait_for_timeout(600)
        await click("#cancel"); await pg.wait_for_timeout(400); t = await txt()
        check("B3 cancel -> cancelled, action Accepted", "Cancelled" in t and "Start a new run" in t)
        await go("#/action/01a08c13-7f79-7a11-b946-220fcdeb48fe"); check("B3 action back to Accepted", "Run now" in await txt())
        # B1 required input answered
        await reset(); await click(".row.hl"); await click("#acceptrun"); await click("#skip")
        await pg.fill("#answer", "Neutral arch, daily training"); await click("#useanswer")
        check("B1 answer drops confirm claims", "2 to confirm" in await txt() or "confirm: 2" in await txt() or "2 need" in await txt() or await pg.evaluate("window.DRAFT.claims.confirm") == 2)
        # B4/B5/B6 scenarios
        for key, needle in [("budget", "Budget"), ("source", "not yet scraped"), ("toolerr", "Failed")]:
            await reset(); await click(".row.hl"); await click("#acceptrun")
            await pg.select_option("#scn", key); await pg.wait_for_timeout(300); await click("#skip"); await pg.wait_for_timeout(500)
            t = await txt(); check(f"scenario {key} shows '{needle}'", needle.lower() in t.lower())
            if key != "source":
                ok = await pg.locator("#resume:not(.hidden)").count() == 1; check(f"scenario {key} resumable", ok)
                if ok: await click("#resume"); await click("#skip"); check(f"scenario {key} resumes to review", await pg.locator("#openreview:not(.hidden)").count() == 1)
        # C2 edit & approve
        await reset(); await click(".row.hl"); await click("#acceptrun"); await click("#skip"); await click("#openreview")
        await click("#edit"); check("C2 doc editable", await pg.locator("[contenteditable=true]").count() >= 1)
        await click("#approveedits"); check("C2 approve edits -> handoff", "#/handoff" in pg.url)
        await click("#d30" if await pg.locator("#d30").count() else "#marklive"); await pg.wait_for_timeout(300)
        # C4 decline at review
        await reset(); await click(".row.hl"); await click("#acceptrun"); await click("#skip"); await click("#openreview")
        await click("#declinerev"); await pg.fill("#dreason", "Off-brand"); await click("#declinego"); t = await txt()
        check("C4 decline at review -> cancelled", "Cancelled" in t)
        # C5 stale
        await reset(); await click(".row.hl"); await click("#acceptrun"); await click("#skip"); await click("#openreview")
        await pg.select_option("#scn", "stale"); await pg.wait_for_timeout(300); check("C5 stale banner", await pg.locator("#reassign").count() == 1)
        await click("#reassign"); check("C5 reassign clears", await pg.locator("#reassign").count() == 0)
        # D2 / D4 / D5
        await click("#approve"); await pg.wait_for_timeout(300)
        await pg.select_option("#scn", "nodest"); await pg.wait_for_timeout(300); check("D2 destination picker", await pg.locator(".dest").count() >= 3)
        await click(".dest >> nth=0"); check("D2 picking destination clears card", await pg.locator(".dest").count() == 0)
        await pg.select_option("#scn", "autofound"); await pg.wait_for_timeout(3000); check("D4 autofound", await pg.locator("#autogo").count() == 1)
        await click("#autogo"); check("D4 start watching -> report", "#/report" in pg.url)
        await pg.select_option("#scn", "nudged"); await pg.wait_for_timeout(300); check("D5 nudged", "nudge" in (await txt()).lower())
        # D6 / E3 / E5 / E7
        for key, needle in [("broken", "404"), ("nomove", "Not verified"), ("noconn", "connect")]:
            await pg.select_option("#scn", key); await pg.wait_for_timeout(300); t = await txt()
            check(f"scenario {key} shows '{needle}'", needle.lower() in t.lower())
        await pg.select_option("#scn", ""); await pg.wait_for_timeout(300); await go("#/report?day=30")
        if await pg.locator("#markdone").count():
            await click("#markdone"); check("E7 mark done", "Done" in await txt())
        else: check("E7 markdone present", False)
        await go("#/report?day=30")
        if await pg.locator("#acceptnext").count(): await click("#acceptnext"); check("E6 accept next action", "Accepted" in await txt() or "tonight" in await txt())
        check("no page errors: " + "; ".join(errs)[:300], not errs)
        await b.close()
    print("\n%d failure(s)" % len(fails)); sys.exit(1 if fails else 0)
asyncio.run(main())
