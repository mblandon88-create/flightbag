import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

/**
 * Formats a number with thin-space (\u2009) thousands separators.
 * Used for weights (kg) and other large numeric values throughout the app.
 */
export function formatNumber(val: string | number | null | undefined): string {
    if (val === null || val === undefined || val === '') return '';
    const num = typeof val === 'string' ? parseInt(val.replace(/[^\d]/g, '')) : Math.round(val);
    if (isNaN(num)) return val.toString();
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "\u202F");
}
