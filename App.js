// App.js
import React, { useEffect, useState } from 'react';
import { View, Text, Button, PermissionsAndroid, Platform } from 'react-native';
import AudioRecord from 'react-native-audio-record';
import Tflite from 'tflite-react-native';
import RNFS from 'react-native-fs';

const tflite = new Tflite();

async function requestPermissions() {
  if (Platform.OS === 'android') {
    await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
    ]);
  }
}

export default function App() {
  const [prediction, setPrediction] = useState(null);

  useEffect(() => {
    // 1) load your model
    tflite.loadModel(
      { model: 'model_efficient.tflite', numThreads: 1 },
      (err) => {
        if (err) console.warn('Model load error', err);
        else console.log('Model loaded');
      }
    );

    requestPermissions();

    AudioRecord.init({
      sampleRate: 16000,      // <-- your TFLite model’s sample rate
      channels: 1,
      bitsPerSample: 16,
      wavFile: 'test.wav',    // this will be written under RNFS.DocumentDirectoryPath
    });
  }, []);

  const startRecording = () => {
    setPrediction(null);
    AudioRecord.start();
  };

  const stopRecording = async () => {
    const wavPath = await AudioRecord.stop();
    console.log('Recorded file:', wavPath);

    // 2) run inference directly on the WAV file
    tflite.runModelOnAudio(
      {
        path: wavPath,
        sampleRate: 16000,    // must match your model
        numResults: 3,        // how many top classes you want back
        threshold: 0.05,      // confidence threshold
      },
      (err, res) => {
        if (err) {
          console.warn('Inference error', err);
        } else {
          console.log('Inference result', res);
          setPrediction(res);
        }
      }
    );
  };

  return (
    <View style={{ flex:1, justifyContent:'center', alignItems:'center' }}>
      <Text style={{ fontSize: 18, marginBottom: 20 }}>
        {prediction
          ? `Top result: ${prediction[0].label} (${(prediction[0].confidence*100).toFixed(1)}%)`
          : 'Press record to classify sound'}
      </Text>
      <Button title="Start Recording" onPress={startRecording}/>
      <View style={{ height: 10 }}/>
      <Button title="Stop & Classify" onPress={stopRecording}/>
    </View>
  );
}
