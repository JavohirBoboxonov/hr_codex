import mongoose, { Document, Model, Schema } from 'mongoose';

export type VerificationCodeType = 'register' | 'login' | 'reset-password';

export interface IVerificationCode {
  email: string;
  code: string;
  type: VerificationCodeType;
  expiresAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IVerificationCodeDocument extends IVerificationCode, Document {}

const verificationCodeSchema = new Schema<IVerificationCodeDocument>(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
    },
    code: {
      type: String,
      required: true,
      minlength: 6,
      maxlength: 6,
    },
    type: {
      type: String,
      enum: ['register', 'login', 'reset-password'],
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 60 * 1000),
    },
  },
  {
    timestamps: true,
  }
);

verificationCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
verificationCodeSchema.index({ email: 1, type: 1 }, { unique: true });

const VerificationCode = mongoose.model<IVerificationCodeDocument>(
  'VerificationCode',
  verificationCodeSchema
);

export default VerificationCode;
