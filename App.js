// import React, { useState, useEffect, useRef } from 'react';
// import {
//   View,
//   Text,
//   Button,
//   PermissionsAndroid,
//   Platform,
//   ActivityIndicator,
//   Alert,
// } from 'react-native';
// import AudioRecord from 'react-native-audio-record';
// import RNFS from 'react-native-fs';
// import Canvas from 'react-native-canvas';
// import Tflite from 'tflite-react-native';
// import { Buffer } from 'buffer';
// import Meyda from 'meyda';
// global.Buffer = Buffer;

// import { computeMelSpectrogram, drawMelSpectrogram } from './utils/melspectrogram';


// // 1. Path for saving WAV
// const WAV_PATH =
//   Platform.OS === 'android'
//     ? `${RNFS.DocumentDirectoryPath}/test.wav`
//     : `${RNFS.DocumentDirectoryPath}/test.wav`;

// const tflite = new Tflite();

// export default function App() {
//   const [recording, setRecording] = useState(false);
//   const [prediction, setPrediction] = useState(null);
//   const [loading, setLoading] = useState(false);
//   const canvasRef = useRef(null);

//   useEffect(() => {
//     tflite.loadModel(
//       { model: 'model_efficient.tflite', labels: 'labels.txt',numThreads: 1 },
//       (err, res) => {
//         if (err) console.error('❌ Model load error:', err);
//         else console.log('✅ Model loaded:', res);
//       }
//     );

//     AudioRecord.init({
//       sampleRate: 22050,
//       channels: 1,
//       bitsPerSample: 16,
//       wavFile: 'test.wav', // internally saved to DocumentDirectoryPath
//     });
//   }, []);
//   console.log('🔍 tflite methods:', Object.keys(tflite));

//   const startRecording = async () => {
//     if (Platform.OS === 'android') {
//       const granted = await PermissionsAndroid.request(
//         PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
//       );
//       if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
//         Alert.alert('Permission Denied', 'Microphone permission is required');
//         return;
//       }
//     }
//     setPrediction(null);
//     setRecording(true);
//     AudioRecord.start();
//   };

//   const stopRecording = async () => {
//   setRecording(false);
//   setLoading(true);
//   await AudioRecord.stop();

//   try {
//   console.log('1) Checking WAV file…');
//   const exists = await RNFS.exists(WAV_PATH);
//   if (!exists) throw new Error(`WAV not found at ${WAV_PATH}`);

//   console.log('2) Reading & decoding WAV…');
//   const base64wav = await RNFS.readFile(WAV_PATH, 'base64');
//   const wavBuffer = Buffer.from(base64wav, 'base64');

//   const headerBytes = 44;
//   const pcm16 = new Int16Array(
//     wavBuffer.buffer,
//     headerBytes,
//     (wavBuffer.length - headerBytes) / 2
//   );
//   let floatData = Float32Array.from(pcm16, (v) => v / 32768);

//   console.log(`   Original samples: ${floatData.length}`);
//   const SR = 22050;
//   const TARGET_LEN = SR * 4;
//   if (floatData.length < TARGET_LEN) {
//     const tmp = new Float32Array(TARGET_LEN);
//     tmp.set(floatData);
//     floatData = tmp;
//   } else if (floatData.length > TARGET_LEN) {
//     floatData = floatData.subarray(0, TARGET_LEN);
//   }
//   console.log(`   Adjusted samples: ${floatData.length}`);

//   console.log('3) Computing mel-spectrogram…');
//   const mel2d = computeMelSpectrogram(floatData, {
//     sampleRate: SR,
//     fftSize: 2048,
//     hopSize: 512,
//     nMels: 64,
//   });
//   const rows = mel2d.length;
//   const cols = mel2d[0].length;
//   console.log(`   Spectrogram size: [${rows} x ${cols}]`);

//   console.log('4) Drawing spectrogram…');
//   await drawMelSpectrogram(canvasRef.current, mel2d);
//   console.log('   Spectrogram drawn');

//   console.log('5) Flattening & encoding…');
//   const flat = new Float32Array(rows * cols);
//   mel2d.forEach((row, r) =>
//     row.forEach((v, c) => {
//       flat[r * cols + c] = v;
//     })
//   );
//   const binaryBase64 = Buffer.from(flat.buffer).toString('base64');
//   console.log(`   Encoding done, byte length: ${binaryBase64.length}`);

//   console.log('6) Running TFLite inference…');

