# System Diagram

```mermaid
graph TD
    subgraph "Android / Desktop / macOS (Tauri)"
        PROF[Profile Picker<br/>Ale / Dani]
        AUTH[SyncAuthGate<br/>Device Registration]
        SHARE[Share Receiver<br/>Android Intent]
        QAB[QuickAddBar + 📷]
        NL[NoteList + SwipeableCards]
        NDP[NoteDetailPage + Gallery]
        SB[SearchBar]
        SS[SyncStatus ⬆️]
        Hook[useNotes Hook]
        SP[Store Provider]
        BS[Blob Sync<br/>SHA-256 + Retry Queue]
        AM[Automerge Doc<br/>Per-user ScratchPadDoc]
        IDB[(IndexedDB<br/>Docs + Blobs)]

        PROF -->|"select profile<br/>→ docUrl"| AUTH
        AUTH -->|authenticated| QAB
        SHARE -->|"shared image"| SP
        QAB --> Hook
        NL --> Hook
        NDP --> Hook
        SB --> Hook
        Hook --> SP
        SP --> AM
        SP --> BS
        AM --> IDB
        BS --> IDB
        SS -->|"pending count"| BS
    end

    subgraph "SyncEngine Server (VPS)"
        REG[/auth/register/]
        WS[WebSocket Server<br/>JWT Verified]
        BLOB[/blobs/:id/<br/>Content-Addressed]
        AleDoc[(Ale's Doc)]
        DaniDoc[(Dani's Doc)]
        BlobStore[(Blob Filesystem)]
        REG -->|JWT token| WS
        WS --> AleDoc
        WS --> DaniDoc
        BLOB --> BlobStore
    end

    AUTH -->|"register<br/>(device name + key)"| REG
    AM <-->|"WebSocket + JWT<br/>CRDT Sync"| WS
    BS <-->|"HTTP + JWT<br/>Upload / Download"| BLOB
```
