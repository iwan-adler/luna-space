# ADR 0024 — Direct messages, private or public

- **Status:** Accepted
- **Date:** 2026-11-25

## Context

Workspaces now hold up to 50 people (ADR 0018), but chat was one conversation per workspace. The
Luna Iron redesign (ADR 0023) listed teammates under "Direct Messages", yet everything sent there
went to the whole team.

## Decisions

- **One table, three kinds of message.** `messages.recipient_id` and `messages.is_private`
  (migration 0027):
  - team message: no recipient; everyone in the workspace sees it;
  - public direct message: a recipient, not private; everyone sees it, in the team chat marked
    "To Ben" and also in the two people's conversation;
  - private direct message: a recipient, private; only the sender and the recipient see it.
- **The choice is made per message.** In a conversation with someone, the composer shows
  Private / Public (Private by default, and again after switching conversations).
- **Privacy is enforced by the database.** Restrictive RLS policies hide private messages, their
  reactions, poll votes, attachments (file rows and stored objects) and the read positions in
  private conversations from everyone else, so search, the data export and Realtime follow
  without app code. A trigger refuses a recipient outside the workspace, and refuses quoting a
  private message anywhere but its own conversation. Recipient and privacy cannot be changed
  after sending.
- **Read positions per conversation.** `chat_read_state.peer_id` (null for the team chat);
  `mark_chat_read(message, peer)`. Unread counts: the team chat, plus private messages per
  sender (badges in the Direct Messages list).
- **Notifications.** A direct message notifies only its recipient and links to
  `/chat?with=<sender>`; a team message notifies everyone else, as before. Typing indicators
  carry the recipient, so they show only in the matching conversation.
- Group conversations (more than two people, but not the whole team) are out of scope.