// tflite.runModelOnBinary(
//   {
//     model: 'model_efficient.tflite',
//     binary: binaryBase64,
//     inputShape: [1, rows, cols, 1],
//     numResults: 3,
//     threshold: 0.1,
//   },
//   (err, res) => {
//     setLoading(false);
//     if (err) {
//       console.error('❌ runModelOnBinary failed:', err);
//       Alert.alert('Error', 'Model inference failed');
//     } else {
//       console.log('   Inference results:', res);
//       setPrediction(res);
//     }
//   }
// );

// } catch (e) {
//   console.error('❌ Processing error:', e);
//   Alert.alert('Error', e.message || 'Something went wrong');
//   setLoading(false);
// }

// };



//   return (
//     <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
//       <Text style={{ fontSize: 20, marginBottom: 10 }}>
//         {recording ? 'Recording...' : 'Tap to Record'}
//       </Text>
//       <Button
//         title={recording ? 'Stop & Analyze' : 'Start Recording'}
//         onPress={recording ? stopRecording : startRecording}
//       />
//       <Canvas ref={canvasRef} style={{ width: 173, height: 64, marginTop: 20 }} />
//       {loading && <ActivityIndicator size="large" color="blue" style={{ marginTop: 20 }} />}
//       {prediction && (
//         <View style={{ marginTop: 20 }}>
//           <Text style={{ fontWeight: 'bold' }}>Prediction:</Text>
//           {prediction.map((p, i) => (
//             <Text key={i}>{p.label} – {(p.confidence * 100).toFixed(1)}%</Text>
//           ))}
//         </View>
//       )}
//     </View>
//   );
// }

// // Mel Spectrogram Renderer





// App.js
// import React, { useEffect, useState } from 'react';
// import { View, Text, Button, Alert } from 'react-native';
// import Tflite from 'tflite-react-native';

// const tflite = new Tflite();

// export default function App() {
//   const [loaded, setLoaded] = useState(false);

//   useEffect(() => {
//     tflite.loadModel({
//       model: 'model_efficient.tflite',
//       labels: 'labels.txt',
//       numThreads: 1,
//     }, (err, res) => {
//       if (err) {
//         console.error('❌ Model load error:', err);
//         Alert.alert('Load failed', err.message || err);
//       } else {
//         console.log('✅ Model loaded:', res);
//         setLoaded(true);
//       }
//     });
//   }, []);

//   const testInference = () => {
//     tflite.runModelOnBinary({
//       model: 'model_efficient.tflite',
//       binary: '', // provide dummy or real input
//       inputShape: [1, 1, 1, 1],
//       numResults: 1,
//       threshold: 0.1,
//     }, (err, res) => {
//       if (err) console.error('❌ Inference failed:', err);
//       else console.log('🧠 Inference result:', res);
//     });
//   };

//   return (
//     <View style={{ flex:1, justifyContent:'center', alignItems:'center' }}>
//       <Text style={{ fontSize: 18 }}>
//         {loaded ? 'Model is ready ✅' : 'Loading model...'}
//       </Text>
//       {loaded && (
//         <Button title="Run Test Inference" onPress={testInference} />
//       )}
//     </View>
//   );
// }







// App.js
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
import { computeMelSpectrogram } from './utils/melspectrogram';

global.Buffer = Buffer;

const { TFLiteModule } = NativeModules;
const WAV_PATH = `${RNFS.DocumentDirectoryPath}/test.wav`;

export default function App() {
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [prediction, setPrediction] = useState(null);
console.log('🔍 Available native modules:', NativeModules);

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
    setLoading(true);
    await AudioRecord.stop();

    try {
      const exists = await RNFS.exists(WAV_PATH);
      if (!exists) throw new Error('WAV file not found');

      const base64wav = await RNFS.readFile(WAV_PATH, 'base64');
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

      // Ensure shape [64, 173]
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

      // Flatten to JS array (not Float32Array!)
      const inputArray = [];
      for (let i = 0; i < TARGET_ROWS; i++) {
        for (let j = 0; j < TARGET_COLS; j++) {
          inputArray.push(melResized[i][j]);
        }
      }

      // 🔁 Call native module
      const result = await TFLiteModule.runModelOnInput(inputArray);

      // 🧾 Display
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
      {loading && <ActivityIndicator size="large" style={{ marginTop: 20 }} />}
      {prediction && (
        <View style={{ marginTop: 20 }}>
          <Text style={{ fontWeight: 'bold' }}>Prediction:</Text>
          {prediction.map((item, index) => (
            <Text key={index}>{item}</Text>
          ))}
        </View>
      )}
    </View>
  );
}
