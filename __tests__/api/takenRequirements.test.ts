import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  searchClientByDoc,
  createClient,
  createTakenRequirement,
  updateTakenRequirement,
  getTakenRequirementsByUserAndDateRange,
} from '../../src/api/takenRequirement';

// Mock axios
jest.mock('axios');

// Mock validation parser
jest.mock('../../src/constants/validationRules', () => ({
  parseValidationErrors: jest.fn(() => ({ field: 'error' })),
}));

describe('Taken Requirements API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('busca cliente por número de documento', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('token123');
    (axios.get as jest.Mock).mockResolvedValue({
      data: { id: '1', fullName: 'Juan Perez' },
    });

    const result = await searchClientByDoc('0102030405');

    expect(result.fullName).toBe('Juan Perez');
    expect(axios.get).toHaveBeenCalled();
  });

  it('crea un cliente correctamente', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('token123');
    (axios.post as jest.Mock).mockResolvedValue({
      data: { id: '1', fullName: 'Cliente Test' },
    });

    const result = await createClient({
      fullName: 'Cliente Test',
      documentNumber: '123',
      phoneNumber: '099999999',
      email: 'test@test.com',
    });

    expect(result.id).toBe('1');
  });

  it('crea un requerimiento con cliente', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('token123');
    (axios.post as jest.Mock).mockResolvedValue({
      data: { id: 'req1', title: 'Nuevo Req' },
    });

    const result = await createTakenRequirement({
      userId: '1',
      clientId: '2',
      title: 'Nuevo Req',
      description: 'Descripción',
    });

    expect(result.title).toBe('Nuevo Req');
  });

  it('actualiza un requerimiento existente', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('token123');
    (axios.put as jest.Mock).mockResolvedValue({
      data: { id: 'req1', title: 'Actualizado' },
    });

    const result = await updateTakenRequirement({
      id: 'req1',
      title: 'Actualizado',
      description: 'Texto',
    });

    expect(result.title).toBe('Actualizado');
  });

  it('obtiene requerimientos por usuario y rango de fechas', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('token123');
    (axios.get as jest.Mock).mockResolvedValue({
      data: [{ id: '1', title: 'Req 1' }],
    });

    const result = await getTakenRequirementsByUserAndDateRange(
      '1',
      '2025-01-01',
      '2025-01-07'
    );

    expect(result.length).toBe(1);
  });
});
