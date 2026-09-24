# Purrplexity setup

You do **not** need to download the source ZIP or create an `.env` file for the installed app.

## Windows: connect in three steps

1. Download **Purrplexity 1.0.3 or newer** from the [latest release](https://github.com/grummpy/For_Nick/releases/latest). Run **Purrplexity Setup** (the NSIS installer). The portable `.exe` is optional and does not create shortcuts.
2. Open Purrplexity and select **Setup guide** in the top-right corner.
3. Create an API key at the [OpenAI API Keys page](https://platform.openai.com/api-keys), paste it into Purrplexity, and select **Save & connect**.

The next question uses that key. It stays in the desktop app's main process and is not bundled with the app, uploaded to GitHub, or stored in the page.

### How the key is stored

Purrplexity prefers operating-system encryption (Electron `safeStorage`: Windows DPAPI, macOS Keychain).

If OS encryption is unavailable, or Windows refuses to encrypt (some portable runs and locked-down profiles), **Save & connect** still completes. The main process encrypts the key with AES-256-GCM and writes:

- `purrplexity-settings.json` — ciphertext, vector store id, and model
- `purrplexity-local.key` — the local encryption key

Both files live in Purrplexity's application data folder (on Windows, under `%APPDATA%`), not in the page and not as a plaintext API key. This fallback is only as private as that Windows user profile: anyone who can read the folder can decrypt the key. When OS encryption is available, a later **Save & connect** uses `safeStorage` again.

A key saved earlier with `safeStorage`, including an existing Mac setup, keeps working. Purrplexity does not rewrite those files until you save again.

### Upgrading from 1.0.2 or earlier

Those Windows builds could hide the API key field or reject **Save & connect**, and they do not update themselves. Install 1.0.3 over the old installer, or replace the old portable exe with the 1.0.3 portable build, then open **Setup guide** and save the key again. You do not need an `.env` file. If Setup guide says the setup bridge did not load, you are still on an older build. After 1.0.3 is installed with **Purrplexity Setup**, later versions can update from GitHub Releases inside the app.

## Updates

Installed Purrplexity does not update from a git clone or `git pull`. A few seconds after launch, and about every four hours after that, the packaged app checks [GitHub Releases](https://github.com/grummpy/For_Nick/releases) for a newer version. The download is quiet. When it is ready, a notice appears. Purrplexity does not restart in the middle of a question. Choose **Restart and install** when you are done, or quit the app and the update installs then. You do not need a GitHub token.

- Use the **Windows Setup** installer (NSIS) if you want these updates. The portable `.exe` does not update itself; download a new portable build from Releases.
- These builds are unsigned. Windows SmartScreen or a permission prompt can appear when the update installer runs. That is expected until a code-signing certificate is added. The app does not require the update to be signed, because no publisher certificate is configured yet.
- macOS uses the same check. Applying the update needs an Apple-signed and notarized build. Until then, macOS can block the new copy, and the reliable path is still the `.dmg` or `.zip` on Releases (Control-click → Open the first time). Signing and notarization need an Apple Developer certificate.

## Optional: query a document collection

To make a prebuilt document collection searchable, create and populate a Vector Store in the OpenAI Platform, then paste its `vs_…` ID into the optional Vector Store field. See the [OpenAI API quickstart](https://platform.openai.com/docs/quickstart/make-your-first-api-request) for account and billing setup.

## Important

- An OpenAI API key is separate from a ChatGPT subscription.
- Never send an API key by text, email, or chat.
- To change the key, reopen **Setup guide** and save the replacement.
