# Data model

```mermaid
erDiagram
    USER ||--o{ REFRESH_TOKEN : "opens sessions"
    USER ||--o{ MEMBERSHIP : "joins"
    WORKSPACE ||--o{ MEMBERSHIP : "has"
    USER ||--o{ NOTIFICATION : "receives"
    WORKSPACE ||--o{ AUDIT_LOG : "records"

    WORKSPACE ||--o{ PAGE : "contains"
    PAGE ||--o{ PAGE : "nests"
    PAGE ||--o{ PAGE_REVISION : "keeps history"

    WORKSPACE ||--o{ BOARD : "contains"
    BOARD ||--o{ BOARD_LIST : "columns"
    BOARD_LIST ||--o{ CARD : "holds"
    USER }o--o{ CARD : "assigned to"

    WORKSPACE ||--o{ CHANNEL : "contains"
    CHANNEL ||--o{ CHANNEL_MEMBER : "roster"
    CHANNEL ||--o{ MESSAGE : "carries"
    MESSAGE ||--o{ MESSAGE : "threads"
    USER ||--o{ MESSAGE : "writes"

    WORKSPACE ||--o{ FILE_ASSET : "stores"
    FILE_ASSET }o--o{ MESSAGE : "attached to"

    USER {
        string name
        string email UK
        string password "select false, bcrypt"
        string role "user, support, super_admin"
        string status "active, suspended, blocked"
        number tokenVersion "bumped to kill sessions"
        date passwordChangedAt
        date lastLoginAt
    }

    REFRESH_TOKEN {
        objectId user FK
        string tokenHash UK "sha256 of the jwt"
        string family "rotation lineage"
        string ip
        string userAgent
        date expiresAt "ttl index"
        date revokedAt
    }

    WORKSPACE {
        string name
        string slug UK
        string description
        objectId owner FK
        number memberCount
        date archivedAt
    }

    MEMBERSHIP {
        objectId workspace FK
        objectId user FK
        string role "owner, admin, member, viewer"
        objectId invitedBy FK
        date lastSeenAt
    }

    PAGE {
        objectId workspace FK
        objectId parent FK
        array path "ancestor ids, materialised"
        string title
        string body
        number position
        number version
        date archivedAt
    }

    PAGE_REVISION {
        objectId page FK
        number version
        string title
        string body
        objectId editedBy FK
    }

    BOARD {
        objectId workspace FK
        string name
        string colour
        date archivedAt
    }

    BOARD_LIST {
        objectId board FK
        string name
        number position
        number cardLimit "wip limit, nullable"
        date archivedAt
    }

    CARD {
        objectId board FK
        objectId list FK
        string title
        string description
        number position "contiguous within a list"
        string priority
        array labels
        array assignees
        date dueAt
        date completedAt
        date archivedAt
    }

    CHANNEL {
        objectId workspace FK
        string name
        string slug "unique per workspace"
        string visibility "public, private"
        number memberCount
        number messageCount
        date lastMessageAt
    }

    CHANNEL_MEMBER {
        objectId channel FK
        objectId user FK
        date lastReadAt
        boolean muted
    }

    MESSAGE {
        objectId channel FK
        objectId author FK
        objectId parent FK "thread root"
        string body
        number replyCount
        array mentions
        array reactions
        date editedAt
        date deletedAt
    }

    FILE_ASSET {
        objectId workspace FK
        objectId uploadedBy FK
        string originalName
        string storedName UK
        string mimeType
        number size
        string checksum "sha256, dedupe key"
    }

    NOTIFICATION {
        objectId user FK
        objectId workspace FK
        string type
        string title
        objectId entityId
        date readAt
    }

    AUDIT_LOG {
        objectId workspace FK
        objectId actor FK
        string action
        string entityType
        objectId entityId
        string ip
        date createdAt "ttl, 180 days"
    }
```

## Index choices

| Collection | Index | Why |
| --- | --- | --- |
| users | `email` unique | Login lookup and duplicate rejection |
| users | `name, email` text | Member search |
| refreshtokens | `tokenHash` unique | Rotation looks a token up by hash on every refresh |
| refreshtokens | `expiresAt` TTL | Expired sessions delete themselves |
| memberships | `workspace, user` unique | The authorisation lookup on every workspace request |
| pages | `workspace, parent, position` | Rendering one level of the tree |
| pages | `path` | Finding a whole subtree to move or archive |
| pages | `title, body` text, title weighted 8 | Search ranks a title hit above a body hit |
| pagerevisions | `page, version` unique | One revision per version, and history reads in order |
| cards | `list, position` | Ordering a column |
| cards | `workspace, assignees, dueAt` | "My cards" and the due-soon sweep |
| channels | `workspace, slug` unique | Slug is unique per workspace, not globally |
| messages | `channel, createdAt` | Cursor paging down a channel |
| messages | `workspace, mentions, createdAt` | Mention fan out |
| auditlogs | `workspace, action, createdAt` | The filtered audit query |
| auditlogs | `createdAt` TTL 180d | Retention without a cleanup job |
| notifications | `createdAt` TTL 90d | Same |
| fileassets | `workspace, checksum` | Upload deduplication |

## Where transactions are used

Transactions wrap the writes that touch more than one collection and would leave the data
inconsistent if only half landed.

| Operation | Collections written |
| --- | --- |
| Create workspace | `workspaces`, `memberships` |
| Add or remove a member | `memberships`, `workspaces.memberCount` |
| Transfer ownership | two `memberships`, `workspaces.owner` |
| Update a page | `pagerevisions`, `pages` |
| Move a page | `pages` (the page and every descendant path) |
| Create a board | `boards`, `boardlists` |
| Move a card | `cards` in the source list, the target list, and the card itself |
| Archive a board | `boards`, `boardlists`, `cards` |
| Send or delete a message | `messages`, `channels` counters, parent `replyCount` |

`helpers/transaction.js` asks the deployment once whether it is a replica set or a mongos.
On a standalone MongoDB the same code runs without a session instead of throwing, which
keeps a developer with a plain `mongod` able to work.
