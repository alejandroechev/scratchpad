# System Diagram

```mermaid
graph TD
    subgraph "Android / Desktop / macOS (Tauri)"
        PROF[Profile Picker<br/>Ale / Dani]
        AUTH[SyncAuthGate<br/>Device Registration]
        SHARE[Share Receiver<br/>Android Intent]
        QAB[Unified Input Bar + 📷]
        FCR[FilterChipRow<br/>🔍 Search + Label Filters]
        NL[NoteList + SwipeableCards<br/>⬅ Swipe Action Menu]
        AP[ArchivePage<br/>📦 Archived Notes + Unarchive]
        NDP[NoteDetailPage<br/>Auto-Save + Undo/Redo + ImageViewer]
        SS[SyncStatus ⬆️]
        Hook[useNotes Hook]
        SP[Store Provider]
        BS[Blob Sync<br/>SHA-256 + Retry Queue]
        AM[Automerge Doc<br/>Per-user ScratchPadDoc + Labels]
        IDB[(IndexedDB<br/>Docs + Blobs)]

        PROF -->|"select profile<br/>→ docUrl"| AUTH
        AUTH -->|authenticated| QAB
        SHARE -->|"shared image"| SP
        QAB --> Hook
        FCR --> Hook
        NL --> Hook
        AP --> Hook
        NDP --> Hook
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
        AleDoc[(Ale's Doc + Labels)]
        DaniDoc[(Dani's Doc + Labels)]
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
