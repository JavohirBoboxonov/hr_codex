import mongoose, { Document, Model, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IEducation {
  institution: string;
  degree: string;
  field: string;
  startYear: number | null;
  endYear: number | null;
  description: string;
}

export interface IWorkExperience {
  company: string;
  position: string;
  startYear: number | null;
  startMonth: number | null;
  endYear: number | null;
  endMonth: number | null;
  current: boolean;
  description: string;
}

export type UserRole = 'employer' | 'candidate' | 'admin' | null;

export interface IUser {
  fullName: string;
  email: string;
  password: string;
  role: UserRole;
  isEmailVerified: boolean;
  interviews: number;
  freeJobsUsed: number;
  avatar: string | null;
  dateOfBirth: Date | null;
  address: string;
  gender: 'male' | 'female' | 'other' | '';
  education: IEducation[];
  workExperience: IWorkExperience[];
  isPartner?: boolean;
  referralCode?: string;
  referredBy?: mongoose.Types.ObjectId | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IUserDocument extends IUser, Document {
  comparePassword(candidatePassword: string): Promise<boolean>;
}

export interface IUserModel extends Model<IUserDocument> {}

const educationSchema = new Schema<IEducation>(
  {
    institution: { type: String, trim: true, default: '' },
    degree: { type: String, trim: true, default: '' },
    field: { type: String, trim: true, default: '' },
    startYear: { type: Number, default: null },
    endYear: { type: Number, default: null },
    description: { type: String, trim: true, default: '' },
  },
  { _id: true }
);

const workExperienceSchema = new Schema<IWorkExperience>(
  {
    company: { type: String, trim: true, default: '' },
    position: { type: String, trim: true, default: '' },
    startYear: { type: Number, default: null },
    startMonth: { type: Number, default: null },
    endYear: { type: Number, default: null },
    endMonth: { type: Number, default: null },
    current: { type: Boolean, default: false },
    description: { type: String, trim: true, default: '' },
  },
  { _id: true }
);

const userSchema = new Schema<IUserDocument>(
  {
    fullName: {
      type: String,
      required: [true, "To'liq ism kiritilishi shart"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Elektron pochta kiritilishi shart'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "To'g'ri elektron pochta kiriting"],
    },
    password: {
      type: String,
      required: [true, 'Parol kiritilishi shart'],
      minlength: [6, "Parol kamida 6 ta belgidan iborat bo'lishi kerak"],
      select: false,
    },
    role: {
      type: String,
      enum: ['employer', 'candidate', 'admin', null],
      default: null,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    interviews: {
      type: Number,
      default: 0,
      min: 0,
    },
    freeJobsUsed: {
      type: Number,
      default: 0,
      min: 0,
    },
    avatar: { type: String, default: null },
    dateOfBirth: { type: Date, default: null },
    address: { type: String, trim: true, default: '' },
    gender: { type: String, enum: ['male', 'female', 'other', ''], default: '' },
    education: [educationSchema],
    workExperience: [workExperienceSchema],
    isPartner: {
      type: Boolean,
      default: false,
    },
    referralCode: {
      type: String,
      unique: true,
      sparse: true,
    },
    referredBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model<IUserDocument, IUserModel>('User', userSchema);

export default User;
