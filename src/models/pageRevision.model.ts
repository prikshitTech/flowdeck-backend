import mongoose from 'mongoose';

import serialize from './plugins/serialize.js';

const pageRevisionSchema = new mongoose.Schema(
  {
    page: { type: mongoose.Schema.Types.ObjectId, ref: 'Page', required: true },
    workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
    version: { type: Number, required: true },
    title: { type: String, required: true },
    body: { type: String, default: '' },
    editedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

pageRevisionSchema.index({ page: 1, version: -1 }, { unique: true });
pageRevisionSchema.index({ workspace: 1, createdAt: -1 });

pageRevisionSchema.plugin(serialize);

export default mongoose.model('PageRevision', pageRevisionSchema);
