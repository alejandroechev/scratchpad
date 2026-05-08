/** @generated - do not modify this file. */

// src/infra/verdant/schema.ts
import { schema } from "@verdant-web/store";
var notes = schema.collection({
  name: "note",
  primaryKey: "id",
  fields: {
    id: schema.fields.string({
      default: () => `note-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    }),
    content: schema.fields.string({ default: "" }),
    images: schema.fields.array({
      items: schema.fields.object({
        properties: {
          file: schema.fields.file({ nullable: true }),
          fileName: schema.fields.string({ default: "" }),
          sizeBytes: schema.fields.number({ default: 0 }),
          createdAt: schema.fields.string({ default: () => (/* @__PURE__ */ new Date()).toISOString() })
        }
      })
    }),
    labels: schema.fields.array({ items: schema.fields.string() }),
    checklistItems: schema.fields.array({
      items: schema.fields.object({
        properties: {
          text: schema.fields.string({ default: "" }),
          done: schema.fields.boolean({ default: false })
        }
      })
    }),
    isTask: schema.fields.boolean({ default: false }),
    taskDone: schema.fields.boolean({ default: false }),
    createdAt: schema.fields.string({ default: () => (/* @__PURE__ */ new Date()).toISOString() }),
    updatedAt: schema.fields.string({ default: () => (/* @__PURE__ */ new Date()).toISOString() }),
    archived: schema.fields.boolean({ default: false })
  },
  indexes: {
    archived: { field: "archived" },
    isTask: { field: "isTask" },
    updatedAt: { field: "updatedAt" }
  },
  compounds: {
    archivedByUpdatedAt: { of: ["archived", "updatedAt"] }
  }
});
var schema_default = schema({
  version: 1,
  collections: { notes }
});
export {
  schema_default as default
};
