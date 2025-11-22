import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type FamilyDocument = Family & Document;

@Schema({ timestamps: true, collection: 'families' })
export class Family {
  _id: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  creatorId: Types.ObjectId;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  members: Types.ObjectId[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Task' }], default: [] })
  tasks: Types.ObjectId[];

  createdAt: Date;
  updatedAt: Date;

  // Virtual for id (to match TypeORM behavior)
  get id(): string {
    return this._id.toString();
  }
}

export const FamilySchema = SchemaFactory.createForClass(Family);

// Add virtual id field
FamilySchema.virtual('id').get(function () {
  return this._id.toHexString();
});

// Ensure virtual fields are serialized
FamilySchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret: any) {
    ret.id = ret._id?.toString() || ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});
