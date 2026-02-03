import crypto from 'crypto';

function encodeVnpay(value: string) {
  // VNPay sample-style encoding: space => '+'
  return encodeURIComponent(value).replace(/%20/g, '+');
}

export function hmacSha512Hex(secretKey: string, raw: string) {
  return crypto.createHmac('sha512', secretKey).update(raw, 'utf8').digest('hex');
}

export function formatVnpayDate(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  // VNPay uses GMT+7 usually; assume server in correct TZ for now
  return (
    d.getFullYear() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds())
  );
}

export function sortObject(obj: Record<string, any>) {
  const sorted: Record<string, string> = {};
  Object.keys(obj)
    .sort()
    .forEach((key) => {
      const v = obj[key];
      if (v === undefined || v === null || v === '') return;
      sorted[key] = String(v);
    });
  return sorted;
}

export function buildVnpaySignData(params: Record<string, string>) {
  const keys = Object.keys(params).sort();
  return keys.map((k) => `${encodeVnpay(k)}=${encodeVnpay(params[k])}`).join('&');
}

export function verifyVnpaySignature(input: {
  params: Record<string, string>;
  secureHash: string;
  secretKey: string;
}) {
  const signData = buildVnpaySignData(input.params);
  const expected = hmacSha512Hex(input.secretKey, signData);
  return expected.toLowerCase() === String(input.secureHash || '').toLowerCase();
}

