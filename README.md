Machine Learning models(TFLite) Integration in React Native App using Jlibrosa
1.	Introduction
•	Project name: AudioSense RN
•	Description: AudioSense RN captures audio input on the device, leverages a native JLibrosa module to extract MFCC features, and performs inference with a TensorFlow Lite model for fast, offline sound recognition. 
•	Key feature: 
•	Real time audio recording and playback within the app
•	Native MFCC preprocessing via JLibrosa for optimized performance
•	On device inference using TensorFlow Lite for low latency predictions
•	Offline AI: no network connectivity required once the model is bundled

2.	Prerequisites
Tool	Version	Note
Node.js	>=14.x	JavaScript Runtime
React Native CLI	2.X	Use with RN 0.71.8 or earlier only
Python	3.8+	For model training & TFLite conversion

3.	Installation
Step-by-step instructions to set up and run the project locally:
•	Clone the repo:
•	Install dependencies:


4.	 Adding the TFlite Model
•	Copy model.tflite to:
•	android/app/src/main/assets/model.tflite 
(if there is no assets folder create manually)
•	Copy labels.txt to:
•	android/app/src/main/assets/labels.txt
Ensure aaptOptions.noCompress "tflite", "txt" is set in android/app/build.gradle

5.	React Native Integration
Call the native module from JS:

import { NativeModules } from 'react-native';
const { JLibrosaModule } = NativeModules;
async function classifyAudio(path) {
  const scores = await JLibrosaModule.classify(path);
  // handle scores array
}


6.	 Usage
Steps to use the app:
•	Record: Tap Start Recording → then Stop & Analyze
•	Select: Tap Select Audio File → pick a .wav file
•	Inference: Predictions show with labels & scores


