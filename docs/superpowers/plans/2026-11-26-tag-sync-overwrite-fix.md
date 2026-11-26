# Tag Sync Overwrite & Race Condition Fix Plan

- [x] Cut feature branch `feat/tag-sync-overwrite-fix` from `dev`
- [x] Update `MusicFileService.kt`:
  - [x] Add `afterCommit` synchronization for `rewriteR2Tags` dispatch in `updateMetadata` and `resyncTags`
  - [x] Re-fetch latest entity before saving sync status in `rewriteR2Tags`
- [x] Run backend tests (`./gradlew test`)
- [x] Merge `feat/tag-sync-overwrite-fix` into `dev` with `--no-ff`
