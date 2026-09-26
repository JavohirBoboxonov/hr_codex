import mongoose, { Document, Schema, Types } from 'mongoose';

export type PaymentProvider = 'manual' | 'payme' | 'click';
export type PaymentStatus = 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';

export interface IPayment {
  userId: Types.ObjectId;
  tariffId: Types.ObjectId;
  amount: number;
  interviews: number;
  provider: PaymentProvider;
  status: PaymentStatus;
  receiptPath: string | null;
  receiptFileName: string | null;
  adminNote: string | null;
  approvedBy: Types.ObjectId | null;
  approvedAt: Date | null;
  rejectedAt: Date | null;
  paymeTransactionId: string | null;
  paymeState: number | null;
  paymeCreateTime: number | null;
  paymePerformTime: number | null;
  paymeCancelTime: number | null;
  paymeReason: number | null;
  paymeAccount: unknown;
  clickTransactionId: string | null;
  clickPrepareId: number | null;
  clickStatus: number | null;
  clickCreateTime: number | null;
  clickCompleteTime: number | null;
  clickAccount: unknown;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IPaymentDocument extends IPayment, Document {}

const paymentSchema = new Schema<IPaymentDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    tariffId: {
      type: Schema.Types.ObjectId,
      ref: 'Tariff',
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    interviews: {
      type: Number,
      required: true,
      min: 1,
    },
    provider: {
      type: String,
      enum: ['manual', 'payme', 'click'],
      default: 'manual',
    },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected', 'Cancelled'],
      default: 'Pending',
    },
    receiptPath: { type: String, default: null },
    receiptFileName: { type: String, default: null },
    adminNote: { type: String, default: null },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    approvedAt: { type: Date, default: null },
    rejectedAt: { type: Date, default: null },
    paymeTransactionId: { type: String, default: null, index: true },
    paymeState: { type: Number, default: null },
    paymeCreateTime: { type: Number, default: null },
    paymePerformTime: { type: Number, default: null },
    paymeCancelTime: { type: Number, default: null },
    paymeReason: { type: Number, default: null },
    paymeAccount: { type: Schema.Types.Mixed, default: null },
    clickTransactionId: { type: String, default: null, index: true },
    clickPrepareId: { type: Number, default: null },
    clickStatus: { type: Number, default: null },
    clickCreateTime: { type: Number, default: null },
    clickCompleteTime: { type: Number, default: null },
    clickAccount: { type: Schema.Types.Mixed, default: null },
  },
  {
    timestamps: true,
  }
);

paymentSchema.index({ userId: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ createdAt: -1 });
paymentSchema.index({ userId: 1, status: 1 });

const Payment = mongoose.model<IPaymentDocument>('Payment', paymentSchema);

export default Payment;
