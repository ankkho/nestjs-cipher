import {type Context} from './interface';

/** Format context as a KMS key alias (e.g. "tenant-abc" or "user-xyz") */
export const buildKeyAlias = (context: Context): string => {
  if (!context?.tenantId && !context?.userId) {
    throw new Error(
      'At least one of tenantId or userId must be provided in context',
    );
  }

  return context.tenantId
    ? `tenant-${context.tenantId}`
    : `user-${context.userId}`;
};
