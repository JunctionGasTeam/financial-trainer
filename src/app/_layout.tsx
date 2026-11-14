import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { wipeScreenOptions } from '@/components/ui/wipe-screen';
import { verifyTransactionsDatabase } from '@/data/transactions';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <SQLiteProvider
      databaseName="customer-transactions.db"
      assetSource={{ assetId: require('../../assets/data/customer-transactions.db'), forceOverwrite: true }}
      onInit={verifyTransactionsDatabase}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AnimatedSplashOverlay />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="spending-report" options={wipeScreenOptions} />
          <Stack.Screen name="anomaly-detection" options={wipeScreenOptions} />
          <Stack.Screen name="mortgage-prediction" options={wipeScreenOptions} />
          <Stack.Screen name="savings-goal" options={wipeScreenOptions} />
          <Stack.Screen name="safe-to-spend-details" options={wipeScreenOptions} />
          <Stack.Screen name="chat" options={wipeScreenOptions} />
        </Stack>
      </ThemeProvider>
    </SQLiteProvider>
  );
}
