# session-guard

A live heads-up display (HUD) for Claude Code, in one small mod. Each feature uses one of the moves a mod can make:

| Feature | The move | What you see |
|---|---|---|
| **Status band** | observe + draw | a framed line above the prompt: context used, spend against your budget, tool calls |
| **`/hud` dashboard** | observe + draw | a pane beside the transcript: context and budget meters, cost per turn, a chart of the tools Claude used, the files it touched, what it's doing now |
| **Budget guard** | answer | set a budget with `/budget 2.50`. Once the session passes it, the next tool call or prompt waits for you: stop, or add $1 and keep going |
| **Recording mode** | rewrite | `/recording on` hides API keys, tokens and email addresses in what Claude Code draws, so you can share or record your screen |

Built and explained on the StackSprint channel. Tested with **Claude Code v2.1.296** (mods need v2.1.287 or later). The dashboard and band draw in the terminal and in the Desktop app's Code tab, not in the VS Code chat panel or `claude -p`.

## Install

From a Claude Code session:

```
/plugin marketplace add stacksprint-io/claude-code-playbook
/plugin install session-guard@stacksprint
```

Or try it for one session without installing:

```bash
git clone https://github.com/stacksprint-io/claude-code-playbook.git
claude --plugin-dir ./claude-code-playbook/mods/session-guard
```

Run `/plugin` to check it loaded: you'll see `1 mod active · session-guard`.

## Commands

| Command | What it does |
|---|---|
| `/hud` | opens the dashboard pane (Esc closes it) |
| `/budget 2.50` | sets the budget in dollars for each session, kept for new sessions too; `/budget` alone shows it |
| `/recording on` · `/recording off` | turns recording mode on or off; it stays on across sessions until you turn it off |

## Before you install any mod, read what it can do

A mod runs inside Claude Code with your permissions. It isn't sandboxed. Check what this one touches before you install it:

```bash
claude plugin validate ./mods/session-guard
```

The `hooks:` line lists the events it handles, and `calls:` lists everything it asks Claude Code to do. This mod calls `$.session.usage` (context and cost), `$.session.cwd`, `$.session.id` and `$.session.model` (the folder, the session and the model it shows), `$.store` (to remember your budget and recording mode), `$.command.register` and `$.ui` (to draw and to ask you). It runs no programs, makes no network requests and doesn't read files.

## What the budget guard does and doesn't do

- It reads the cost Claude Code reports for the session (the same figure as `/cost`). Cost updates as each request finishes, so a session can go a little past the budget before the guard's next check.
- It checks before each tool call and before each prompt you send. Prompts nobody typed, such as a background task's notification or another plugin's message, go through, and any tool call they lead to is still checked. A prompt that arrives with no origin is asked about, to be safe.
- "Add $1" raises the budget for this session only, and a reload keeps it. New sessions start from the amount you set with `/budget`. "Stop here" refuses the call (Claude is told to stop and summarize) or drops the prompt back into your input box. If Claude tries another tool in the same turn, it's refused without asking you again.
- On a Claude subscription, cost is an estimate of API pricing, not a bill.

## What recording mode does and doesn't do

- It changes what Claude Code **draws**: messages, tool calls and their results. Claude still reads the real text, and the stored transcript keeps it.
- It covers Claude Code's own screen only. Your shell, your editor and other apps aren't touched.
- It only hides what its patterns match (the `SECRETS` list in `hooks/register.ts`). Check your screen before you share it.

## Turn it off

- This mod: disable it in `/plugin`
- Every installed mod for one session: `claude --safe-mode`
- Every installed mod everywhere: `"disableAllHooks": true` in `~/.claude/settings.json`

## Changes since the video

The video builds 0.1.0. Version 0.1.1 fixes two things our own PR review found:

- "Add $1" no longer saves the higher budget for every future session, only this one.
- The budget guard asks only about prompts a person sent, so a background notification over budget isn't dropped.

0.1.2 fixes what the review of 0.1.1 found: a reload no longer undoes "Add $1", sessions running side by side keep their own "Add $1", and a prompt with no origin is still asked about.

## Tests

```bash
claude plugin test ./mods/session-guard
```

## Files

```
session-guard/
├── .claude-plugin/plugin.json   the manifest
├── hooks/hooks.json             points to the code
├── hooks/register.ts            the mod
└── tests/session-guard.test.ts  the tests
```
