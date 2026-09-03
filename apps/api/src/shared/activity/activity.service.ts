import type { ActivityInput } from '@kraven/validation';
import { activitySchema } from '@kraven/validation';
import { toObjectId } from '../utils/objectId.js';
import { ActivityModel } from './activity.model.js';

export async function logActivity(input: ActivityInput) {
  const activity = activitySchema.parse(input);

  return ActivityModel.create({
    ...activity,
    entityId: toObjectId(activity.entityId),
    timestamp: activity.timestamp ?? new Date()
  });
}

export async function getEntityActivity(entityType: ActivityInput['entityType'], entityId: string) {
  return ActivityModel.find({ entityType, entityId: toObjectId(entityId) }).sort({ timestamp: -1 });
}
