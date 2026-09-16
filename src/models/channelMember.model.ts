import mongoose from 'mongoose';

import serialize from './plugins/serialize.js';

const channelMemberSchema = new mongoose.Schema(
  {
    channel: { type: mongoose.Schema.Types.ObjectId, ref: 'Channel', required: true },
    workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    lastReadAt: { type: Date, default: null },
    muted: { type: Boolean, default: false }
  },
  { timestamps: true }
);

channelMemberSchema.index({ channel: 1, user: 1 }, { unique: true });
channelMemberSchema.index({ user: 1, workspace: 1 });

channelMemberSchema.plugin(serialize);

export default mongoose.model('ChannelMember', channelMemberSchema);
