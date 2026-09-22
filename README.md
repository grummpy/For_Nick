# Purrplexity (For Nick)

A deliberately simple, personal OpenAI query workspace with a responsive cat companion. “Purrplexity” takes a typed, spoken, or file-supported question and sends it to the [OpenAI Responses API](https://platform.openai.com/docs/api-reference/responses).

## Install the desktop app

Download the package matching your computer from the repository's **Releases** page.

- **macOS:** open `Purrplexity-*-arm64.dmg` on Apple Silicon Macs, or `Purrplexity-*-x64.dmg` on Intel Macs. Drag Purrplexity to Applications, then open it.
- **Windows:** run `Purrplexity Setup *.exe`. The guided installer lets the user choose a location and creates Start Menu and Desktop shortcuts. `Purrplexity * portable.exe` runs without installing.

For Windows, always use the file named **Purrplexity Setup … .exe** from the Releases page. It is the guided installer and creates the launcher automatically; the similarly named portable `.exe` does not install shortcuts.

The macOS build is currently unsigned, so macOS may require Control-click → Open the first time. Signing and notarization require an Apple Developer certificate. The Windows installer is also unsigned until a code-signing certificate is supplied.

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

Packages are written to `release/`. Builds are intentionally not source-control committed; attach them to a GitHub Release so users can download them directly.
