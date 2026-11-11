# RAG Security and Retention

## Trust boundary

The BFF is the only application component that authenticates end users. It
forwards the authenticated user ID and the database conversation ID to FastAPI
through an HMAC-signed request. `RAG_INTERNAL_SECRET` is injected at runtime and
must not be committed to Git.

FastAPI does not accept a user or session identity from an unsigned client and
does not keep a process-wide conversation history.

## Replay protection

Each request contains a UUID request ID, a Unix timestamp, and an HMAC covering
the action, user, session, request ID, timestamp, and question. FastAPI accepts
the timestamp only within the configured 60-second window and rejects a request
ID that has already been seen during that window.

The replay cache is process-local. If FastAPI is deployed with multiple
replicas, the cache must move to a shared short-lived store before relying on
replay protection across replicas.

## Conversation retention

PostgreSQL is the source of truth for RH conversations. The BFF sends at most
the six most recent user/assistant messages to the RAG service. Resetting a
conversation closes the authenticated user's active conversation; it does not
delete another user's data.

There is currently no automatic retention or expiry policy for closed database
conversations. A production policy must define a retention period, deletion
workflow, backup impact, and restore procedure before being enabled.

## Error and logging policy

Application logs must not contain user questions, document excerpts, tokens,
credentials, local document paths, or internal exception details. API errors
return generic messages. Source references expose only the configured document
filename and page metadata.
