import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';
import { getApiBaseUrl } from '../config';

/**
 * Kamera veya galeriden fotoğraf seç ve sunucuya yükle.
 * Expo Go'da çalışır (expo-image-picker kullanır).
 * @returns Yüklenen fotoğrafın URL'i veya null
 */
export async function pickAndUploadImage(source: 'camera' | 'gallery'): Promise<string | null> {
  // İzin iste
  if (source === 'camera') {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('İzin Gerekli', 'Kamera erişimi için izin vermeniz gerekiyor.');
      return null;
    }
  } else {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('İzin Gerekli', 'Galeri erişimi için izin vermeniz gerekiyor.');
      return null;
    }
  }

  // Fotoğraf seç
  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });

  if (result.canceled || !result.assets?.[0]?.uri) {
    return null;
  }

  const asset = result.assets[0];

  // Sunucuya yükle
  const apiRoot = getApiBaseUrl().replace(/\/api\/v1\/?$/, '');
  const formData = new FormData();
  const fileName = asset.uri.split('/').pop() ?? `photo-${Date.now()}.jpg`;
  formData.append('file', {
    uri: asset.uri,
    name: fileName,
    type: asset.mimeType ?? 'image/jpeg',
  } as never);

  const res = await fetch(`${apiRoot}/api/v1/auth/upload-image`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    throw new Error('Upload failed');
  }

  const body = (await res.json()) as { url?: string };
  if (!body.url) {
    throw new Error('Upload failed');
  }

  return body.url.startsWith('http') ? body.url : `${apiRoot}${body.url}`;
}

/**
 * Kaynak seçim dialog'u göster ve yükle.
 */
export function showImagePickerAlert(onResult: (url: string) => void, onError?: () => void) {
  Alert.alert('Fotoğraf Seç', '', [
    {
      text: '📷 Kamera',
      onPress: () => {
        pickAndUploadImage('camera')
          .then((url) => {
            if (url) onResult(url);
          })
          .catch(() => {
            onError?.();
          });
      },
    },
    {
      text: '🖼️ Galeri',
      onPress: () => {
        pickAndUploadImage('gallery')
          .then((url) => {
            if (url) onResult(url);
          })
          .catch(() => {
            onError?.();
          });
      },
    },
    { text: 'İptal', style: 'cancel' },
  ]);
}
