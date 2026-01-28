import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { startAssignment } from '../../src/api/assignmentStart';

jest.mock('axios');

describe('Start Assignment', () => {
  it('usa endpoint fallback si el principal falla', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('token123');

    (axios.post as jest.Mock)
      .mockRejectedValueOnce({ response: { status: 404 } })
      .mockResolvedValueOnce({ data: { success: true } });

    const result = await startAssignment(1, {
      checkIn: '2025-01-01',
      currentLocation: { latitude: 1, longitude: 1, updatedAt: 'now' },
    });

    expect(result.success).toBe(true);
  });
});
