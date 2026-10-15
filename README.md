# Su Linxiang's Website

Website: https://kylin0421.github.io/ · Posts: https://kylin0421.github.io/posts/

The home page contains a short About and a DeepSeek profile chat. The full profile remains at `/about/`; writing, search and tag filters live at `/posts/`.

Every GitHub Pages build generates `/knowledge.json` directly from the current About, author links and all published posts. Publishing, editing or deleting a post through the editor updates that knowledge on the next Pages build. The chat server refreshes its knowledge cache after 60 seconds; GitHub Pages/CDN propagation may add a few minutes. There is no separate manual indexing step. The public website is the only source of personal information supplied to the model.

Chat replies cite source pages and use the current About to resolve changes in interests over time. Messages stay in browser memory and are sent to DeepSeek to answer the question. The application does not persist conversation text. Like all LLM answers, claims and citations should be checked against the linked pages.

`_data/profile_chat.yml` contains only the public server endpoint. `chat-service/` contains a mirror of the separately deployed Sites Worker, build scripts, schema migration and tests. Its deployed project ID is in `chat-service/.openai/hosting.json`; retain that ID when updating the service. The deployment checkout on this machine is `C:/Users/andy/.codex/workspaces/linxiang-chat-service`. Copy changes into that checkout, run its tests/build, and publish through the Sites source workflow. The `DEEPSEEK_API_KEY` is stored as a Sites runtime secret, never in this repository, Jekyll config, knowledge data or browser code. Visitors need no account or API setup.

The backend calls `deepseek-flash` (DeepSeek V4.1 Flash), accepts only the website origin, limits question/history/body sizes, disables tools, sanitizes errors and uses atomic D1 counters for 20 requests per visitor address per hour and 150 requests site-wide per UTC day. Only hourly salted address hashes and expiring counts are stored. Origin checks reduce browser misuse; the shared daily quota also caps direct API abuse. A provider billing limit can be set independently in the DeepSeek account.

Local validation: `bundle exec ruby scripts/build-local.rb build`, `node editor/test-rendering.js`, `node editor/test-media.js`; then `node scripts/preview.cjs` to preview at `http://localhost:4318`. Backend: from `chat-service/`, run `node scripts/test.mjs`, `node scripts/build.mjs`, and `node scripts/validate-artifact.mjs`. Use Node 22 or newer for the SQLite-backed quota tests. The backend intentionally fails closed if its key, database or current knowledge is unavailable.

