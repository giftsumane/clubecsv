import { api } from '@/src/api/client';
import * as WebBrowser from 'expo-web-browser';

export async function startPayment(itemType: 'album' | 'content', itemId: number) {
  const { data } = await api.post('/payments/paysuite/create', {
    item_type: itemType,
    item_id: itemId,
  });

  if (!data?.checkout_url || !data?.reference) {
    throw new Error(data?.message || 'Não foi possível iniciar o pagamento.');
  }

  await WebBrowser.openBrowserAsync(data.checkout_url);

  return data.reference as string;
}

export async function getPaymentStatus(reference: string) {
  const { data } = await api.get(`/payments/status/${reference}`);
  return data;
}

export async function waitForPayment(
  reference: string,
  tries = 12,
  delayMs = 3000
) {
  for (let i = 0; i < tries; i++) {
    const data = await getPaymentStatus(reference);

    if (data.status === 'paid') return data;
    if (data.status === 'failed' || data.status === 'canceled') return data;

    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  return getPaymentStatus(reference);
}