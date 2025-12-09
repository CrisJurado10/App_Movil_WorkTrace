import { AppState } from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAssignmentsByUser } from '../api/assignment';
import { updateLocation } from '../api/assignmentStart';

let watchId: number | null = null;
let heartbeatInterval: NodeJS.Timeout | null = null;

const log = (message: string, ...args: any[]) => {
    const timestamp = new Date().toLocaleTimeString();
    const state = AppState.currentState;
    console.log(`[${timestamp}][AppState:${state}] [BackgroundService] ${message}`, ...args);
};

const logError = (message: string, ...args: any[]) => {
    const timestamp = new Date().toLocaleTimeString();
    const state = AppState.currentState;
    console.error(`[${timestamp}][AppState:${state}] [BackgroundService] ${message}`, ...args);
};

const processLocationUpdate = async (position: any) => {
    try {
        const coords = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
        };
        log('New Coordinates:', coords);

        // Retrieve user and assignments
        const userId = await AsyncStorage.getItem('userId');
        if (userId) {
            // Determine date range for "today" or relevant period.
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

            // Filter "In Progress" or "Started"
            const activeAssignments = assignments.filter((a: any) => 
                a.status === 'In Progress' || a.status === 'Started' || (a.checkIn && a.status !== 'Completed')
            );
            
            log(`Found ${activeAssignments.length} active assignments.`);

            // Send coordinates
            for (const assignment of activeAssignments) {
                try {
                    const payload = {
                        currentLocation: {
                            latitude: coords.latitude,
                            longitude: coords.longitude,
                            updatedAt: new Date().toISOString(),
                        }
                    };
                    log(`Start sending location for assignment ${assignment.id}...`);
                    await updateLocation(assignment.id, payload);
                    log(`Finished sending location for assignment ${assignment.id}`);
                } catch (err) {
                    logError(`Failed to update assignment ${assignment.id}`, err);
                }
            }
        } else {
            log('No userId found in storage.');
        }

    } catch (error: any) {
        logError('Error processing location update:', error);
    }
};

export const startBackgroundLocationService = async () => {
    if (watchId !== null) {
        log('Watcher already running.');
        return;
    }

    // Start Heartbeat
    if (!heartbeatInterval) {
        log('Starting Heartbeat...');
        heartbeatInterval = setInterval(() => {
            log('[Heartbeat] CPU is alive');
        }, 2000);
    }

    log('Starting location watch...');
    watchId = Geolocation.watchPosition(
        (position) => {
            processLocationUpdate(position);
        },
        (error) => {
            logError('WatchPosition Error:', error);
        },
        {
            accuracy: {
                android: 'high',
            },
            provider: 'gps',
            enableHighAccuracy: true,
            distanceFilter: 0,
            interval: 5000,
            fastInterval: 5000,
            forceRequestLocation: true,
            forceLocationManager: true,
            showLocationDialog: true,
            useSignificantChanges: false,
            foregroundService: {
                channelId: "worktrace_location_channel",
                channelName: "WorkTrace Rastreo",
                notificationTitle: "Rastreo Activo",
                notificationBody: "WorkTrace está activo en segundo plano",
                notificationIcon: "mipmap/ic_launcher",
                notificationImportance: "high"
            }
        }
    );
    log(`Watcher started with ID: ${watchId}`);
};

export const stopBackgroundLocationService = async () => {
    // Stop Heartbeat
    if (heartbeatInterval) {
        log('Stopping Heartbeat...');
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
    }

    if (watchId !== null) {
        log(`Stopping watcher ID: ${watchId}`);
        Geolocation.clearWatch(watchId);
        watchId = null;
    }
};
