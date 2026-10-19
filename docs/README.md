# Docs

| Folder | What lives there |
| --- | --- |
| `product/` | What we are building and why. The PRD, the build plan, and the two payout papers. |
| `design/` | How it looks and behaves. The design system is the source of truth for tokens and components; the other three are per-surface specs. |
| `backend/` | The contract. `endpoints-needed.md` is the live ask list; `api.md` is the reference. |
| `backend/replies/` | What the backend team sent back, dated. Read-only — these are their words, not ours. |

**Start here**

| Question | File |
| --- | --- |
| What are we still waiting on? | `backend/endpoints-needed.md` |
| What did backend say about it? | the newest file in `backend/replies/` |
| What colour / spacing / component? | `design/alva-design-system.md` |
| Why does the annotation workspace work this way? | `design/annotation-workspace.md` |

`backend/endpoints-needed.md` holds only what is still open. Once an ask is
answered and wired it comes off the list, and the reply that answered it stays
in `backend/replies/` as the record.
