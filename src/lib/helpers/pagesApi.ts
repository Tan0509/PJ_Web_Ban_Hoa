import type { NextApiResponse } from 'next';

/**
 * Send 405 Method Not Allowed for Pages Router. Preserves existing API response shapes.
 * @param res - NextApiResponse
 * @param payload - 'message' => { message }; 'error' => { error }; 'successError' => { success: false, error }; 'end' => no body
 */
export function methodNotAllowed(
  res: NextApiResponse,
  payload: 'message' | 'error' | 'successError' | 'end' = 'message'
): void {
  if (payload === 'end') {
    res.status(405).end();
    return;
  }
  const text = 'Method not allowed';
  if (payload === 'error') {
    res.status(405).json({ error: text });
    return;
  }
  if (payload === 'successError') {
    res.status(405).json({ success: false, error: text });
    return;
  }
  res.status(405).json({ message: text });
}
