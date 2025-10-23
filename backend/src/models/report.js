import mongoose from 'mongoose';

const AttachmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    url: { type: String, required: true },
    mime: { type: String, default: '' },
    size: { type: Number, default: 0 },
    uploadedBy: {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      username: { type: String, required: true },
      role: { type: String, default: '' },
    },
    createdAt: { type: Date, default: () => new Date() },
  },
  { _id: true, id: true }
);

const ChatMessageSchema = new mongoose.Schema(
  {
    user: {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      username: { type: String, required: true },
      role: { type: String, default: '' },
    },
    message: { type: String, default: '' },
    attachments: { type: [AttachmentSchema], default: [] },
    createdAt: { type: Date, default: () => new Date() },
  },
  { _id: true, id: true }
);

const ReportSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    summary: { type: String, default: '' },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    shogunId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    progress: { type: Number, min: 0, max: 100, default: 0 },
    status: { type: String, default: 'iniciando' },
    service: { type: String, default: '' },
    tags: { type: [String], default: [] },
    attachments: { type: [AttachmentSchema], default: [] },
    chat: { type: [ChatMessageSchema], default: [] },
  },
  { timestamps: true, versionKey: false }
);

export const Report = mongoose.model('Report', ReportSchema);
