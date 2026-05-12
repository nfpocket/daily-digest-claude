# Connector registry uses a static array, not self-registration

`server/connectors/index.ts` maintains a plain array of `Connector` objects. New connectors are added by importing the module and pushing into that array. `registry.ts` is types-only.

We considered a Map-based self-registration pattern (connectors call `registerConnector()` at module load, lookup goes through the Map). We rejected it because the static array is easier to read — it's one file, one list, no magic side effects at import time. The "Build a Connector" flow edits `index.ts` directly anyway, so dynamic registration buys nothing.

Don't re-introduce `registerConnector()` or a runtime Map without a concrete reason the static array can't serve.
