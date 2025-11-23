import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum Sex {
  MAN = 'man',
  WOMAN = 'woman',
}

export type UserDocument = User & Document;

@Schema({ timestamps: true, collection: 'users' })
export class User {
  _id: Types.ObjectId;

  @Prop({ required: true, unique: true })
  telegramId: string;

  @Prop({ required: true })
  firstName: string;

  @Prop({ type: String, required: false })
  lastName: string | null;

  @Prop({ type: String, required: false })
  username: string | null;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true, enum: Sex })
  sex: Sex;

  @Prop({ type: Number, default: 0 })
  balance: number;

  @Prop({ type: String, required: false })
  bio: string | null;

  @Prop({ type: String, required: false })
  photoUrl: string | null;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Family' }], default: [] })
  families: Types.ObjectId[];

  createdAt: Date;
  updatedAt: Date;

  // Virtual for id (to match TypeORM behavior)
  get id(): string {
    return this._id.toString();
  }
}

export const UserSchema = SchemaFactory.createForClass(User);

/**
 * Helper function to normalize date fields from MongoDB Extended JSON format
 * Handles both Date objects and Extended JSON format: { '$date': 'ISO_STRING' }
 */
function normalizeDate(value: any): Date | undefined {
  if (!value) {
    return undefined;
  }
  if (value instanceof Date) {
    return value;
  }
  if (typeof value === 'string') {
    return new Date(value);
  }
  if (value && typeof value === 'object' && '$date' in value) {
    // MongoDB Extended JSON format
    return new Date(value.$date);
  }
  return undefined;
}

// Pre-validate hook to normalize createdAt and updatedAt fields before validation
UserSchema.pre('validate', function (next) {
  // Normalize createdAt if it's in Extended JSON format
  if (this.createdAt && typeof this.createdAt === 'object' && '$date' in this.createdAt) {
    const normalized = normalizeDate(this.createdAt);
    if (normalized) {
      this.createdAt = normalized;
    }
  }
  
  // Normalize updatedAt if it's in Extended JSON format
  if (this.updatedAt && typeof this.updatedAt === 'object' && '$date' in this.updatedAt) {
    const normalized = normalizeDate(this.updatedAt);
    if (normalized) {
      this.updatedAt = normalized;
    }
  }
  
  next();
});

// Add virtual id field
UserSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

// Ensure virtual fields are serialized
UserSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret: any) {
    ret.id = ret._id?.toString() || ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});
