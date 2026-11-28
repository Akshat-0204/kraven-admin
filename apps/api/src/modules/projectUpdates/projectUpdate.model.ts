import { Schema, Types, model } from 'mongoose';

/** A progress note on a project. Only `clientVisible` updates reach the client portal. */
export interface ProjectUpdateDocument {
  project: Types.ObjectId;
  title: string;
  /** Plain text. */
  body: string;
  clientVisible: boolean;
  /** FileMetadata ids; the portal shows only the ones that are themselves client-visible. */
  attachments: Types.ObjectId[];
  postedAt: Date;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const projectUpdateSchema = new Schema<ProjectUpdateDocument>(
  {
    project: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    title: { type: String, required: true, trim: true },
    body: { type: String, default: '' },
    clientVisible: { type: Boolean, default: false },
    attachments: { type: [{ type: Schema.Types.ObjectId, ref: 'FileMetadata' }], default: [] },
    postedAt: { type: Date, default: Date.now, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

projectUpdateSchema.index({ project: 1, postedAt: -1 });

export const ProjectUpdateModel = model<ProjectUpdateDocument>('ProjectUpdate', projectUpdateSchema);
