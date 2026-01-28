import 'react-native-gesture-handler/jestSetup';

jest.mock('@react-native-async-storage/async-storage');

jest.mock('react-native-geolocation-service', () => ({
  getCurrentPosition: jest.fn(),
}));

jest.mock('react-native-background-actions', () => ({
  start: jest.fn(),
  stop: jest.fn(),
  isRunning: jest.fn(() => false),
}));