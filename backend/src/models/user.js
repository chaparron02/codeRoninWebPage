import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, index: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['admin','user'], default: 'user' },
    displayName: { type: String },
    name: { type: String },
    email: { type: String },
    phone: { type: String },
    avatarUrl: { type: String },
    active: { type: Boolean, default: true },
  },
  { timestamps: true, versionKey: false }
);

export const User = mongoose.model('User', UserSchema);
