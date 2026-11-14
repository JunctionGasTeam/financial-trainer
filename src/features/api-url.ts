import Constants from 'expo-constants';

const configuredApiUrl = process.env.EXPO_PUBLIC_GEMINI_API_URL?.trim();
const expoDevHost = Constants.expoConfig?.hostUri?.split(':')[0];

export const apiUrl = (configuredApiUrl || (expoDevHost ? `http://${expoDevHost}:8787` : 'http://localhost:8787')).replace(/\/$/, '');
