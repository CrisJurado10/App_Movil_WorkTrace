import AsyncStorage from '@react-native-async-storage/async-storage';
import { LocationTask } from '../../src/services/LocationTask';
import * as assignmentApi from '../../src/api/assignment';
import * as assignmentStart from '../../src/api/assignmentStart';

jest.mock('../../src/api/assignment');
jest.mock('../../src/api/assignmentStart');

describe('LocationTask', () => {
  it('envía ubicación solo a assignments activos', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('1');

    (assignmentApi.getAssignmentsByUser as jest.Mock).mockResolvedValue([
      { id: 1, status: 'Started' },
      { id: 2, status: 'Completed' },
    ]);

    (assignmentStart.updateLocation as jest.Mock).mockResolvedValue({});

    await LocationTask({
      coords: { latitude: 1, longitude: 1 },
    });

    expect(assignmentStart.updateLocation).toHaveBeenCalledTimes(1);
  });
});
