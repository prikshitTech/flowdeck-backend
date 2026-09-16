import mongoose from 'mongoose';

import serialize from './plugins/serialize.js';

const workspaceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, default: '', maxlength: 400 },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    memberCount: { type: Number, default: 1, min: 0 },
    archivedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

workspaceSchema.index({ owner: 1, archivedAt: 1 });
workspaceSchema.index({ name: 'text', description: 'text' }, { name: 'workspace_search_idx' });

workspaceSchema.plugin(serialize);

export default mongoose.model('Workspace', workspaceSchema);
