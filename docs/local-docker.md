# Local Docker Workflow

Local development uses two commands:

```bash
docker compose up --build
```

Starts every backend container:

- `redis`
- `client_api`
- `gmail_request_intake`
- `gmail_fetch_content`
- `gmail_pubsub_listener`
- `classification_worker`
- `ner_worker`
- `flower`
- `local_llm`
- `local_llm_model_loader`
- `email_inference_worker`

For Gmail Pub/Sub, use short resource names in `.env`:

```bash
GMAIL_PUBSUB_PROJECT_ID=your-google-cloud-project-id
GMAIL_PUBSUB_TOPIC_NAME=your-topic-name
GMAIL_PUBSUB_SUBSCRIPTION_NAME=your-subscription-name
GMAIL_PUBSUB_CREDENTIALS_HOST=./scratch/gmail-pubsub-credentials.json
```

The backend converts those to the full Google resource paths:

- `projects/<project-id>/topics/<topic-name>` for Gmail `watch`
- `projects/<project-id>/subscriptions/<subscription-name>` for the pull listener

Full paths are also accepted through the legacy `GMAIL_PUBSUB_TOPIC` and `GMAIL_PUBSUB_SUBSCRIPTION` variables.

`GMAIL_PUBSUB_CREDENTIALS_HOST` must point to a local Google service-account JSON file. If the path is missing, Docker may create a directory with that name; remove that directory and put the JSON file at the configured path.

```bash
npm run dev
```

Starts the frontend only through Vite, with normal hot reload.

The frontend is intentionally not part of `docker-compose.yml`. This keeps frontend iteration independent from backend/model startup and avoids Docker Desktop scanning frontend files on each reload.
