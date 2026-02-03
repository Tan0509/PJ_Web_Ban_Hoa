import crypto from 'crypto';

export function hmacSha256Hex(secretKey: string, raw: string) {
  return crypto.createHmac('sha256', secretKey).update(raw).digest('hex');
}

export function buildMomoCreateSignatureRaw(opts: {
  accessKey: string;
  amount: string;
  extraData: string;
  ipnUrl: string;
  orderId: string;
  orderInfo: string;
  partnerCode: string;
  redirectUrl: string;
  requestId: string;
  requestType: string;
}) {
  // MoMo spec: alphabetical order of keys
  return (
    `accessKey=${opts.accessKey}` +
    `&amount=${opts.amount}` +
    `&extraData=${opts.extraData}` +
    `&ipnUrl=${opts.ipnUrl}` +
    `&orderId=${opts.orderId}` +
    `&orderInfo=${opts.orderInfo}` +
    `&partnerCode=${opts.partnerCode}` +
    `&redirectUrl=${opts.redirectUrl}` +
    `&requestId=${opts.requestId}` +
    `&requestType=${opts.requestType}`
  );
}

export function buildMomoIpnSignatureRaw(opts: {
  accessKey: string;
  amount: string;
  extraData: string;
  message: string;
  orderId: string;
  orderInfo: string;
  orderType: string;
  partnerCode: string;
  payType: string;
  requestId: string;
  responseTime: string;
  resultCode: string;
  transId: string;
}) {
  // MoMo spec: alphabetical order of keys
  return (
    `accessKey=${opts.accessKey}` +
    `&amount=${opts.amount}` +
    `&extraData=${opts.extraData}` +
    `&message=${opts.message}` +
    `&orderId=${opts.orderId}` +
    `&orderInfo=${opts.orderInfo}` +
    `&orderType=${opts.orderType}` +
    `&partnerCode=${opts.partnerCode}` +
    `&payType=${opts.payType}` +
    `&requestId=${opts.requestId}` +
    `&responseTime=${opts.responseTime}` +
    `&resultCode=${opts.resultCode}` +
    `&transId=${opts.transId}`
  );
}

