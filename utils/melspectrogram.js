// // utils/melspectrogram.js
// import FFT from 'fft.js';

// /**
//  * Generate a real mel-spectrogram from raw audio data.
//  * Computes STFT → Mel filterbank → log-scale (dB-like).
//  * @param {Float32Array} audioData - 1D audio samples
//  * @param {object} options
//  * @param {number} options.sampleRate - e.g. 22050
//  * @param {number} options.fftSize - e.g. 2048
//  * @param {number} options.hopSize - e.g. 512
//  * @param {number} options.nMels - e.g. 64
//  * @returns {number[][]} melSpectrogram [nMels][nFrames]
//  */

// export function computeMelSpectrogram(audioData, {
//   sampleRate = 22050,
//   fftSize    = 2048,
//   hopSize    = 512,
//   nMels      = 64,
//   amin       = 1e-10,
//   topDb      = 80,
// } = {}) {
//   // 1) pad/truncate to hopSize multiple
//   const targetLen = Math.ceil(audioData.length / hopSize) * hopSize;
//   if (audioData.length < targetLen) {
//     const tmp = new Float32Array(targetLen);
//     tmp.set(audioData);
//     audioData = tmp;
//   }

//   // 2) STFT → power spectrogram
//   const fft = new FFT(fftSize);
//   const filterbank = createMelFilterbank({ sampleRate, fftSize, nMels });
//   const rawMelFrames = [];

//   // allocate FFT.js buffers once
//   const complex = fft.createComplexArray();       // length = 2*fftSize
//   const power   = new Float32Array(fftSize/2 + 1); 

//   for (let i = 0; i + fftSize <= audioData.length; i += hopSize) {
//     // windowed frame
//     const win = new Float32Array(fftSize);
//     for (let n = 0; n < fftSize; n++) {
//       win[n] = audioData[i + n] * (0.5 - 0.5 * Math.cos((2 * Math.PI * n) / (fftSize - 1)));
//     }

//     // real FFT → complex spectrum
//     fft.realTransform(complex, win);
//     fft.completeSpectrum(complex);

//     // compute power spectrum for bins 0…fftSize/2
//     for (let k = 0; k <= fftSize/2; k++) {
//       const re = complex[2*k];
//       const im = complex[2*k + 1];
//       power[k] = re*re + im*im;
//     }

//     // apply mel filterbank
//     const melFrame = filterbank.map(filter => {
//       let sum = 0;
//       for (let k = 0; k < filter.length; k++) {
//         sum += filter[k] * power[k];
//       }
//       return sum;
//     });
//     rawMelFrames.push(melFrame);
//   }

//   // DEBUG: you can uncomment these to verify intermediate values
//   console.log('[DBG] # frames:', rawMelFrames.length);
//   console.log('[DBG] first frame energies:', rawMelFrames[0].slice(0,10));

//   // 3) find global max power
//   let maxPower = amin;
//   for (const frame of rawMelFrames) {
//     for (const v of frame) {
//       if (v > maxPower) maxPower = v;
//     }
//   }
//   console.log('[DBG] maxPower:', maxPower);

//   // 4) convert to dB and clip to [-topDb, 0]
//   const melDB = Array.from({ length: nMels }, (_, m) =>
//     rawMelFrames.map(frame => {
//       const val = Math.max(frame[m], amin);
//       let db  = 10 * Math.log10(val) - 10 * Math.log10(maxPower);
//       return Math.max(db, -topDb);
//     })
//   );

//   // DEBUG: verify first frame’s 64 bands match Python’s mel_db[:,0]
//   const frame0 = melDB.map(band => band[0]);
//   console.log('[DBG] mel-dB for frame 0:', frame0);

//   return melDB;  // [nMels][nFrames], values in [-topDb…0]
// }



// // helper to create mel filterbank
// function createMelFilterbank({ sampleRate, fftSize, nMels }) {
//   const mel = (f) => 2595 * Math.log10(1 + f / 700);
//   const invMel = (m) => 700 * (10 ** (m / 2595) - 1);
//   const melMin = mel(0);
//   const melMax = mel(sampleRate / 2);
//   const melPoints = Array.from({ length: nMels + 2 }, (_, i) =>
//     melMin + ((melMax - melMin) * i) / (nMels + 1)
//   );
//   const hzPoints = melPoints.map(invMel);
//   const binFreqs = Array.from({ length: fftSize / 2 + 1 }, (_, k) =>
//     (k * sampleRate) / fftSize
//   );

//   return Array.from({ length: nMels }, (_, m) => {
//     const lower = hzPoints[m];
//     const center = hzPoints[m + 1];
//     const upper = hzPoints[m + 2];
//     return binFreqs.map((f) => {
//       if (f < lower || f > upper) return 0;
//       if (f <= center) return (f - lower) / (center - lower);
//       return (upper - f) / (upper - center);
//     });
//   });
// }

// /**
//  * Draw a melSpectrogram matrix onto a Canvas
//  * @param {Canvas} canvas - react-native-canvas instance
//  * @param {number[][]} melData - [nMels][nFrames]
//  */
// export async function drawMelSpectrogram(canvas, melData) {
//   const ctx = await canvas.getContext('2d');
//   const rows = melData.length;
//   const cols = melData[0].length;
//   canvas.width = cols;
//   canvas.height = rows;
//   for (let y = 0; y < rows; y++) {
//     for (let x = 0; x < cols; x++) {
//       const v = melData[y][x];
//       const i = 255 - Math.floor((v + 6) / 6 * 255); // normalize log10 range
//       ctx.fillStyle = `rgb(${i},${i},${i})`;
//       ctx.fillRect(x, y, 1, 1);
//     }
//   }
// }


