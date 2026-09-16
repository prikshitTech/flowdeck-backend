import mongoose from 'mongoose';

import serialize from './plugins/serialize.js';
import { CHANNEL_VISIBILITY } from '../constants/channel.js';

const channelSchema = new mongoose.Schema(
  {
    workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
    name: { type: String, required: true, trim: true, maxlength: 60 },
    slug: { type: String, required: true, lowercase: true, trim: true },
    topic: { type: String, default: '', maxlength: 200 },
    visibility: {
      type: String,
      enum: Object.values(CHANNEL_VISIBILITY),
      default: CHANNEL_VISIBILITY.PUBLIC
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    memberCount: { type: Number, default: 1, min: 0 },
    messageCount: { type: Number, default: 0, min: 0 },
    lastMessageAt: { type: Date, default: null },
    archivedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

channelSchema.index({ workspace: 1, slug: 1 }, { unique: true });
channelSchema.index({ workspace: 1, archivedAt: 1, lastMessageAt: -1 });
channelSchema.index({ name: 'text', topic: 'text' }, { name: 'channel_search_idx' });

channelSchema.plugin(serialize);

export default mongoose.model('Channel', channelSchema);
