import BackgroundService from 'react-native-background-actions';
import Geolocation from 'react-native-geolocation-service';
import { Platform, PermissionsAndroid } from 'react-native';

// Helper function to sleep
const sleep = (time: number) => new Promise<void>((resolve) => setTimeout(() => resolve(), time));

// --- PLACEHOLDER FOR EXISTING LOGIC ---
// Copy your existing 'getLocationWithRetry' function here.
// const getLocationWithRetry = async () => { ... }

// Copy your existing 'sendCheckIn' function here.
// const sendCheckIn = async (location: any) => { ... }
// --------------------------------------

const veryIntensiveTask = async (taskDataArguments?: { delay: number }) => {
    // Default to 15000ms if not provided
    const { delay } = taskDataArguments || { delay: 15000 };

    await new Promise<void>(async (resolve) => {
        while (BackgroundService.isRunning()) {
            try {
                // Perform location tracking
                // Assuming 'getLocationWithRetry' returns the location object you need
                // const location = await getLocationWithRetry(); 

                // For now, I'll mock the call structure based on your request.
                // REPLACE THIS with your actual call:
                console.log('Fetching location in background...');
                // await updateLocation(location); 
                
                // Update the background notification to show the service is alive
                await BackgroundService.updateNotification({
                    taskDesc: `Rastreando ubicación: ${new Date().toLocaleTimeString()}`,
                });

            } catch (error) {
                console.error('Error in background task:', error);
            }

            // Sleep for the defined interval
            await sleep(delay);
        }
    });
};

const options = {
    taskName: 'WorkTraceLocation',
    taskTitle: 'WorkTrace Activo',
    taskDesc: 'Rastreando ubicación en segundo plano',
    taskIcon: {
        name: 'ic_launcher',
        type: 'mipmap',
    },
    color: '#ff00ff', // Optional: Customize or remove
    parameters: {
        delay: 15000, // Set your desired intervalMs here
    },
};

export const useLocationTracking = () => {
    
    const startTracking = async () => {
        try {
            // 1. Run Check-In ONCE before starting the loop
            console.log('Performing initial Check-In...');
            // await sendCheckIn(); 

            // 2. Start the Background Service
            if (!BackgroundService.isRunning()) {
                await BackgroundService.start(veryIntensiveTask, options);
                console.log('Background service started');
            }
        } catch (error) {
            console.error('Failed to start tracking:', error);
        }
    };

    const stopTracking = async () => {
        try {
            if (BackgroundService.isRunning()) {
                await BackgroundService.stop();
                console.log('Background service stopped');
            }
        } catch (error) {
            console.error('Failed to stop tracking:', error);
        }
    };

    return {
        startTracking,
        stopTracking,
        // include other exports if needed
    };
};
