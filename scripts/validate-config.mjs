import { readFile } from "node:fs/promises";
import Ajv2020 from "ajv/dist/2020.js";
import { parseDocument } from "yaml";

const [kind, path, ...extra] = process.argv.slice(2);
if (!["project", "task"].includes(kind) || !path || extra.length) {
  console.error("Usage: node scripts/validate-config.mjs <project|task> <file.yaml>");
  process.exitCode = 2;
} else {
  let source;
  try {
    source = await readFile(path, "utf8");
  } catch (error) {
    console.error(`Cannot read configuration: ${error.code ?? "unknown error"}`);
    process.exitCode = 1;
  }
  if (source !== undefined) {
    const document = parseDocument(source, { uniqueKeys: true });
    if (document.errors.length) {
      console.error("Invalid YAML configuration.");
      process.exitCode = 1;
    } else {
      const schemaUrl = new URL(`../schemas/${kind}.schema.json`, import.meta.url);
      const schema = JSON.parse(await readFile(schemaUrl, "utf8"));
      const validate = new Ajv2020({ allErrors: true }).compile(schema);
      let value;
      try {
        value = document.toJS({ maxAliasCount: 100 });
      } catch (error) {
        if (!(error instanceof ReferenceError)) throw error;
        console.error("Invalid YAML configuration: unresolved or excessive aliases.");
        process.exitCode = 1;
      }
      if (!process.exitCode) {
        if (!validate(value)) {
          console.error("Invalid configuration:");
          for (const error of validate.errors ?? []) {
            console.error(`- ${error.instancePath || "/"} ${error.message}`);
          }
          process.exitCode = 1;
        } else {
          console.log(`Valid ${kind} configuration.`);
        }
      }
    }
  }
}
