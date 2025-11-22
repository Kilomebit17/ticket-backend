import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum FamilyInviteStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
}

export type FamilyInviteDocument = FamilyInvite & Document;

@Schema({ timestamps: true, collection: 'family_invites' })
export class FamilyInvite {
  _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  fromUserId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  toUserId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Family', required: false })
  familyId: Types.ObjectId | null;

  @Prop({
    type: String,
    enum: FamilyInviteStatus,
    default: FamilyInviteStatus.PENDING,
  })
  status: FamilyInviteStatus;

  createdAt: Date;
  updatedAt: Date;

  // Virtual for id (to match TypeORM behavior)
  get id(): string {
    return this._id.toString();
  }
}

export const FamilyInviteSchema = SchemaFactory.createForClass(FamilyInvite);

// Add virtual id field
FamilyInviteSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

// Ensure virtual fields are serialized
FamilyInviteSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret: any) {
    ret.id = ret._id?.toString() || ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});
