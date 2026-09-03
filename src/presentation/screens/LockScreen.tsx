import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  useColorScheme,
} from 'react-native';
import { SecureStorageService } from '../../infrastructure/storage/SecureStorageService';
import { CryptoService } from '../../infrastructure/crypto/CryptoService';

interface LockScreenProps {
  onUnlock: (masterKey: string) => void;
}

export const LockScreen: React.FC<LockScreenProps> = ({ onUnlock }) => {
  const [pin, setPin] = useState('');
  const [isSetup, setIsSetup] = useState(false);
  const [tempPin, setTempPin] = useState('');
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Paleta de colores dinámica
  const colors = {
    bg: isDark ? '#121212' : '#F2F2F7',
    text: isDark ? '#FFFFFF' : '#000000',
    inputBg: isDark ? '#2C2C2E' : '#E5E5EA',
    placeholder: isDark ? '#888888' : '#8E8E93',
  };

  useEffect(() => {
    checkSetup();
  }, []);

  const checkSetup = async () => {
    const salt = await SecureStorageService.getSalt();
    setIsSetup(!salt); // Si no hay salt, es la primera vez
  };

  const handlePress = async () => {
    if (pin.length < 6) {
      Alert.alert('Error', 'El PIN debe tener al menos 6 dígitos');
      return;
    }

    if (isSetup) {
      // Flujo de creación de PIN
      if (!tempPin) {
        setTempPin(pin);
        setPin('');
        Alert.alert('Confirmar', 'Ingresa el PIN nuevamente');
        return;
      }
      if (tempPin !== pin) {
        Alert.alert('Error', 'Los PINs no coinciden');
        setTempPin('');
        setPin('');
        return;
      }

      // Guardar y desbloquear
      await SecureStorageService.initializeVault(pin);
      const salt = await SecureStorageService.getSalt();
      const masterKey = await CryptoService.deriveKey(pin, salt!);
      onUnlock(masterKey);
    } else {
      // Flujo de desbloqueo
      const isValid = await SecureStorageService.verifyPin(pin);
      if (isValid) {
        const salt = await SecureStorageService.getSalt();
        const masterKey = await CryptoService.deriveKey(pin, salt!);
        onUnlock(masterKey);
      } else {
        Alert.alert('Error', 'PIN incorrecto');
        setPin('');
      }
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <Text style={[styles.title, { color: colors.text }]}>
        {isSetup
          ? tempPin
            ? 'Confirmar PIN'
            : 'Crear PIN'
          : 'Desbloquear Bóveda'}
      </Text>
      <TextInput
        style={[
          styles.input,
          { backgroundColor: colors.inputBg, color: colors.text },
        ]}
        value={pin}
        onChangeText={setPin}
        secureTextEntry
        keyboardType="numeric"
        maxLength={8}
        placeholder="••••••••"
        placeholderTextColor={colors.placeholder}
      />
      <TouchableOpacity style={styles.button} onPress={handlePress}>
        <Text style={styles.buttonText}>
          {tempPin ? 'Confirmar' : 'Entrar'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, marginBottom: 30, fontWeight: 'bold' },
  input: {
    width: '80%',
    height: 60,
    borderRadius: 12,
    textAlign: 'center',
    fontSize: 28,
    marginBottom: 20,
    letterSpacing: 8,
  },
  button: {
    backgroundColor: '#0A84FF',
    padding: 16,
    borderRadius: 12,
    width: '80%',
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});
