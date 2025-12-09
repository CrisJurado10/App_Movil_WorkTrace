import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAssignmentsByUser } from '../api/assignment';
import { updateLocation } from '../api/assignmentStart';

const log = (message: string, ...args: any[]) => {
    if (__DEV__) {
        const timestamp = new Date().toLocaleTimeString();
        const state = AppState.currentState;
        console.log(`[${timestamp}][AppState:${state}] [LocationTask] ${message}`, ...args);
    }
};

const logError = (message: string, ...args: any[]) => {
    if (__DEV__) {
        const timestamp = new Date().toLocaleTimeString();
        const state = AppState.currentState;
        console.error(`[${timestamp}][AppState:${state}] [LocationTask] ${message}`, ...args);
    }
};

export const LocationTask = async (data: any) => {
    // Check if data is the position object (direct call) or has params (Headless event)
    const position = data.coords ? data : (data.params ? data.params : data);

    if (!position || !position.coords) {
        logError('Invalid position data received', data);
        return;
    }

    try {
        const coords = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
        };
        log('Processing Coordinates:', coords);

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