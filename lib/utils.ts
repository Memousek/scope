import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function handleErrorMessage(err: unknown): string {
  let message = 'Neznámá chyba.';
  if (err && typeof err === 'object' && 'message' in err) {
    message = (err as { message: string }).message;
  } else if (typeof err === 'string') {
    message = err;
  }

  return message;
}

// This check can be removed, it is just for tutorial purposes
export const hasEnvVars =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
