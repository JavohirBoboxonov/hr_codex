import crypto from 'crypto';
import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IJobQuestion {
  id: string;
  text: string;
  category: string;
  answerType: 'TEXT' | 'VIDEO' | 'VOICE';
  difficulty: string;
}

export type JobStatus = 'Active' | 'Paused' | 'Archived' | 'Closed';

export interface IJob {
  createdBy: Types.ObjectId;
  title: string;
  department: string;
  role: string;
  description: string;
  experienceLevel: 'Junior' | 'Mid' | 'Senior' | 'Lead';
  requiredSkills: string[];
  interviewType: 'TEXT' | 'VIDEO' | 'VOICE';
  interviewCategory: 'TECHNICAL' | 'CAREER' | 'ACADEMIC';
  interviewMode: 'ASYNC' | 'SCHEDULED' | 'INSTANT';
  visibility: 'PUBLIC' | 'PRIVATE';
  sourceLanguage: 'en' | 'ru' | 'uz';
  resumeRequired: boolean;
  recordingEnabled: boolean;
  questions: IJobQuestion[];
  deadline?: Date;
  startTime?: Date;
  endTime?: Date;
  status: JobStatus;
  shareToken?: string;
  inviteCode?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IJobDocument extends IJob, Document {}

const questionSchema = new Schema<IJobQuestion>({
  id: { type: String, required: true },
  text: { type: String, required: true },
  category: { type: String, required: true },
  answerType: { type: String, enum: ['TEXT', 'VIDEO', 'VOICE'], required: true },
  difficulty: { type: String, required: true },
});

const jobSchema = new Schema<IJobDocument>(
  {
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: { type: String, required: true },
    department: { type: String, default: 'IT' },
    role: { type: String, required: true },
    description: { type: String, required: true },
    experienceLevel: {
      type: String,
      enum: ['Junior', 'Mid', 'Senior', 'Lead'],
      default: 'Mid',
    },
    requiredSkills: [{ type: String }],
    interviewType: {
      type: String,
      enum: ['TEXT', 'VIDEO', 'VOICE'],
      default: 'VOICE',
    },
    interviewCategory: {
      type: String,
      enum: ['TECHNICAL', 'CAREER', 'ACADEMIC'],
      default: 'TECHNICAL',
    },
    interviewMode: {
      type: String,
      enum: ['ASYNC', 'SCHEDULED', 'INSTANT'],
      default: 'INSTANT',
    },
    visibility: {
      type: String,
      enum: ['PUBLIC', 'PRIVATE'],
      default: 'PUBLIC',
    },
    sourceLanguage: {
      type: String,
      enum: ['en', 'ru', 'uz'],
      default: 'ru',
    },
    resumeRequired: { type: Boolean, default: true },
    recordingEnabled: { type: Boolean, default: false },
    questions: [questionSchema],
    deadline: { type: Date },
    startTime: { type: Date },
    endTime: { type: Date },
    status: {
      type: String,
      enum: ['Active', 'Paused', 'Archived', 'Closed'],
      default: 'Active',
    },
    shareToken: { type: String },
    inviteCode: { type: String },
  },
  { timestamps: true }
);

jobSchema.pre('save', function (next) {
  if (!this.shareToken) {
    this.shareToken = crypto.randomBytes(12).toString('hex');
  }
  if (!this.inviteCode) {
    this.inviteCode = 'INV-' + crypto.randomBytes(2).toString('hex').toUpperCase();
  }
  next();
});

jobSchema.index({ createdBy: 1 });
jobSchema.index({ status: 1, visibility: 1 });
jobSchema.index({ shareToken: 1 }, { unique: true });
jobSchema.index({ inviteCode: 1 });

const Job = mongoose.model<IJobDocument>('Job', jobSchema);

export default Job;
