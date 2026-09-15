import mongoose from 'mongoose';

import serialize from './plugins/serialize.js';

const reactionSchema = new mongoose.Schema(
  {
    emoji: { type: String, required: true },
    users: { type: [mongoose.Schema.Types.ObjectId], ref: 'User', default: [] }
  },
  { _id: false }
);

const messageSchema = new mongoose.Schema(
  {
    channel: { type: mongoose.Schema.Types.ObjectId, ref: 'Channel', required: true },
    workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    body: { type: String, default: '', maxlength: 4000 },
    parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },
    replyCount: { type: Number, default: 0, min: 0 },
    mentions: { type: [mongoose.Schema.Types.ObjectId], ref: 'User', default: [] },
    attachments: { type: [mongoose.Schema.Types.ObjectId], ref: 'FileAsset', default: [] },
    reactions: { type: [reactionSchema], default: [] },
    editedAt: { type: Date, default: null },
    deletedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

messageSchema.index({ channel: 1, createdAt: -1 });
messageSchema.index({ parent: 1, createdAt: 1 });
messageSchema.index({ workspace: 1, mentions: 1, createdAt: -1 });
messageSchema.index({ body: 'text' }, { name: 'message_search_idx' });

messageSchema.plugin(serialize);

export default mongoose.model('Message', messageSchema);
