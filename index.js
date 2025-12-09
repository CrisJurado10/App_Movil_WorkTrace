/**
 * @format
 */
import 'react-native-gesture-handler';
import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import { LocationTask } from './src/services/LocationTask';

AppRegistry.registerComponent(appName, () => App);
AppRegistry.registerHeadlessTask('LocationTask', () => LocationTask);
