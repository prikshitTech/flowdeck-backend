import mongoose from 'mongoose';

import serialize from './plugins/serialize.js';
import { AUDIT_RETENTION_DAYS } from '../constants/audit.js';

const auditLogSchema = new mongoose.Schema(
  {
    workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', default: null },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    action: { type: String, required: true },
    entityType: { type: String, default: null },
    entityId: { type: mongoose.Schema.Types.ObjectId, default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: null },
    ip: { type: String, default: null },
    userAgent: { type: String, default: null }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

auditLogSchema.index({ workspace: 1, createdAt: -1 });
auditLogSchema.index({ workspace: 1, action: 1, createdAt: -1 });
auditLogSchema.index({ actor: 1, createdAt: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1 });
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: AUDIT_RETENTION_DAYS * 24 * 60 * 60 });

auditLogSchema.plugin(serialize);

export default mongoose.model('AuditLog', auditLogSchema);
