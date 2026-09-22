import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';

import { gym, type CheckoutRequest, type PaymentResult } from '@/data';
import { useApp, useMember } from './AppState';

/**
 * Runs a payment: the backend creates a checkout with the payment provider,
 * the provider's hosted page opens in an in-app browser, and when it closes
 * we ask the backend for the outcome (the backend learns it from the
 * provider's webhook, so the app never decides a payment succeeded itself).
 */
export function usePayment() {
  const member = useMember();
  const { notifyChanged } = useApp();
  const [paying, setPaying] = useState(false);

  const pay = async (req: CheckoutRequest): Promise<PaymentResult> => {
    setPaying(true);
    try {
      const returnUrl = Linking.createURL('payment-complete');
      const session = await gym.startCheckout(member.id, { ...req, returnUrl });
      if (session.url) {
        await WebBrowser.openAuthSessionAsync(session.url, returnUrl);
      }
      const result = await gym.getCheckoutResult(member.id, session.id);
      notifyChanged();
      return result;
    } finally {
      setPaying(false);
    }
  };

  return { pay, paying };
}
