import assert from "node:assert/strict";
import test from "node:test";
import { localDatabaseUrl } from "../../apps/github-app/src/local-database.ts";

test("local database URLs cannot override the host or inject connection options", () => {
  for (const url of [
    "postgresql://dev:secret@127.0.0.1/db?host=remote.example",
    "postgresql://dev:secret@127.0.0.1/db?options=-c+search_path%3Ddemo%3Bdrop",
    "postgresql://dev:secret@127.0.0.1/db?options=anything",
    "postgresql://dev:secret@127.0.0.1/db?options=-c+search_path%3Ddemo&options=-c+search_path%3Dother",
  ]) {
    assert.throws(() => localDatabaseUrl(url));
  }
  assert.doesNotThrow(() => localDatabaseUrl(
    "postgresql://dev:secret@127.0.0.1/db?options=-c+search_path%3Ddemo",
  ));
});
