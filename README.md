# Purrplexity (For Nick)

A deliberately simple, personal OpenAI query workspace with a responsive cat companion. “Purrplexity” takes a typed, spoken, or file-supported question and sends it to the [OpenAI Responses API](https://platform.openai.com/docs/api-reference/responses).

For the installed app, use the built-in **Setup guide** — users do not need an `.env` file. See [SETUP.md](SETUP.md) for the shareable installation guide.

## Install the desktop app

Download the package matching your computer from the repository's **Releases** page.

- **macOS:** open `Purrplexity-*-arm64.dmg` on Apple Silicon Macs, or `Purrplexity-*-x64.dmg` on Intel Macs. Drag Purrplexity to Applications, then open it.
- **Windows:** run `Purrplexity Setup *.exe` from **1.0.3 or newer** so the in-app Setup guide can save an OpenAI API key. The guided installer lets the user choose a location and creates Start Menu and Desktop shortcuts. `Purrplexity * portable.exe` runs without installing. See [SETUP.md](SETUP.md).

For Windows, always use the file named **Purrplexity Setup … .exe** from the Releases page. It is the guided installer and creates the launcher automatically; the similarly named portable `.exe` does not install shortcuts. Only the Setup install checks GitHub Releases and can install a newer version. The portable exe does not.

After 1.0.3 is installed, the app looks for a newer GitHub Release on launch and about every four hours. It downloads in the background. When an update is ready it asks you to restart, and it will not restart while a question is in progress. Updates do not come from `git pull`, and `npm start` does not check. Nobody needs a GitHub token to receive an update.

The macOS build is currently unsigned, so macOS may require Control-click → Open the first time. Signing and notarization require an Apple Developer certificate, and Mac auto-update cannot reliably replace the app until that exists. The Windows installer is also unsigned until a code-signing certificate is supplied, so SmartScreen or a permission prompt can appear on install and on later updates.

## Start locally

1. Install Node.js 20 or newer.
2. Copy `.env.example` to `.env` and add `OPENAI_API_KEY`.
3. Run `npm run dev` for browser development or `npm start` to open the desktop app.

Without an API key, the app runs in safe demo mode so the UI can be evaluated without sending anything.

## Make a file-aware assistant

1. In the OpenAI platform, create a Vector Store and upload the documents that should answer questions.
2. Copy its ID into `OPENAI_VECTOR_STORE_ID` in `.env`.
3. Restart the app. Each query now includes OpenAI's `file_search` tool against that knowledge collection.

The file picker and drop zone currently stage filenames in the interface. Uploading new local files into OpenAI's Vector Store is intentionally a separate setup action, so the user explicitly chooses what leaves the device.

## Interaction visual states

- `assets/avatar/idle.png` — supplied reference / ready
- `assets/avatar/listening.png` — typing and voice capture
- `assets/avatar/searching.png` — request in progress
- `assets/avatar/success.png` — reply received

The three generated state assets were made with OpenAI image generation using the supplied cat as the continuity reference.

## Architecture

The browser only talks to the local Node server. The server holds the API key and makes the OpenAI request; no secret is embedded in the client.

## Build installers

Run `npm install`, then:

- macOS: `npm run package:mac`
- Windows: `npm run package:win` (run this on Windows for the most reliable NSIS installer build)

Packages are written to `release/`. Builds are intentionally not source-control committed. Publish them as a GitHub Release on `grummpy/For_Nick` so installed apps can see them. electron-builder writes `latest.yml` for Windows and `latest-mac.yml` for Mac next to the installers; those files, the NSIS setup exe, the Mac zip, and the blockmaps have to be on the release or the in-app updater has nothing to download. A maintainer can upload with `electron-builder --publish always`, which reads `GH_TOKEN` on that machine only. The token is not put in the app, and people who install Purrplexity never set it.
