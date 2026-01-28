import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAssignmentsByUser } from '../../src/api/assignment';

jest.mock('axios');

describe('Assignment API', () => {
  it('obtiene assignments por usuario', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('token123');
    (axios.get as jest.Mock).mockResolvedValue({
      data: [{ id: 1, status: 'Started' }],
    });

    const result = await getAssignmentsByUser('1', '2025-01-01', '2025-01-07');

    expect(result.length).toBe(1);
    expect(axios.get).toHaveBeenCalled();
  });
});
