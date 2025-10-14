import mongoose from 'mongoose';

const commonOpts = { timestamps: true, versionKey: false };

const CourseInquirySchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  email: { type: String, required: true },
  empresa: { type: String },
  interes: { type: String },
  modalidad: { type: String },
  mensaje: { type: String },
  userAgent: { type: String },
  ip: { type: String },
}, commonOpts);

const MissionInquirySchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  email: { type: String, required: true },
  empresa: { type: String },
  categoria: { type: String },
  interes: { type: String },
  tipo: { type: String },
  alcance: { type: String },
  ventanas: { type: String },
  restricciones: { type: String },
  contacto: { type: String },
  userAgent: { type: String },
  ip: { type: String },
}, commonOpts);

export const CourseInquiry = mongoose.model('CourseInquiry', CourseInquirySchema);
export const MissionInquiry = mongoose.model('MissionInquiry', MissionInquirySchema);

