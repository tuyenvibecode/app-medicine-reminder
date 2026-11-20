import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Hàm kết hợp class Tailwind và xử lý conflict chuẩn shadcn
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
