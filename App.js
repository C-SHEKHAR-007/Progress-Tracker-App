import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { DatabaseProvider } from './src/context/DatabaseContext';
import { ItemsProvider } from './src/context/ItemsContext';
import AppNavigator from './src/navigation/AppNavigator';
import { initDatabase } from './src/services/database';

const customDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: '#6366f1',
    background: '#0a0a0f',
    card: '#13131a',
    text: '#e2e8f0',
    border: '#1e1e2e',
  },
};

export default function App() {
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    const setupDatabase = async () => {
      try {
        await initDatabase();
        setDbReady(true);
      } catch (error) {
        console.error('Failed to initialize database:', error);
      }
    };
    setupDatabase();
  }, []);

  if (!dbReady) {
    return null; // Could add a loading spinner here
  }

  return (
    <SafeAreaProvider>
      <DatabaseProvider>
        <ItemsProvider>
          <NavigationContainer theme={customDarkTheme}>
            <StatusBar style="light" />
            <AppNavigator />
          </NavigationContainer>
        </ItemsProvider>
      </DatabaseProvider>
    </SafeAreaProvider>
  );
}
