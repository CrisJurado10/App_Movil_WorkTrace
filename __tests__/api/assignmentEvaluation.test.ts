import AsyncStorage from '@react-native-async-storage/async-storage';
import { createEvaluationSession } from '../../src/api/assignmentEvaluation';

global.fetch = jest.fn();

describe('Assignment Evaluation', () => {
  it('lanza error si no hay token', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

    await expect(createEvaluationSession('123')).rejects.toThrow(
      'Token de usuario no encontrado'
    );
  });
});
