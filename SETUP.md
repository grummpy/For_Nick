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

Those Windows builds could hide the API key field or reject **Save & connect**. Install 1.0.3 over the old installer, or replace the old portable exe with the 1.0.3 portable build, then open **Setup guide** and save the key again. You do not need an `.env` file. If Setup guide says the setup bridge did not load, you are still on an older build.

## Optional: query a document collection

To make a prebuilt document collection searchable, create and populate a Vector Store in the OpenAI Platform, then paste its `vs_…` ID into the optional Vector Store field. See the [OpenAI API quickstart](https://platform.openai.com/docs/quickstart/make-your-first-api-request) for account and billing setup.

## Important

- An OpenAI API key is separate from a ChatGPT subscription.
- Never send an API key by text, email, or chat.
- To change the key, reopen **Setup guide** and save the replacement.
