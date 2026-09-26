import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ISessionAnswer {
  questionId: string;
  questionText: string;
  text: string;
  score?: number;
  feedback?: string;
  timestamp?: Date;
  isFollowUp?: boolean;
}

export interface ISessionEvaluation {
  technicalScore?: number;
  communicationScore?: number;
  problemSolvingScore?: number;
  overallScore?: number;
  overallRecommendation?: string;
  summary?: string;
  strengths?: string[];
  weaknesses?: string[];
}

export type SessionStatus =
  | 'Not Started'
  | 'Started'
  | 'In Progress'
  | 'Completed'
  | 'Terminated';

export interface IInterviewSession {
  job: Types.ObjectId;
  application: Types.ObjectId | null;
  candidateId: string;
  candidateName: string | null;
  status: SessionStatus;
  answers: ISessionAnswer[];
  evaluation?: ISessionEvaluation;
  language: 'en' | 'ru' | 'uz';
  completedAt?: Date;
  recordingPath: string | null;
  recordingKey: string | null;
  s3UploadId: string | null;
  candidateFeedback?: { rating?: number; comment?: string };
  hrFeedback?: {
    rating?: number;
    comment?: string;
    evaluatedBy?: Types.ObjectId;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IInterviewSessionDocument extends IInterviewSession, Document {}

const answerSchema = new Schema<ISessionAnswer>(
  {
    questionId: { type: String, required: true },
    questionText: { type: String, required: true },
    text: { type: String, required: true },
    score: { type: Number },
    feedback: { type: String },
    timestamp: { type: Date, default: Date.now },
    isFollowUp: { type: Boolean, default: false },
  },
  { _id: false }
);

const evaluationSchema = new Schema<ISessionEvaluation>(
  {
    technicalScore: { type: Number },
    communicationScore: { type: Number },
    problemSolvingScore: { type: Number },
    overallScore: { type: Number },
    overallRecommendation: { type: String },
    summary: { type: String },
    strengths: [{ type: String }],
    weaknesses: [{ type: String }],
  },
  { _id: false }
);

const sessionSchema = new Schema<IInterviewSessionDocument>(
  {
    job: {
      type: Schema.Types.ObjectId,
      ref: 'Job',
      required: true,
    },
    application: {
      type: Schema.Types.ObjectId,
      ref: 'Application',
      default: null,
    },
    candidateId: { type: String, required: true },
    candidateName: { type: String, default: null },
    status: {
      type: String,
      enum: ['Not Started', 'Started', 'In Progress', 'Completed', 'Terminated'],
      default: 'Started',
    },
    answers: [answerSchema],
    evaluation: evaluationSchema,
    language: { type: String, enum: ['en', 'ru', 'uz'], default: 'ru' },
    completedAt: { type: Date },
    recordingPath: { type: String, default: null },
    recordingKey: { type: String, default: null },
    s3UploadId: { type: String, default: null },
    candidateFeedback: {
      rating: { type: Number, min: 1, max: 5 },
      comment: { type: String },
    },
    hrFeedback: {
      rating: { type: Number, min: 1, max: 5 },
      comment: { type: String },
      evaluatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    },
  },
  { timestamps: true }
);

sessionSchema.index({ job: 1 });
sessionSchema.index({ application: 1 });

const InterviewSession = mongoose.model<IInterviewSessionDocument>(
  'InterviewSession',
  sessionSchema
);

export default InterviewSession;
