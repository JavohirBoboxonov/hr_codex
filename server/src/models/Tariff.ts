import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ITariff {
  name: string;
  description: string;
  price: number;
  interviews: number;
  isActive: boolean;
  createdBy: Types.ObjectId | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ITariffDocument extends ITariff, Document {}

const tariffSchema = new Schema<ITariffDocument>(
  {
    name: {
      type: String,
      required: [true, 'Tarif nomi kiritilishi shart'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    price: {
      type: Number,
      required: [true, 'Narx kiritilishi shart'],
      min: [0, "Narx manfiy bo'lishi mumkin emas"],
    },
    interviews: {
      type: Number,
      required: [true, 'Suhbatlar soni kiritilishi shart'],
      min: [1, "Kamida 1 ta suhbat bo'lishi kerak"],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

tariffSchema.index({ isActive: 1 });

const Tariff = mongoose.model<ITariffDocument>('Tariff', tariffSchema);

export default Tariff;
