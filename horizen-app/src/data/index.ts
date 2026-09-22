import { createApiGymService } from './api/apiGymService';
import { createMockGymService } from './mock/mockGymService';
import type { GymService } from './types';

export * from './types';

/**
 * The single data source used by the app. Screens only talk to `gym`, never to
 * sample data or HTTP directly.
 *
 *   EXPO_PUBLIC_DATA_SOURCE=mock  (default) bundled sample data
 *   EXPO_PUBLIC_DATA_SOURCE=api   the Horizen backend at EXPO_PUBLIC_API_URL
 */
function createService(): GymService {
  switch (process.env.EXPO_PUBLIC_DATA_SOURCE) {
    case 'api':
      return createApiGymService();
    default:
      return createMockGymService();
  }
}

export const gym: GymService = createService();
