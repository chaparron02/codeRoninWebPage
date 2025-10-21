import mongoose from 'mongoose';

const MissionSchema = new mongoose.Schema(
  {
    category: { type: String, enum: ['red','blue','social'], required: true },
    title: { type: String, required: true, trim: true },
    desc: { type: String, default: '' },
    tags: { type: [String], default: [] },
    image: { type: String, default: '' },
  },
  { timestamps: true, versionKey: false }
);

export const Mission = mongoose.model('Mission', MissionSchema);

