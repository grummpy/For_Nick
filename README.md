# Purrplexity (For Nick)

A deliberately simple local drafting companion. Purrplexity keeps drafts and an
optional local file checklist on the device, then lets Nick explicitly copy a
draft or open GUMBUS in the normal browser. It does not call the Responses API.

## Install the desktop app

Download the package matching the computer from the repository Releases page.

- macOS: open the matching arm64 or x64 DMG, drag Purrplexity to Applications,
  then open it.
- Windows: run Purrplexity Setup. The guided installer creates Start Menu and
  Desktop shortcuts. The portable EXE runs without installation.

The macOS and Windows builds are unsigned until signing certificates are
supplied.

## Start locally

1. Install Node.js 20 or newer.
2. Run npm run dev for browser development or npm start for the desktop app.
3. Draft locally. Choose Copy draft only when ready to paste elsewhere, or
   choose Open GUMBUS to open the destination in the normal browser.

No API key, platform setup, account automation, or file upload is required. The
app never reads selected file contents; the Files panel is a local checklist so
Nick can remember what to attach manually. The destination opens without
putting prompt text or file names in its URL.

Local pattern warnings can flag common email, phone, labeled-name, and student
identifier forms before copy/open. They are prompts for human review, not a
guarantee of privacy or legal compliance.

## Interaction visual states

- assets/avatar/idle.png — supplied reference / ready
- assets/avatar/listening.png — local drafting
- assets/avatar/searching.png — retained legacy art; no request is made
- assets/avatar/success.png — draft copied or browser opened

The state assets were made with OpenAI image generation using the supplied cat
as a continuity reference.

## Architecture

The browser talks only to a loopback Node server that serves the static UI. It
has no query API route, credential loading, provider call, or file upload path.
Opening GUMBUS is a normal-browser action initiated by Nick.

## Build installers

Run npm install, then:

- macOS: npm run package:mac
- Windows: npm run package:win

Packages are written to release. Builds are intentionally not source-control
committed; attach them to a GitHub Release only after separate release review.
