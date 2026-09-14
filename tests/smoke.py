"""Smoke test for the Action Runs prototype (SMA-11). Run: python3 tests/smoke.py [path-to-action-runs.html]
Requires playwright (pip install playwright && playwright install chromium)."""
import asyncio, sys, os
from playwright.async_api import async_playwright
PATH = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else "index.html")
async def main():
    fails = []
    def check(name, ok): print(("PASS " if ok else "FAIL ") + name); (ok or fails.append(name))
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={"width": 1440, "height": 900})
        errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
        U = "file://" + PATH
        await pg.goto(U); await pg.wait_for_timeout(500)
        for t in await pg.evaluate("window.__selftest()"): check("selftest: " + t["name"], t["ok"])
        await pg.goto(U + "#/actions?type=Technical+SEO+fix&impact=Very+high"); await pg.wait_for_timeout(300)
        check("filters persist in URL and narrow the list", await pg.locator(".row").count() == 4)
        await pg.goto(U + "#/actions?q=zzzz"); await pg.wait_for_timeout(300)
        check("empty state", await pg.locator("text=No actions match").count() == 1)
        await pg.goto(U + "#/action/nope"); await pg.wait_for_timeout(300)
        check("not-found state", await pg.locator("text=Action not found").count() == 1)
        await pg.goto(U + "#/actions"); await pg.wait_for_timeout(300)
        await pg.click(".row.hl"); await pg.wait_for_timeout(300); await pg.click("#acceptrun"); await pg.wait_for_timeout(300)
        await pg.click("#skip"); await pg.wait_for_timeout(300)
        check("run reaches review", await pg.locator("#openreview:not(.hidden)").count() == 1)
        await pg.click("#openreview"); await pg.wait_for_timeout(300)
        check("no hand-off before approval", "#/review" in pg.url)
        await pg.click("#sendback"); await pg.click("#sendbackgo"); await pg.wait_for_timeout(300)
        check("send back returns to revision", (await pg.locator(".runlog .st").inner_text()).startswith("Revision"))
        await pg.click("#skip"); await pg.wait_for_timeout(300); await pg.click("#openreview"); await pg.wait_for_timeout(300)
        await pg.click("#approve"); await pg.wait_for_timeout(400)
        check("approval changes state to waiting-to-publish", "#/handoff" in pg.url)
        await pg.click("#marklive"); await pg.wait_for_timeout(400)
        check("mark live opens day-7 report", "#/report?day=7" in pg.url)
        check("illustrative label present", await pg.locator(".tag.ill").count() >= 1)
        await pg.click("#d30"); await pg.wait_for_timeout(300)
        check("decisions traceable", await pg.locator("text=Approved draft v2").count() == 1)
        check("no page errors", not errs)
        await b.close()
    print("\n%d failure(s)" % len(fails)); sys.exit(1 if fails else 0)
asyncio.run(main())
