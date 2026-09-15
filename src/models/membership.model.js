import mongoose from 'mongoose';

import serialize from './plugins/serialize.js';
import { WORKSPACE_ROLE } from '../constants/roles.js';

const membershipSchema = new mongoose.Schema(
  {
    workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: Object.values(WORKSPACE_ROLE), default: WORKSPACE_ROLE.MEMBER },
    invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    lastSeenAt: { type: Date, default: null }
  },
  { timestamps: true }
);

membershipSchema.index({ workspace: 1, user: 1 }, { unique: true });
membershipSchema.index({ user: 1, updatedAt: -1 });
membershipSchema.index({ workspace: 1, role: 1 });

membershipSchema.plugin(serialize);

export default mongoose.model('Membership', membershipSchema);
