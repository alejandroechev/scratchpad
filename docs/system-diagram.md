# System Diagram

```mermaid
graph TD
    subgraph "Android / Desktop / macOS (Tauri)"
        PROF[Profile Picker<br/>Ale / Dani]
        AUTH[SyncAuthGate<br/>Device Registration]
        SHARE[Share Receiver<br/>Android Intent]
        QAB[Unified Input Bar + 📷<br/>Image Picker: Camera / Gallery]
        FCR[FilterChipRow<br/>🔍 Search + Label Filters]
        NL[NoteList + SwipeableCards<br/>⬅ Swipe Action Menu<br/>Checklist Progress Badge]
        AP[ArchivePage<br/>📦 Search + Labels + Dates + Image Count]
        NDP[NoteDetailPage<br/>Markdown View / Raw Editor<br/>Auto-Save + Undo/Redo + ImageViewer]
        MDR[MarkdownRenderer<br/>GFM + Clickable Checkboxes]
        SS[SyncStatus ⬆️]
        Hook[useNotes Hook]
        MDCB[markdown-checkbox<br/>toggle / count / detect]
        SP[Store Provider]
        BS[Blob Sync<br/>SHA-256 + Retry Queue]
        AM[Automerge Doc<br/>Per-user ScratchPadDoc + Labels<br/>Schema v5: no isTask/taskDone]
        IDB[(IndexedDB<br/>Docs + Blobs)]

        PROF -->|"select profile<br/>→ docUrl"| AUTH
        AUTH -->|authenticated| QAB
        SHARE -->|"shared image"| SP
        QAB --> Hook
        FCR --> Hook
        NL --> Hook
        AP --> Hook
        NDP --> MDR
        NDP --> Hook
        MDR -->|"checkbox tap"| MDCB
        MDCB --> Hook
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
