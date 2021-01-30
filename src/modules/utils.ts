/**
 * Awaitable sleep to keep API requests/min limit
 * @param ms - duration in milliseconds
 */
export const sleep = (ms: number): Promise<any> => {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
};
