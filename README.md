# Su Linxiang's Website

Website: https://kylin0421.github.io/ · Posts: https://kylin0421.github.io/posts/

The home page contains a short About and a DeepSeek profile chat. The full profile remains at `/about/`; writing, search and tag filters live at `/posts/`.

Every GitHub Pages build generates `/knowledge.json` directly from the current About, CV, author links and all published posts. Publishing, editing or deleting a post through the editor updates that knowledge on the next Pages build. The chat server refreshes its knowledge cache after 60 seconds; GitHub Pages/CDN propagation may add a few minutes. There is no separate manual indexing step. The public website is the only source of personal information supplied to the model.

To update the CV, replace `assets/files/Su_Linxiang_CV.pdf` and publish that file to `master`. The Pages workflow extracts the PDF into the ignored build-only `_data/cv.json` on every build, then checks that its SHA-256 matches the exact downloadable PDF before deployment. Both the CV download and chatbot knowledge change together; no backend update is needed. A PDF with missing/unreadable text stops the build rather than silently keeping old CV text. For a local build, install `scripts/requirements-cv.txt`, run `python scripts/extract-cv.py` before Jekyll, and run `python scripts/verify-knowledge.py` afterwards. Production uses the custom workflow in `.github/workflows/pages.yml`.

Chat replies cite source pages and use the current About to resolve changes in interests over time. Messages stay in browser memory and are sent to DeepSeek to answer the question. The application does not persist conversation text. Like all LLM answers, claims and citations should be checked against the linked pages.

`_data/profile_chat.yml` contains only the public server endpoint. `chat-service/` contains a mirror of the separately deployed Sites Worker, build scripts, schema migration and tests. Its deployed project ID is in `chat-service/.openai/hosting.json`; retain that ID when updating the service. The deployment checkout on this machine is `C:/Users/andy/.codex/workspaces/linxiang-chat-service`. Copy changes into that checkout, run its tests/build, and publish through the Sites source workflow. The `DEEPSEEK_API_KEY` is stored as a Sites runtime secret, never in this repository, Jekyll config, knowledge data or browser code. Visitors need no account or API setup.

The backend calls `deepseek-flash` (DeepSeek V4.1 Flash), accepts only the website origin, limits question/history/body sizes, disables tools, sanitizes errors and uses atomic D1 counters for 20 requests per visitor address per hour and 150 requests site-wide per UTC day. Only hourly salted address hashes and expiring counts are stored. Origin checks reduce browser misuse; the shared daily quota also caps direct API abuse. A provider billing limit can be set independently in the DeepSeek account.

Local validation: `bundle exec ruby scripts/build-local.rb build`, `node editor/test-rendering.js`, `node editor/test-media.js`; then `node scripts/preview.cjs` to preview at `http://localhost:4318`. Backend: from `chat-service/`, run `node scripts/test.mjs`, `node scripts/build.mjs`, and `node scripts/validate-artifact.mjs`. Use Node 22 or newer for the SQLite-backed quota tests. The backend intentionally fails closed if its key, database or current knowledge is unavailable.


## Visitor statistics

Public dashboard: https://linxiang-profile-chat.finecrumb18.chatgpt.site/visitors (no login).

`assets/js/visitors.js` sends a bodyless request on a visible page. The server estimates daily unique visitors using an HMAC of the Budapest calendar date, connecting IP and browser user-agent, keyed by the runtime secret `ANALYTICS_SECRET`. Raw addresses and user-agents are not stored. Atomic D1 batches deduplicate repeated/concurrent visits. Only daily totals and today/yesterday's anonymous identifiers are retained; older identifiers are removed on the next recorded visit. No pageview counters, URLs, referrers, cookies or persistent browser identifiers are stored. Do Not Track, Global Privacy Control, common bots and browser automation are excluded. Blockers can prevent recording; shared networks/browsers can merge people, and changing network/device can split one person. The owner's visits also count. Daily counts are never presented as an all-time unique total. Recording starts at deployment; older traffic cannot be recovered.

Test: `node scripts/test-visitors.mjs` from `chat-service/`. Runtime secrets belong only in Sites. The public dashboard/API exposes aggregate daily counts only, never anonymous identifiers. It presents today, yesterday and up to 30 daily totals; older aggregate totals remain in the database.
