import { PROJECT_STATUSES } from '@kraven/config';
import { Schema, Types, model } from 'mongoose';
import { fileReferenceSchema, linkSchema } from '../../shared/schemas/common.js';

export interface ProjectDocument {
  projectName: string;
  client: Types.ObjectId;
  description?: string;
  projectValue?: number;
  startDate?: Date;
  expectedCompletionDate?: Date;
  actualCompletionDate?: Date;
  status: (typeof PROJECT_STATUSES)[number];
  progressPercentage: number;
  assignedTeam?: string;
  priority?: string;
  notes?: string;
  deliverables: string[];
  links: unknown[];
  documents: unknown[];
  createdAt: Date;
  updatedAt: Date;
}

const projectSchema = new Schema<ProjectDocument>(
  {
    projectName: { type: String, required: true, trim: true },
    client: { type: Schema.Types.ObjectId, required: true, ref: 'Client' },
    description: String,
    projectValue: { type: Number, min: 0 },
    startDate: Date,
    expectedCompletionDate: Date,
    actualCompletionDate: Date,
    status: { type: String, enum: PROJECT_STATUSES, default: 'Not Started', required: true },
    progressPercentage: { type: Number, min: 0, max: 100, default: 0 },
    assignedTeam: { type: String, trim: true },
    priority: { type: String, trim: true },
    notes: String,
    deliverables: { type: [String], default: [] },
    links: { type: [linkSchema], default: [] },
    documents: { type: [fileReferenceSchema], default: [] }
  },
  { timestamps: true }
);

projectSchema.index({ client: 1 });
projectSchema.index({ status: 1 });
projectSchema.index({ expectedCompletionDate: 1 });

export const ProjectModel = model<ProjectDocument>('Project', projectSchema);
