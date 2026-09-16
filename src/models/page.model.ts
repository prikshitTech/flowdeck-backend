import mongoose from 'mongoose';

import serialize from './plugins/serialize.js';

const pageSchema = new mongoose.Schema(
  {
    workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
    parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Page', default: null },
    path: { type: [mongoose.Schema.Types.ObjectId], default: [] },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    body: { type: String, default: '' },
    icon: { type: String, default: null },
    position: { type: Number, default: 0 },
    version: { type: Number, default: 1 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    archivedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

pageSchema.index({ workspace: 1, parent: 1, position: 1 });
pageSchema.index({ workspace: 1, updatedAt: -1 });
pageSchema.index({ path: 1 });
pageSchema.index(
  { title: 'text', body: 'text' },
  { weights: { title: 8, body: 1 }, name: 'page_search_idx' }
);

pageSchema.plugin(serialize);

export default mongoose.model('Page', pageSchema);
