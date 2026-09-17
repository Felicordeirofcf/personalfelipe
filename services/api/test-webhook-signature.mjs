import { createHmac } from 'node:crypto';

const base = 'http://127.0.0.1:3333/api';
const usersResponse = await fetch(`${base}/users?role=STUDENT`);
const { users } = await usersResponse.json();
const student = users[0];
if (!student) throw new Error('Aluno de teste ausente.');

const dataId = 'signed-payment-flow';
const requestId = 'request-signature-test';
const timestamp = String(Date.now());
const manifest = `id:${dataId};request-id:${requestId};ts:${timestamp};`;
const signature = createHmac('sha256', 'retention_webhook_secret_123456').update(manifest).digest('hex');
const body = JSON.stringify({
  action: 'payment.updated',
  type: 'payment',
  data: { id: dataId },
  mockPayment: { id: dataId, status: 'approved', external_reference: student.id },
});

const invalid = await fetch(`${base}/webhooks/mercadopago?data.id=${dataId}&type=payment`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'x-request-id': requestId, 'x-signature': `ts=${timestamp},v1=${'0'.repeat(64)}` },
  body,
});
if (invalid.status !== 401) throw new Error(`Assinatura inválida retornou ${invalid.status}.`);

const valid = await fetch(`${base}/webhooks/mercadopago?data.id=${dataId}&type=payment`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'x-request-id': requestId, 'x-signature': `ts=${timestamp},v1=${signature}` },
  body,
});
const response = await valid.json();
if (valid.status !== 200 || response.subscriptionStatus !== 'ACTIVE') {
  throw new Error(`Assinatura válida falhou: ${valid.status} ${JSON.stringify(response)}`);
}

console.log(JSON.stringify({ success: true, invalidStatus: invalid.status, validStatus: valid.status, subscriptionStatus: response.subscriptionStatus }, null, 2));
