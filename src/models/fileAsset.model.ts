import mongoose from 'mongoose';

import serialize from './plugins/serialize.js';

const fileAssetSchema = new mongoose.Schema(
  {
    workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    originalName: { type: String, required: true, maxlength: 255 },
    storedName: { type: String, required: true, unique: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true, min: 0 },
    checksum: { type: String, required: true },
    entityType: { type: String, default: null },
    entityId: { type: mongoose.Schema.Types.ObjectId, default: null }
  },
  { timestamps: true }
);

fileAssetSchema.index({ workspace: 1, createdAt: -1 });
fileAssetSchema.index({ workspace: 1, checksum: 1 });
fileAssetSchema.index({ entityType: 1, entityId: 1 });

fileAssetSchema.plugin(serialize);

export default mongoose.model('FileAsset', fileAssetSchema);
