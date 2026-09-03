import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Credential } from '../../infrastructure/storage/VaultService';

interface CredentialItemProps {
  item: Credential;
  onDelete: (id: string) => void;
  onEdit: (item: Credential) => void;
  isDark: boolean;
}

export const CredentialItem: React.FC<CredentialItemProps> = ({
  item,
  onDelete,
  onEdit,
  isDark,
}) => {
  const [showPassword, setShowPassword] = useState(false);

  const colors = {
    bg: isDark ? '#1C1C1E' : '#FFFFFF',
    text: isDark ? '#FFFFFF' : '#000000',
    subtext: isDark ? '#8E8E93' : '#8E8E93',
    border: isDark ? '#2C2C2E' : '#E5E5EA',
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.bg, borderColor: colors.border },
      ]}
    >
      <View style={styles.header}>
        <Text style={[styles.service, { color: colors.text }]}>
          {item.service}
        </Text>
        <View style={styles.actions}>
          <TouchableOpacity onPress={() => onEdit(item)} style={styles.iconBtn}>
            <Text style={styles.icon}>✏️</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onDelete(item.id)}
            style={styles.iconBtn}
          >
            <Text style={styles.icon}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={[styles.label, { color: colors.subtext }]}>Usuario:</Text>
      <Text style={[styles.value, { color: colors.text }]}>{item.user}</Text>

      <Text style={[styles.label, { color: colors.subtext }]}>Contraseña:</Text>
      <View style={styles.passwordRow}>
        <Text style={[styles.value, { color: colors.text, flex: 1 }]}>
          {showPassword ? item.password : '••••••••'}
        </Text>
        <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
          <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  service: { fontSize: 18, fontWeight: 'bold', flex: 1 },
  actions: { flexDirection: 'row' },
  iconBtn: { marginLeft: 10 },
  icon: { fontSize: 20 },
  label: { fontSize: 12, marginTop: 8, fontWeight: '600' },
  value: { fontSize: 16, marginTop: 2 },
  passwordRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  eyeIcon: { fontSize: 20, marginLeft: 10 },
});
