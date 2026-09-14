import json
import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
rd=lambda f: open(os.path.join("src",f)).read()
data=rd("data.json"); css=rd("app.css"); draft=rd("draft.js"); app=rd("app.js")
nav=lambda r,label,extra="": f'<a href="#/{r}" data-r="{r}"><span class="ic"></span>{label}{extra}</a>'
dead=lambda label,extra="": f'<a href="#/actions" onclick="return false" style="color:var(--ink3)"><span class="ic"></span>{label}{extra}</a>'
shell=f'''<title>Action Runs</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap">
<style>{css}</style>
<div class="app">
  <aside class="side">
    <div class="proj"><span class="logo"></span><span>Nike for Ma…</span><span class="faint" style="font-size:10px">▾</span></div>
    <div class="seg"><span class="on">Browse</span><span>Agent <span style="font-size:11px;color:var(--ink3)">1</span></span></div>
    <nav class="nav">
      <h5>Home</h5>{nav("overview","Overview")}{dead("My website")}
      <h5>Brand</h5>{dead("Insights")}{dead("Perception")}
      <h5>Prompts</h5>{dead("All prompts")}
      <h5>Sources</h5>{dead("Gap Analysis")}{dead("Domains")}{dead("URLs")}
      <h5>Optimize <span class="beta" style="margin-left:6px">Beta</span></h5>{nav("actions","Actions")}{dead("Impact")}
      <h5>Results</h5>{dead("Ranking")}{dead("Chats")}{dead("Fanouts")}
      <h5>Agent analytics</h5>{dead("Crawl Insights")}{dead("Crawlability")}{dead("AI Referrals",' <span class="beta">Beta</span>')}
      <h5>Agent</h5>{nav("settings","AI settings")}
      <h5>Prototype</h5>{nav("about","About this prototype")}
    </nav>
    <div class="user"><span class="av">SP</span>spivakmaiia@gmail.com</div>
  </aside>
  <div class="main">
    <div class="top"><span class="faint">▭</span><div class="crumb" id="crumb"></div><span class="sp"></span><span class="pill-btn">💬 Agent</span><span class="pill-btn">ⓘ Help</span></div>
    <div id="main"><div class="content"><div class="card"><div class="bd muted">Loading fixture…</div></div></div></div>
  </div>
</div>
<script>window.DATA={data};</script>
<script>{draft}</script>
<script>{app}</script>
'''
open("artifact.html","w").write(shell)
open("index.html","w").write('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>'+shell+'</body></html>')
print("built",len(shell))
