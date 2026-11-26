import * as SecureStore from 'expo-secure-store';

const KEY = 'horizen.session';

/**
 * Stores the member's API token. Uses the iOS Keychain / Android Keystore via
 * expo-secure-store; on web it's kept in memory only (sign in per tab).
 */
let memoryToken: string | null = null;

export async function getToken(): Promise<string | null> {
  if (process.env.EXPO_OS === 'web') return memoryToken;
  return SecureStore.getItemAsync(KEY);
}

export async function setToken(token: string | null): Promise<void> {
  if (process.env.EXPO_OS === 'web') {
    memoryToken = token;
    return;
  }
  if (token) await SecureStore.setItemAsync(KEY, token);
  else await SecureStore.deleteItemAsync(KEY);
}
