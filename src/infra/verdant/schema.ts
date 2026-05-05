import { schema } from "@verdant-web/store";

const notes = schema.collection({
  name: "note",
  primaryKey: "id",
  fields: {
    id: schema.fields.string({
      default: () => `note-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    }),
    content: schema.fields.string({ default: "" }),
    images: schema.fields.array({
      items: schema.fields.object({
        properties: {
          file: schema.fields.file({ nullable: true }),
          fileName: schema.fields.string({ default: "" }),
          sizeBytes: schema.fields.number({ default: 0 }),
          createdAt: schema.fields.string({ default: () => new Date().toISOString() }),
        },
      }),
    }),
    labels: schema.fields.array({ items: schema.fields.string() }),
    isTask: schema.fields.boolean({ default: false }),
    taskDone: schema.fields.boolean({ default: false }),
    createdAt: schema.fields.string({ default: () => new Date().toISOString() }),
    updatedAt: schema.fields.string({ default: () => new Date().toISOString() }),
    archived: schema.fields.boolean({ default: false }),
  },
  indexes: {
    archived: { field: "archived" },
    isTask: { field: "isTask" },
    updatedAt: { field: "updatedAt" },
  },
  compounds: {
    archivedByUpdatedAt: { of: ["archived", "updatedAt"] },
  },
});

export default schema({
  version: 1,
  collections: { notes },
});
