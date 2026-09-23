# Purrplexity setup

You do **not** need to download the source ZIP or create an `.env` file for the installed app.

## Windows: connect in three steps

1. Download and run the **Purrplexity Setup** installer from the [latest release](https://github.com/grummpy/For_Nick/releases/latest).
2. Open Purrplexity and select **Setup guide** in the top-right corner.
3. Create an API key at the [OpenAI API Keys page](https://platform.openai.com/api-keys), paste it into Purrplexity, and select **Save & connect**.

Purrplexity stores the key locally using Windows encrypted credential storage. The key is not bundled with the app, uploaded to GitHub, or placed in a browser page.

## Optional: query a document collection

To make a prebuilt document collection searchable, create and populate a Vector Store in the OpenAI Platform, then paste its `vs_…` ID into the optional Vector Store field. See the [OpenAI API quickstart](https://platform.openai.com/docs/quickstart/make-your-first-api-request) for account and billing setup.

## Important

- An OpenAI API key is separate from a ChatGPT subscription.
- Never send an API key by text, email, or chat.
- To change the key, reopen **Setup guide** and save the replacement.
