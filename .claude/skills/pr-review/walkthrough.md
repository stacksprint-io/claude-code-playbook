# Walkthrough video

Record what a user would see. Findings that live only in code stay in the written review.

## Start the PR's version of the app
Everything for this review lives in `.review/` inside the repo, helper files included. Never commit it.
1. `git worktree add .review/pr-<n> refs/pr/<n>`, so your own branch stays as it is.
2. Start the app from `.review/pr-<n>` the way its CLAUDE.md says, in the background, and wait until the page loads.

## Plan, then record
1. `playwright-cli open <url>` and `playwright-cli resize 960 720`. Try each finding's steps once and pick a stable CSS selector for every element you'll touch (snapshot refs change whenever the page re-renders). Overlays show only in the video, not in screenshots, so print each element's `boundingBox()` and keep the box and its label inside 960x720. Reload the page when you're done so the recording starts clean.
2. `playwright-cli video-start .review/pr-<n>.webm --size 960x720 --cursor`
3. For each finding a user can see, in the review's order, run one chained command so the video never sits still while you think:
   - `playwright-cli video-chapter "<N> - <SEVERITY> - <file>:<line>" --description "<the finding in one line>" --duration 3000`
   - the steps a teammate would take to see it, one action at a time, with the selectors you picked
   - an overlay that marks what's wrong for 3 seconds: a red box around the element and a label "Expected <x>, got <y>", via `playwright-cli run-code` with `page.screencast.showOverlay(html, { duration: 3000 })`, placed from the element's `boundingBox()`. Wrap the code in single quotes so the shell leaves `$` alone.
4. If nothing a user can see is wrong, record the path the PR adds instead: one chapter "Tested: <what the PR does>", the steps, and the result.
5. `playwright-cli video-stop`, `playwright-cli close`, stop the app, `git worktree remove .review/pr-<n>`.

## Check before you report
- The file is under 10 MB (GitHub's video limit on free plans). If not, record again at 800x600.
- Each chapter number matches a finding number in the review.
