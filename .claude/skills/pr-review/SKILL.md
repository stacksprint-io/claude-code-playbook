---
name: pr-review
description: Review a GitHub pull request against this repo's own rules (CLAUDE.md, the spec's Done means, its tests and CI), rate its risk, and record a short video of each bug a user can see. Use when asked to review a PR, check whether PR #N is ready to merge, or before merging a pull request.
argument-hint: [pr-number]
allowed-tools: Bash(gh pr view:*), Bash(gh pr checks:*), Bash(gh pr diff:*), Bash(git fetch:*), Bash(git show:*), Bash(git worktree:*), Bash(gh issue view:*), Bash(playwright-cli:*), Read, Grep, Glob
---

## The pull request
!`gh pr view $ARGUMENTS --json number,title,headRefName,baseRefName,state || true`

## Checks
!`gh pr checks $ARGUMENTS || true`

## Diff
!`gh pr diff $ARGUMENTS || true`

## The PR's own files
!`git fetch -q origin pull/$ARGUMENTS/head:refs/pr/$ARGUMENTS && echo "fetched: read files with git show refs/pr/$ARGUMENTS:<path>" || true`

## Review in this order
0. If a section above is empty or an error (gh can't reach GitHub where this runs, as in a cloud thread), get the PR, its checks and its diff with the GitHub tools you have.
1. Branch: one pull request, from its own branch, into main.
2. Checks: take CI from the Checks section, not the author's word. A failing or missing check is a BLOCKER.
3. Files: read every changed file at the PR's head (git show refs/pr/<n>:<path>) and the tests that cover it. Check each against checklist.md, against docs/spec.md's Done means if it builds a spec feature, and against every point of the issue the PR closes (gh issue view).
4. Walkthrough: if the diff changes what a user sees (pages, scripts, styles), run the PR's version of the app and follow walkthrough.md: try every point of the issue in the browser, plus the edges a user would hit (empty, one, many). Skip this step for code a user never sees.

## Report
Write the review as Markdown to .review/pr-<n>.md, in this order:

**Summary**
- Risk: High if there's any BLOCKER, or any finding that could get money, auth or customer data wrong. Medium if the worst is a SHOULD. Low if only NITs or nothing.
- Verdict: "OK to merge" when there's no BLOCKER and the checks pass. Otherwise "Merge blocked until:" and one numbered line per BLOCKER saying what's wrong and where (file:line).
- Tested: what you actually did (read the diff, checked CI, clicked through the app in a browser).

**Findings**, numbered, blockers first. Each one: BLOCKER, SHOULD or NIT, then file:line, what's wrong and why it matters, the one-line fix, and "(video chapter N)" when the walkthrough shows it.

**Passed**: the checklist lines that passed.

**Walkthrough**: the video alone on its own line, `![](.review/pr-<n>.webm)`, so GitHub shows a player.

Never invent findings. If nothing needs fixing, say so in one line.
Show the review, then ask: "Post this review with the walkthrough video?" Only after a yes: gh pr comment <n> --body-file .review/pr-<n>.md --attach .review/pr-<n>.webm
