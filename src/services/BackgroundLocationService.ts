import { AppState } from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import BackgroundService from 'react-native-background-actions';
import { LocationTask } from './LocationTask';

const sleep = (time: number) => new Promise<void>((resolve) => setTimeout(() => resolve(), time));

const log = (message: string, ...args: any[]) => {
    if (__DEV__) {
        const timestamp = new Date().toLocaleTimeString();
        const state = AppState.currentState;
        console.log(`[${timestamp}][AppState:${state}] [BackgroundService] ${message}`, ...args);
    }
};

const logError = (message: string, ...args: any[]) => {
    if (__DEV__) {
        const timestamp = new Date().toLocaleTimeString();
        const state = AppState.currentState;
        console.error(`[${timestamp}][AppState:${state}] [BackgroundService] ${message}`, ...args);
    }
};

const veryIntensiveTask = async (taskDataArguments: any) => {
    const { delay } = taskDataArguments;
    
    while (BackgroundService.isRunning()) {
        log('Loop iteration start');
        // Fetch Position directly
        await new Promise<void>((resolve) => {
             Geolocation.getCurrentPosition(
                async (position) => {
                    log('Got position, calling LocationTask');
                    await LocationTask(position);
                    resolve();
                },
                (error) => {
                    logError('Error fetching position', error);
                    resolve();
                },
                { 
                    enableHighAccuracy: true, 
                    timeout: 15000, 
                    maximumAge: 10000 
                }
            );
        });

        log(`Sleeping for ${delay}ms`);
        await sleep(delay);
    }
};

const options = {
    taskName: 'WorkTrace',
    taskTitle: 'Rastreo Activo',
    taskDesc: 'WorkTrace está activo en segundo plano',
    taskIcon: {
        name: 'ic_launcher',
        type: 'mipmap',
    },
    color: '#ff00ff',
    linkingURI: 'yourSchemeHere://chat/jane', 
    parameters: {
        delay: 5000,
    },
};

export const startBackgroundLocationService = async () => {
    if (BackgroundService.isRunning()) {
        log('BackgroundService already running.');
        return;
    }

    log('Starting BackgroundService (Intensive Task)...');
    try {
        await BackgroundService.start(veryIntensiveTask, options);
        log('BackgroundService started successfully!');
    } catch (e) {
        logError('Error starting BackgroundService:', e);
    }
};

export const stopBackgroundLocationService = async () => {
    log('Stopping BackgroundService...');
    await BackgroundService.stop();
};
