import { Redirect } from 'expo-router';

/**
 * Return URL for the payment provider's hosted checkout. The in-app browser
 * normally catches it first; if the OS opens the app with it instead, go back
 * to billing (which refetches the latest status).
 */
export default function PaymentComplete() {
  return <Redirect href="/billing" />;
}
