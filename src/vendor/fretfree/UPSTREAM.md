# Vendored from FretFree

Source: https://github.com/pookey/fretfree, `app/src/`, commit
`f523388ede67026c19fff6fe93129a56a4d0d70d` (2026-10-21). Licence: MIT (see
`/THIRD_PARTY_NOTICES.md`).

| Here | Upstream | Changes |
|---|---|---|
| `theory/` | `theory/` | none |
| `mic/` | `mic/` | worklet processor registered as `glead-pitch` |
| `audio/` | `audio/` | none |
| `fretboard/` | `components/fretboard/` | relative imports (`../theory`, `../engine/model`), test CSS path |
| `engine/grading.ts`, `scheduler.ts`, `adaptive.ts` (+ tests) | `engine/` | none |
| `engine/model.ts` | `engine/model.ts` | only the types the above need |
| `engine/config.ts` | `engine/config/*.ts` | one flat object instead of `import.meta.glob` |

Rule: do not edit these files except to keep them compiling. GLead's own code
lives in `src/core`, `src/drills`, `src/audio`, `src/screens`. To re-sync,
copy the upstream directories again and re-apply the changes above.
