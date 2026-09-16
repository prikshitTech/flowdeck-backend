import mongoose from 'mongoose';

import serialize from './plugins/serialize.js';

const boardSchema = new mongoose.Schema(
  {
    workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, default: '', maxlength: 400 },
    colour: { type: String, default: 'slate' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    archivedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

boardSchema.index({ workspace: 1, archivedAt: 1, updatedAt: -1 });
boardSchema.index({ name: 'text', description: 'text' }, { name: 'board_search_idx' });

boardSchema.plugin(serialize);

export default mongoose.model('Board', boardSchema);
