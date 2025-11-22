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
