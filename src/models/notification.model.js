import mongoose from 'mongoose';

import serialize from './plugins/serialize.js';

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
    type: { type: String, required: true },
    title: { type: String, required: true, maxlength: 160 },
    body: { type: String, default: '', maxlength: 400 },
    entityType: { type: String, default: null },
    entityId: { type: mongoose.Schema.Types.ObjectId, default: null },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    readAt: { type: Date, default: null }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

notificationSchema.index({ user: 1, readAt: 1, createdAt: -1 });
notificationSchema.index({ user: 1, workspace: 1, createdAt: -1 });
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

notificationSchema.plugin(serialize);

export default mongoose.model('Notification', notificationSchema);
