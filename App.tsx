/**
 * Pass-Vault-App
 * With React Native
 *
 * @format
 */

import React, { useState } from 'react';
import { StatusBar, View, Text, useColorScheme } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { LockScreen } from './src/presentation/screens/LockScreen';
import { MainScreen } from './src/presentation/screens/MainScreen';

const App = () => {
  const [masterKey, setMasterKey] = useState<string | null>(null);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const handleUnlock = (key: string) => {
    setMasterKey(key);
    // Aquí cargaremos la MainScreen en el siguiente paso
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView
        style={{ flex: 1, backgroundColor: isDark ? '#121212' : '#F2F2F7' }}
      >
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        {!masterKey ? (
          <LockScreen onUnlock={handleUnlock} />
        ) : (
          <MainScreen masterKey={masterKey} onLock={() => setMasterKey(null)} />
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

export default App;
