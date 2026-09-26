import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IChatMessage {
  application: Types.ObjectId;
  text: string;
  senderName: string;
  senderRole: 'hr' | 'candidate' | 'system';
  isRead: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IChatMessageDocument extends IChatMessage, Document {}

const chatMessageSchema = new Schema<IChatMessageDocument>(
  {
    application: {
      type: Schema.Types.ObjectId,
      ref: 'Application',
      required: true,
    },
    text: { type: String, required: true },
    senderName: { type: String, required: true },
    senderRole: { type: String, enum: ['hr', 'candidate', 'system'], default: 'hr' },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

chatMessageSchema.index({ application: 1 });

const ChatMessage = mongoose.model<IChatMessageDocument>('ChatMessage', chatMessageSchema);

export default ChatMessage;
