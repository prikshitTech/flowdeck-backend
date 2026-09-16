import mongoose from 'mongoose';

import serialize from './plugins/serialize.js';
import { CARD_PRIORITY } from '../constants/board.js';

const cardSchema = new mongoose.Schema(
  {
    board: { type: mongoose.Schema.Types.ObjectId, ref: 'Board', required: true },
    list: { type: mongoose.Schema.Types.ObjectId, ref: 'BoardList', required: true },
    workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, default: '', maxlength: 8000 },
    position: { type: Number, default: 0 },
    priority: { type: String, enum: Object.values(CARD_PRIORITY), default: CARD_PRIORITY.NORMAL },
    labels: { type: [String], default: [] },
    assignees: { type: [mongoose.Schema.Types.ObjectId], ref: 'User', default: [] },
    dueAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    archivedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

cardSchema.index({ list: 1, position: 1 });
cardSchema.index({ board: 1, archivedAt: 1 });
cardSchema.index({ workspace: 1, assignees: 1, dueAt: 1 });
cardSchema.index({ title: 'text', description: 'text' }, { weights: { title: 6, description: 1 }, name: 'card_search_idx' });

cardSchema.plugin(serialize);

export default mongoose.model('Card', cardSchema);
