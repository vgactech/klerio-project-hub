<!-- LOVABLE:BEGIN -->

> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

<!-- LOVABLE:END -->

## Project rules

- Read `docs/handoff/BOB_IDE_BRIEF_001.md` before changing storage, AI, logging or chat code; it is the current external IDE handoff.
- Keep real client files and data out of this application repository; client memory belongs in isolated private storage repositories.
- Log application prompts, actions and available explanations without secrets; never claim private model reasoning was captured.
- Client memory is stored on the `klerio-memory` orphan branch of the private GitHub repo (one folder per auth user id, append-only JSONL); never write client data to `main`, which is the Lovable-synced code branch.
- The client space (/espace/*) stores reminders, family, profile and documents under clients/<id>/espace and clients/<id>/documents on the same memory branch via server routes; never add a database for this data.
- Public entry follows Klerio-26/KLERIO: landing at `/`, sign-in at `/login`, sign-up at `/register`, then `/espace` (dashboard) with the chat at `/chat`; never re-add a separate `/auth` page, to avoid duplicate sign-in screens.
- The chat iframe (`public/app/klerio.html`) navigates the app via `postMessage({klerioNavigate})` handled in `chat.tsx`, because `target="_top"` is blocked inside the preview; bump `PAGE_VERSION` when that HTML changes so browsers drop the cached copy.
- Global appearance controls own persistent interface language/theme; a shared catalog and legacy DOM adapter translate existing React/iframe UI without changing stable action values or private conversation/document content.
