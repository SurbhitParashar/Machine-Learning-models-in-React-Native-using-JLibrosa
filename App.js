import React, { useState } from 'react';
import {
  View,
  Text,
  Button,
  Alert,
  PermissionsAndroid,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { NativeModules } from 'react-native';
import AudioRecord from 'react-native-audio-record';
import RNFS from 'react-native-fs';
import { Buffer } from 'buffer';
import { computeMelSpectrogram,saveMelToJSON } from './utils/melspectrogram';
import DocumentPicker from 'react-native-document-picker';

global.Buffer = Buffer;

const { TFLiteModule } = NativeModules;
const WAV_PATH = `${RNFS.DocumentDirectoryPath}/test.wav`;

const classLabels = [
  'air_conditioner',
  'car_horn',
  'children_playing',
  'dog_bark',
  'drilling',
  'engine_idling',
  'gun_shot',
  'jackhammer',
  'siren',
  'street_music',
];

export default function App() {
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [prediction, setPrediction] = useState(null);

  const startRecording = async () => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        Alert.alert('Permission Denied', 'Microphone permission is required');
        return;
      }
    }

    setPrediction(null);
    setRecording(true);
    AudioRecord.init({
      sampleRate: 22050,
      channels: 1,
      bitsPerSample: 16,
      wavFile: 'test.wav',
    });
    AudioRecord.start();
  };

  const stopRecording = async () => {
    setRecording(false);
    await AudioRecord.stop();
    await processWavFile(WAV_PATH);
  };


// 👇 Add this function in your App.js or wherever you handle file input
const selectFile = async () => {
  try {
    setPrediction(null);
    const res = await DocumentPicker.pickSingle({
      type: DocumentPicker.types.audio,
    });

    if (!res.name.endsWith('.wav')) {
      Alert.alert('Invalid File', 'Please select a WAV file.');
      return;
    }

    const destPath = `${RNFS.DocumentDirectoryPath}/${res.name}`;

    await RNFS.copyFile(res.uri, destPath);

    setLoading(true);
    await processWavFile(destPath); 
  } catch (err) {
    if (!DocumentPicker.isCancel(err)) {
      console.error('File pick error:', err);
      Alert.alert('Error', 'File selection failed.');
    }
  }
};



  const processWavFile = async (filePath) => {
    setLoading(true);
    try {
      const exists = await RNFS.exists(filePath);
      if (!exists) throw new Error('WAV file not found');

      const base64wav = await RNFS.readFile(filePath, 'base64');
      const wavBuffer = Buffer.from(base64wav, 'base64');

      const pcm16 = new Int16Array(wavBuffer.buffer, 44, (wavBuffer.length - 44) / 2);
      let floatData = Float32Array.from(pcm16, v => v / 32768);

      const SR = 22050;
      const TARGET_LEN = SR * 4;

      if (floatData.length < TARGET_LEN) {
        const padded = new Float32Array(TARGET_LEN);
        padded.set(floatData);
        floatData = padded;
      } else {
        floatData = floatData.subarray(0, TARGET_LEN);
      }

      const mel2d = computeMelSpectrogram(floatData, {
        sampleRate: SR,
        fftSize: 2048,
        hopSize: 512,
        nMels: 64,
      });

      // Shape: [64, 173]
      const TARGET_ROWS = 64;
      const TARGET_COLS = 173;

      let melResized = mel2d;
      if (melResized.length < TARGET_ROWS) {
        const padRows = Array.from({ length: TARGET_ROWS - melResized.length }, () =>
          new Array(melResized[0].length).fill(0)
        );
        melResized = melResized.concat(padRows);
      } else if (melResized.length > TARGET_ROWS) {
        melResized = melResized.slice(0, TARGET_ROWS);
      }

      
      melResized = melResized.map(row => {
        if (row.length < TARGET_COLS) {
          return row.concat(new Array(TARGET_COLS - row.length).fill(0));
        } else if (row.length > TARGET_COLS) {
          return row.slice(0, TARGET_COLS);
        }
        return row;
      });

      await saveMelToJSON(melResized);

      const flatLen = TARGET_ROWS * TARGET_COLS;
      const inputArray = new Float32Array(flatLen);
      let idx = 0;
      for (let row = 0; row < TARGET_ROWS; row++) {
        for (let col = 0; col < TARGET_COLS; col++) {
        inputArray[idx++] = melResized[row][col];
      }
    }
     
        console.log('RN flat[0…9]:', inputArray.slice(0, 10));


      console.log('first 10 mel‑dB values:', inputArray.slice(0,10));

      const result = await TFLiteModule.runModelOnInput(Array.from(inputArray));
      setPrediction(result);
    } catch (e) {
      console.error('❌ Inference error:', e);
      Alert.alert('Error', e.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
      <Text style={{ fontSize: 18, marginBottom: 10 }}>
        {recording ? 'Recording...' : 'Ready'}
      </Text>
      <Button
        title={recording ? 'Stop & Analyze' : 'Start Recording'}
        onPress={recording ? stopRecording : startRecording}
      />
      <View style={{ marginVertical: 10 }} />
      <Button title="Select Audio File" onPress={selectFile} />
      {loading && <ActivityIndicator size="large" style={{ marginTop: 20 }} />}
      {prediction && (
  <View style={{ marginTop: 20 }}>
    <Text style={{ fontWeight: 'bold', marginBottom: 10 }}>Predictions:</Text>
    {prediction.map((value, index) => (
      <Text key={index}>
        {classLabels[index]}: {(value * 100).toFixed(1)}%
      </Text>
    ))}
        </View>
      )}
    </View>
  );
}
