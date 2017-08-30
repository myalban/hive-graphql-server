import { createError } from 'apollo-errors';

export const NotAuthorized = createError('NotAuthorized', {
  message: 'User not authorized',
});
