# Profile chat service

This is the source mirror for the separately hosted Sites Worker used by https://kylin0421.github.io. See the root README for the publication and knowledge refresh flow. Do not deploy this directory as GitHub Pages; it is excluded from the Jekyll output.

Required runtime secret: `DEEPSEEK_API_KEY`. Required managed binding: `DB` (D1). Never put a real secret in any file. The public model ID is `deepseek-flash`.

Run `node scripts/test.mjs`, `node scripts/build.mjs`, then `node scripts/validate-artifact.mjs`. The build copies the Worker and schema-only migrations into `dist/` for the Sites packager. On Windows, prefer Git for Windows Bash over the WSL launcher when running the Sites packaging helper.
