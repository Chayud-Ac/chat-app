-- name: CreateConversation :one
INSERT INTO conversations DEFAULT VALUES
RETURNING id, title, created_at;

-- name: ListConversations :many
SELECT id, title, created_at FROM conversations
ORDER BY created_at DESC;

-- name: GetConversation :one
SELECT id, title, created_at FROM conversations
WHERE id = $1;

-- name: CreateMessage :one
INSERT INTO messages (conversation_id, role, content)
VALUES ($1, $2, $3)
RETURNING id, conversation_id, role, content, created_at;

-- name: ListMessages :many
SELECT id, conversation_id, role, content, created_at FROM messages
WHERE conversation_id = $1
ORDER BY created_at ASC;
