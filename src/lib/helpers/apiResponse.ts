import { NextResponse } from 'next/server';

/**
 * Build 500 JSON response for App Router. Preserves existing API shapes.
 * @param err - Caught error (message used if available)
 * @param options.key - 'error' => { success: false, error }; 'message' => { message }
 */
export function json500(
  err: unknown,
  options?: { key?: 'error' | 'message' }
): NextResponse {
  const msg = (err as { message?: string })?.message || 'Server error';
  const key = options?.key ?? 'error';
  if (key === 'message') {
    return NextResponse.json({ message: msg }, { status: 500 });
  }
  return NextResponse.json({ success: false, error: msg }, { status: 500 });
}
