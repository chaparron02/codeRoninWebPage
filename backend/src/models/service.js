import mongoose from 'mongoose';

const ServiceSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    image: { type: String, default: '' },
    tags: { type: [String], default: [] },
  },
  { timestamps: true, versionKey: false }
);

export const Service = mongoose.model('Service', ServiceSchema);