import FFT from 'fft.js';

/**
 * Create a Slaney‑style Mel filterbank, matching librosa.filters.mel (norm='slaney').
 * @param {number} sampleRate
 * @param {number} fftSize
 * @param {number} nMels
 */
function createMelFilterbank({ sampleRate, fftSize, nMels }) {
  const mel = f => 2595 * Math.log10(1 + f/700);
  const invMel = m => 700 * (10**(m/2595) - 1);
  const melMin = mel(0);
  const melMax = mel(sampleRate/2);
  const melPts = Array.from({ length: nMels + 2 }, (_, i) =>
    melMin + ((melMax - melMin) * i)/(nMels+1)
  );
  const hzPts = melPts.map(invMel);
  const binFreqs = Array.from({ length: fftSize/2 + 1 }, (_, k) =>
    (k * sampleRate)/fftSize
  );

  const filters = [];
  for (let m = 0; m < nMels; m++) {
    const lower = hzPts[m], center = hzPts[m+1], upper = hzPts[m+2];
    const filter = new Float32Array(fftSize/2 + 1);

    // build triangle
    for (let k = 0; k <= fftSize/2; k++) {
      const f = binFreqs[k];
      if (f < lower || f > upper) {
        filter[k] = 0;
      } else if (f <= center) {
        filter[k] = (f - lower)/(center - lower);
      } else {
        filter[k] = (upper - f)/(upper - center);
      }
    }

    // Slaney normalization: make area = 1
    const enorm = 2.0 / (upper - lower);
    for (let k = 0; k < filter.length; k++) {
      filter[k] *= enorm;
    }

    filters.push(filter);
  }

  return filters;  // Array of Float32Array’s [nMels][fftSize/2+1]
}


/**
 * Compute a mel‑spectrogram exactly like:
 *   S = librosa.feature.melspectrogram(y, sr, n_mels, ...)
 *   mel_db = librosa.power_to_db(S, ref=np.max, top_db=80)
 *
 * @param {Float32Array} audioData  - 1D PCM data ([-1..1])
 * @param {object} options
 * @returns {number[][]}   [nMels][nFrames]  values in [-topDb…0]
 */
export function computeMelSpectrogram(audioData, {
  sampleRate = 22050,
  fftSize    = 2048,
  hopSize    = 512,
  nMels      = 64,
  amin       = 1e-10,
  topDb      = 80,
} = {}) {
  // 1) pad/truncate to hopSize multiple
  const targetLen = Math.ceil(audioData.length/hopSize) * hopSize;
  if (audioData.length < targetLen) {
    const tmp = new Float32Array(targetLen);
    tmp.set(audioData);
    audioData = tmp;
  }

  // 2) STFT + mel filterbank → rawMelFrames
  const fft = new FFT(fftSize);
  const filterbank = createMelFilterbank({ sampleRate, fftSize, nMels });
  const rawMelFrames = [];

  // allocate once
  const complex = fft.createComplexArray();            // length = 2*fftSize
  const power   = new Float32Array(fftSize/2 + 1);     // real power bins

  for (let i = 0; i + fftSize <= audioData.length; i += hopSize) {
    // window
    const frame = new Float32Array(fftSize);
    for (let n = 0; n < fftSize; n++) {
      frame[n] = audioData[i+n] * (0.5 - 0.5*Math.cos((2*Math.PI*n)/(fftSize-1)));
    }

    // real FFT → complex
    fft.realTransform(complex, frame);
    fft.completeSpectrum(complex);

    // power spectrum
    for (let k = 0; k <= fftSize/2; k++) {
      const re = complex[2*k], im = complex[2*k+1];
      power[k] = re*re + im*im;
    }

    // mel binning
    const melFrame = filterbank.map(filter => {
      let sum = 0;
      for (let k = 0; k < filter.length; k++) {
        sum += filter[k] * power[k];
      }
      return sum;
    });
    rawMelFrames.push(melFrame);
  }

  // 3) global max (for reference)
  let maxPower = amin;
  for (const frame of rawMelFrames) {
    for (const v of frame) {
      if (v > maxPower) maxPower = v;
    }
  }

  // 4) power_to_db(ref=maxPower, top_db)
  const melDB = Array.from({ length: nMels }, (_, m) =>
    rawMelFrames.map(frame => {
      const val = Math.max(frame[m], amin);
      let db = 10 * Math.log10(val / maxPower);
      db = Math.max(db, -topDb);  // Cap to -80 dB
      return db;

    })
  );

  return melDB;
}

import RNFS from 'react-native-fs';

export async function saveMelToJSON(mel2d) {
  const path = `${RNFS.DownloadDirectoryPath}/mel_native.json`;
  try {
    await RNFS.writeFile(path, JSON.stringify(mel2d), 'utf8');
    console.log('✅ Saved to', path);
  } catch (e) {
    console.error('❌ Save error:', e);
  }
}


