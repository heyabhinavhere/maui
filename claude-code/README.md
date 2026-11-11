# Maui for Claude Code

When Claude Code stops to ask you something — a question, a plan to approve, or permission to run a command — Maui shows it at your Mac's notch and you answer there. If Maui is not running, nothing changes: Claude asks in its terminal as usual.

This folder is a Claude Code plugin marketplace with one plugin, `maui`. Maui ships a copy of it inside the app.

## What it does

- Runs a tiny helper (`maui-hook`, installed by Maui into `~/Library/Application Support/Island/Agents/`) before Claude asks a question (`AskUserQuestion`), presents a plan (`ExitPlanMode`), or requests a permission — and when a session starts, so Maui knows which app or terminal it runs in.
- The helper talks to Maui over a private Unix socket on this Mac — never a network port — and only processes of your own user are admitted. In a signed Maui release, only Maui's own signed helper is.
- Maui never approves anything by itself. Unknown requests, a closed Maui, or a helper Maui does not recognise all fall back to Claude's own prompt at once.
- A question can wait at the notch for up to 95 minutes: the longest focus session, and five minutes to answer at its end.
- You can answer a question with a screenshot or a file (⌘⇧A attaches your newest screenshot; or drag a file onto the card). Maui copies it into the session's own scratch folder so Claude can read it.

## Install

The easy way: open Maui → **Apps → Claude Code → Connect**. Maui runs the two commands below for you and confirms them from Claude Code's own records.

By hand, with Maui installed:

```sh
claude plugin marketplace add "$HOME/Library/Application Support/Island/Agents/claude-code"
claude plugin install maui@maui
```

Claude Code sessions started after installing ask at the notch.

## Update

When Maui carries a newer plugin, its **Apps → Claude Code** page offers **Update the plugin to …** in the **…** menu. By hand:

```sh
claude plugin marketplace update maui
claude plugin update maui@maui
```

Restart running Claude Code sessions to pick it up.

## Uninstall

```sh
claude plugin uninstall maui@maui
claude plugin marketplace remove maui
```

Or in Maui: **Apps → Claude Code → … → Disconnect Claude Code…**, which runs the same two steps. If you turned on **Show Claude's usage limits**, turn it off in that same menu first: Disconnect leaves Claude Code's status line in place. Answering at the notch can also be turned off in Maui's **Settings → Agents** (**Answer Claude Code and Codex from the notch**). The helper in `~/Library/Application Support/Island/Agents/` is removed with Maui's own data (see Maui's uninstall notes).

## Privacy

Only what Claude sends to its hooks reaches Maui — the question, plan or command, the project folder, and which terminal or app it runs in. Maui keeps no question, plan, command or answer after the card is answered, logs none of them, and sends none of it anywhere. It remembers, on this Mac only: the folder of the project you last answered at the notch (so Focus knows which project is yours), how many questions each session asked on each of the last seven days (for the usage line), and for about two days which app or terminal each session runs in (so **Go to …** opens the right one). A screenshot or file you attach to an answer is copied into Maui's own folder. Maui looks in that folder every hour while it is open, each time it starts and each time you attach another file, and deletes any copy that is a day old. When the session has a scratch folder of its own, the file is copied there too, so Claude can read it without asking. Maui does not delete that copy: it stays until the session or macOS clears that folder.
