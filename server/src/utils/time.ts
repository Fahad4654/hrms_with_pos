import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';

dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * Returns the current date as a YYYY-MM-DD string in the target timezone.
 * Used for determining "Today" in the company's local context.
 */
export const getTodayString = (tz: string = 'UTC'): string => {
  return dayjs().tz(tz).format('YYYY-MM-DD');
};

/**
 * Converts a specific "wall-clock" time (e.g. "17:00") on a given date
 * to a millisecond Epoch (BigInt compatible number), respecting the target timezone.
 */
export const getWorkTimeInUTC = (baseDate: Date | number | bigint, timeStr: string, tz: string): number => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  
  // Create a dayjs object in the target timezone for that specific day and time
  const localTime = dayjs(typeof baseDate === 'bigint' ? Number(baseDate) : baseDate)
    .tz(tz)
    .hour(hours || 0)
    .minute(minutes || 0)
    .second(0)
    .millisecond(0);
    
  return localTime.valueOf();
};

/**
 * Returns the "EndOfDay" (23:59:59.999) for a given date in the target timezone,
 * converted to millisecond Epoch.
 */
export const getEndOfDayInUTC = (baseDate: Date | number | bigint, tz: string): number => {
  return dayjs(typeof baseDate === 'bigint' ? Number(baseDate) : baseDate)
    .tz(tz)
    .endOf('day')
    .valueOf();
};

/**
 * Normalizes any timestamp to a millisecond Epoch.
 */
export const toEpoch = (date: Date | string | number | bigint = new Date()): number => {
  if (typeof date === 'bigint') return Number(date);
  return dayjs(date).valueOf();
};

/**
 * Recursively converts BigInt fields to Number for JSON serialization.
 */
export const serializeBigInt = (obj: any): any => {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'bigint') return Number(obj);
  if (Array.isArray(obj)) return obj.map(serializeBigInt);
  if (typeof obj === 'object') {
    if (obj instanceof Date) return obj;
    const newObj: any = {};
    for (const key in obj) {
      newObj[key] = serializeBigInt(obj[key]);
    }
    return newObj;
  }
  return obj;
};

/**
 * Returns a YYYY-MM-DD string for a given date in the target timezone.
 */
export const getDateString = (date: Date | number | bigint, tz: string = 'UTC'): string => {
  return dayjs(typeof date === 'bigint' ? Number(date) : date).tz(tz).format('YYYY-MM-DD');
};

export default dayjs;
