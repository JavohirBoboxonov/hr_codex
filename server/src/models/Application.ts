import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IResumeAnalysis {
  skillsScore?: number;
  experienceScore?: number;
  relevanceScore?: number;
  overallScore?: number;
  detectedSkills?: string[];
  summary?: string;
  suitabilityLabel?: 'High' | 'Medium' | 'Low';
}

export type ApplicationStatus =
  | 'Applied'
  | 'Screened'
  | 'Interviewing'
  | 'Completed'
  | 'Rejected';

export interface IApplication {
  job: Types.ObjectId;
  name: string;
  email: string;
  phone: string;
  experienceYears: number;
  resumeFileName: string;
  resumeMimeType: string;
  resumeBase64: string;
  analysis?: IResumeAnalysis;
  status: ApplicationStatus;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IApplicationDocument extends IApplication, Document {}

const resumeAnalysisSchema = new Schema<IResumeAnalysis>(
  {
    skillsScore: { type: Number },
    experienceScore: { type: Number },
    relevanceScore: { type: Number },
    overallScore: { type: Number },
    detectedSkills: [{ type: String }],
    summary: { type: String },
    suitabilityLabel: { type: String, enum: ['High', 'Medium', 'Low'] },
  },
  { _id: false }
);

const applicationSchema = new Schema<IApplicationDocument>(
  {
    job: {
      type: Schema.Types.ObjectId,
      ref: 'Job',
      required: true,
    },
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, default: '' },
    experienceYears: { type: Number, default: 0 },
    resumeFileName: { type: String, default: '' },
    resumeMimeType: { type: String, default: '' },
    resumeBase64: { type: String, default: '' },
    analysis: resumeAnalysisSchema,
    status: {
      type: String,
      enum: ['Applied', 'Screened', 'Interviewing', 'Completed', 'Rejected'],
      default: 'Applied',
    },
  },
  { timestamps: true }
);

applicationSchema.index({ job: 1 });
applicationSchema.index({ email: 1, job: 1 });

const Application = mongoose.model<IApplicationDocument>('Application', applicationSchema);

export default Application;
