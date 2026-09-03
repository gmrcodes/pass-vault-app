import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  Modal,
  StyleSheet,
  useColorScheme,
} from 'react-native';
import {
  VaultService,
  Credential,
} from '../../infrastructure/storage/VaultService';
import { BackupService } from '../../infrastructure/storage/BackupService';
import { CredentialItem } from '../components/CredentialItem';

interface MainScreenProps {
  masterKey: string;
  onLock: () => void;
}

export const MainScreen: React.FC<MainScreenProps> = ({
  masterKey,
  onLock,
}) => {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<Credential | null>(null);
  const [isRestoreModalVisible, setIsRestoreModalVisible] = useState(false);
  const [restorePin, setRestorePin] = useState('');

  // Form states
  const [formService, setFormService] = useState('');
  const [formUser, setFormUser] = useState('');
  const [formPassword, setFormPassword] = useState('');

  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const colors = {
    bg: isDark ? '#121212' : '#F2F2F7',
    text: isDark ? '#FFFFFF' : '#000000',
    inputBg: isDark ? '#2C2C2E' : '#FFFFFF',
    btnPrimary: '#0A84FF',
  };

  useEffect(() => {
    loadVault();
  }, []);

  const loadVault = async () => {
    try {
      const data = await VaultService.loadVault(masterKey);
      setCredentials(data);
    } catch (error: any) {
      Alert.alert('Error al cargar bóveda', error.message || String(error));
    }
  };

  const saveVault = async (newList: Credential[]) => {
    try {
      await VaultService.saveVault(newList, masterKey);
      setCredentials(newList);
    } catch (error: any) {
      Alert.alert('Error al guardar', error.message || String(error));
    }
  };

  const resetForm = () => {
    setFormService('');
    setFormUser('');
    setFormPassword('');
  };

  const handleAdd = async () => {
    if (!formService || !formUser || !formPassword) {
      Alert.alert('Error', 'Todos los campos son obligatorios');
      return;
    }
    const newCred: Credential = {
      id: Date.now().toString(),
      service: formService,
      user: formUser,
      password: formPassword,
    };
    await saveVault([...credentials, newCred]);
    resetForm();
    setIsAddModalVisible(false);
  };

  const openEdit = (item: Credential) => {
    setEditingItem(item);
    setFormService(item.service);
    setFormUser(item.user);
    setFormPassword(item.password);
    setIsEditModalVisible(true);
  };

  const handleEdit = async () => {
    if (!editingItem) return;
    const updatedList = credentials.map(c =>
      c.id === editingItem.id
        ? { ...c, service: formService, user: formUser, password: formPassword }
        : c,
    );
    await saveVault(updatedList);
    setEditingItem(null);
    resetForm();
    setIsEditModalVisible(false);
  };

  const handleDelete = (id: string) => {
    Alert.alert('Eliminar', '¿Borrar esta credencial?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Borrar',
        style: 'destructive',
        onPress: async () => {
          await saveVault(credentials.filter(c => c.id !== id));
        },
      },
    ]);
  };

  const handleRestore = async () => {
    if (!restorePin) {
      Alert.alert('Error', 'Ingresa el PIN con el que se creó el backup');
      return;
    }
    try {
      await BackupService.importVault(masterKey, restorePin);
      setIsRestoreModalVisible(false);
      setRestorePin('');
      await loadVault();
      Alert.alert('Éxito', 'Backup restaurado correctamente');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo restaurar');
    }
  };

  const renderInput = (
    placeholder: string,
    value: string,
    setter: any,
    secure = false,
  ) => (
    <TextInput
      style={[
        styles.input,
        { backgroundColor: colors.inputBg, color: colors.text },
      ]}
      placeholder={placeholder}
      placeholderTextColor="#888"
      value={value}
      onChangeText={setter}
      secureTextEntry={secure}
    />
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>
          Mis Credenciales
        </Text>
        <TouchableOpacity onPress={onLock}>
          <Text style={styles.lockIcon}>🔒</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: colors.btnPrimary }]}
          onPress={() => {
            resetForm();
            setIsAddModalVisible(true);
          }}
        >
          <Text style={styles.btnText}>+ Agregar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: '#34C759' }]}
          onPress={() => BackupService.exportVault()}
        >
          <Text style={styles.btnText}>⬆️ Backup</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: '#FF9500' }]}
          onPress={() => setIsRestoreModalVisible(true)}
        >
          <Text style={styles.btnText}>⬇️ Restaurar</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={credentials}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <CredentialItem
            item={item}
            onDelete={handleDelete}
            onEdit={openEdit}
            isDark={isDark}
          />
        )}
        contentContainerStyle={{ padding: 16 }}
      />

      {/* Modal Agregar */}
      <Modal visible={isAddModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Nueva Credencial
            </Text>
            {renderInput('Servicio', formService, setFormService)}
            {renderInput('Usuario', formUser, setFormUser)}
            {renderInput('Contraseña', formPassword, setFormPassword, true)}
            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#8E8E93' }]}
                onPress={() => setIsAddModalVisible(false)}
              >
                <Text style={styles.btnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalBtn,
                  { backgroundColor: colors.btnPrimary },
                ]}
                onPress={handleAdd}
              >
                <Text style={styles.btnText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Editar */}
      <Modal visible={isEditModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Editar Credencial
            </Text>
            {renderInput('Servicio', formService, setFormService)}
            {renderInput('Usuario', formUser, setFormUser)}
            {renderInput('Contraseña', formPassword, setFormPassword, true)}
            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#8E8E93' }]}
                onPress={() => setIsEditModalVisible(false)}
              >
                <Text style={styles.btnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalBtn,
                  { backgroundColor: colors.btnPrimary },
                ]}
                onPress={handleEdit}
              >
                <Text style={styles.btnText}>Actualizar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Restaurar */}
      <Modal visible={isRestoreModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Restaurar Backup
            </Text>
            <Text
              style={{
                color: colors.text,
                marginBottom: 12,
                textAlign: 'center',
              }}
            >
              Ingresa el PIN con el que se creó el backup
            </Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: colors.inputBg, color: colors.text },
              ]}
              placeholder="PIN del backup"
              placeholderTextColor="#888"
              secureTextEntry
              keyboardType="numeric"
              value={restorePin}
              onChangeText={setRestorePin}
            />
            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#8E8E93' }]}
                onPress={() => setIsRestoreModalVisible(false)}
              >
                <Text style={styles.btnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#FF9500' }]}
                onPress={handleRestore}
              >
                <Text style={styles.btnText}>Restaurar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  title: { fontSize: 24, fontWeight: 'bold' },
  lockIcon: { fontSize: 24 },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  btn: {
    padding: 10,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  btnText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: { borderRadius: 16, padding: 20 },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  input: {
    height: 50,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  modalBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
});
