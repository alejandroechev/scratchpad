export * from "./client.js";
import schema from "./schema.js";
import oldSchemas from "./schemaVersions/index.js";
import { Client as BaseClient } from "./client.js";
import migrations from "../migrations/index.js";
export * from "@verdant-web/store";

export class Client extends BaseClient {
  constructor(init) {
    const defaultedSchema = init.schema || schema;
    const defaultedMigrations = init.migrations || migrations;
    const defaultedOldSchemas = init.oldSchemas || oldSchemas;
    super({
      ...init,
      schema: defaultedSchema,
      migrations: defaultedMigrations,
      oldSchemas: defaultedOldSchemas,
    });
  }
}
