import BackgroundService from 'react-native-background-actions';
import Geolocation from '@react-native-community/geolocation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAssignmentsByUser } from '../api/assignment';
import { updateLocation } from '../api/assignmentStart';

const sleep = (time: number) => new Promise((resolve) => setTimeout(() => resolve(true), time));

const getPosition = (): Promise<{ latitude: number; longitude: number }> => {
    return new Promise((resolve, reject) => {
        Geolocation.getCurrentPosition(
            (position) => {
                resolve({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                });
            },
            (error) => {
                reject(error);
            },
            { enableHighAccuracy: true, timeout: 60000, maximumAge: 30000 }
        );
    });
};

const backgroundLocationTask = async (taskDataArguments: any) => {
    const { delay } = taskDataArguments;

    while (BackgroundService.isRunning()) {
        try {
            // 1. Fetch current GPS coordinates
            const coords = await getPosition();
            console.log('[BackgroundService] Coordinates:', coords);

            // 2. Retrieve user and assignments
            const userId = await AsyncStorage.getItem('userId');
            if (userId) {
                // Determine date range for "today" or relevant period. 
                // Using a broad range or just "today" as per HomeScreen logic.
                const today = new Date();
                const start = new Date(today);
                start.setHours(0, 0, 0, 0);
                start.setDate(start.getDate() - start.getDay()); // Sunday

                const end = new Date(start);
                end.setDate(start.getDate() + 6); // Saturday
                end.setHours(23, 59, 59, 999);

                const assignments = await getAssignmentsByUser(
                    userId,
                    start.toISOString(),
                    end.toISOString()
                );

                // 3. Filter "In Progress" or "Started"
                // Checking status string. Adjust comparison as needed based on exact backend values.
                const activeAssignments = assignments.filter((a: any) => 
                    a.status === 'In Progress' || a.status === 'Started' || (a.checkIn && a.status !== 'Completed')
                );
                
                console.log(`[BackgroundService] Found ${activeAssignments.length} active assignments.`);

                // 4. Send coordinates
                for (const assignment of activeAssignments) {
                    try {
                        const payload = {
                            currentLocation: {
                                latitude: coords.latitude,
                                longitude: coords.longitude,
                                updatedAt: new Date().toISOString(),
                            }
                        };
                        await updateLocation(assignment.id, payload);
                        console.log(`[BackgroundService] Updated location for assignment ${assignment.id}`);
                    } catch (err) {
                        console.error(`[BackgroundService] Failed to update assignment ${assignment.id}`, err);
                    }
                }
            } else {
                console.log('[BackgroundService] No userId found in storage.');
            }

        } catch (error: any) {
            if (error?.code === 3) {
                console.warn('[BackgroundService] Location request timed out (Code 3). Retrying next cycle.');
            } else {
                console.error('[BackgroundService] Error in loop:', error);
            }
        }

        // Wait for next iteration
        await sleep(delay);
    }
};

const options = {
    taskName: 'LocationTracking',
    taskTitle: 'Rastreo GPS Activo',
    taskDesc: 'Actualizando ubicación de tareas en curso...',
    taskIcon: {
        name: 'ic_launcher',
        type: 'mipmap',
    },
    color: '#ff00ff',
    linkingURI: 'yourSchemeHere://chat/jane', // Optional
    parameters: {
        delay: 120000, // 2 minutes
    },
};

export const startBackgroundLocationService = async () => {
    if (!BackgroundService.isRunning()) {
        try {
            console.log('[BackgroundService] Starting...');
            await BackgroundService.start(backgroundLocationTask, options);
            console.log('[BackgroundService] Started!');
        } catch (e) {
            console.error('[BackgroundService] Error starting:', e);
        }
    }
};

export const stopBackgroundLocationService = async () => {
    if (BackgroundService.isRunning()) {
        console.log('[BackgroundService] Stopping...');
        await BackgroundService.stop();
    }
};
