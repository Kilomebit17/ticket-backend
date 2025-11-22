import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum TaskStatus {
  CREATED = 'Created',
  PENDING = 'Pending',
  APPROVED = 'Approved',
}

export type TaskDocument = Task & Document;

@Schema({ timestamps: true, collection: 'tasks' })
export class Task {
  _id: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop({ type: String, required: false })
  description: string | null;

  @Prop({ type: Number, required: true })
  price: number;

  @Prop({
    type: String,
    enum: TaskStatus,
    default: TaskStatus.CREATED,
  })
  status: TaskStatus;

  @Prop({ type: Types.ObjectId, ref: 'Family', required: true })
  familyId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  creatorId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  solverId: Types.ObjectId | null;

  @Prop({ type: Date, required: false })
  solvedAt: Date | null;

  @Prop({ type: Date, required: false })
  approvedAt: Date | null;

  createdAt: Date;
  updatedAt: Date;

  // Virtual for id (to match TypeORM behavior)
  get id(): string {
    return this._id.toString();
  }
}

export const TaskSchema = SchemaFactory.createForClass(Task);

// Add virtual id field
TaskSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

// Ensure virtual fields are serialized
TaskSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret: any) {
    ret.id = ret._id?.toString() || ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});
