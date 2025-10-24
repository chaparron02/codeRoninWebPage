import mongoose from 'mongoose';

const CourseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    image: { type: String, default: '' },
    tags: { type: [String], default: [] },
    modalidad: { type: String, enum: ['virtual','presencial'], default: 'virtual' },
    price: { type: String },
    link: { type: String },
    category: { type: String },
    skills: { type: [String], default: [] },
    outcome: { type: String, default: '' },
    level: { type: String, default: '' },
    duration: { type: String, default: '' },
    productId: { type: String, trim: true, index: true },
  },
  { timestamps: true, versionKey: false }
);

export const Course = mongoose.model('Course', CourseSchema);
