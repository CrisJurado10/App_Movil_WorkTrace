import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { login } from '../../src/api/auth';

jest.mock('axios');

jest.mock('jwt-decode', () => ({
  jwtDecode: jest.fn(() => ({
    'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier': '0',
    'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name': 'Test User',
    'http://schemas.microsoft.com/ws/2008/06/identity/claims/role': 'Admin',
  })),
}));

describe('Auth', () => {
  it('guarda token y datos del usuario al login', async () => {
    (axios.post as jest.Mock).mockResolvedValue({
      data: { token: 'fake.jwt.token' },
    });

    await login('test@test.com', '1234');

    expect(AsyncStorage.setItem).toHaveBeenCalled();
  });
});
