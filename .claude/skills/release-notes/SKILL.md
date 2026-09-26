---
name: release-notes
description: Turn the commits since the last tag into a CHANGELOG.md section grouped by Added / Changed / Fixed, in plain language a user would read. Use when the user asks for release notes, a changelog, "what shipped", or to cut a release.
allowed-tools: Read, Edit, Write, Bash(git log:*), Bash(git describe:*), Bash(git tag:*)
---

## Recent commits, newest first

!`git log --pretty='- %s (%h)%d' -30`

## Instructions

The `%d` decoration marks tagged commits. Take every commit ABOVE the first tagged one (all of them if no tag appears). Write or prepend a section to `CHANGELOG.md` headed with today's date and the next version (bump the patch unless a commit says `feat`, then bump minor). Group the commits under **Added**, **Changed**, **Fixed**; drop chores and merges; rewrite each line for a user, not a developer (what they can do now, not which function changed). Keep the commit hash in parentheses. If there are no new commits, say so and change nothing.
