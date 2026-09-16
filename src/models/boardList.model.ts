import mongoose from 'mongoose';

import serialize from './plugins/serialize.js';

const boardListSchema = new mongoose.Schema(
  {
    board: { type: mongoose.Schema.Types.ObjectId, ref: 'Board', required: true },
    workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    position: { type: Number, default: 0 },
    cardLimit: { type: Number, default: null, min: 1 },
    archivedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

boardListSchema.index({ board: 1, position: 1 });
boardListSchema.index({ workspace: 1, archivedAt: 1 });

boardListSchema.plugin(serialize);

export default mongoose.model('BoardList', boardListSchema);
