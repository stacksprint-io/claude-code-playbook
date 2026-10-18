---
name: pr-review
description: Review a GitHub pull request against this repo's own rules (CLAUDE.md, the spec's Done means, its tests and CI) and rank what to fix. Use when asked to review a PR, check whether PR #N is ready to merge, or before merging a pull request.
argument-hint: [pr-number]
allowed-tools: Bash(gh pr view:*), Bash(gh pr checks:*), Bash(gh pr diff:*), Bash(git fetch:*), Bash(git show:*), Read, Grep, Glob
---

## The pull request
!`gh pr view $ARGUMENTS --json number,title,headRefName,baseRefName,state`

## Checks
!`gh pr checks $ARGUMENTS || true`

## Diff
!`gh pr diff $ARGUMENTS`

## The PR's own files
!`git fetch -q origin pull/$ARGUMENTS/head:refs/pr/$ARGUMENTS && echo "fetched: read files with git show refs/pr/$ARGUMENTS:<path>"`

## Review in this order
1. Branch: one pull request, from its own branch, into main.
2. Checks: take CI from the Checks section, not the author's word. A failing or missing check is a BLOCKER.
3. Files: read every changed file at the PR's head (git show refs/pr/<n>:<path>) and the tests that cover it. Check each against checklist.md, and against docs/spec.md's Done means if it builds a spec feature.

## Report
- One line per finding: BLOCKER, SHOULD or NIT, then file:line, what's wrong and the one-line fix. Blockers first.
- Then the checklist lines that passed.
- If nothing needs fixing, say so in one line. Never invent findings.
- End by asking: "Post this review as a comment on the PR?" Only post after a yes, with gh pr comment.
