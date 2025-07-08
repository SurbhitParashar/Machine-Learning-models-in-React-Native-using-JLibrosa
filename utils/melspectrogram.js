// utils/melspectrogram.js
import FFT from 'fft.js';

/**
 * Generate a real mel-spectrogram from raw audio data.
 * Computes STFT → Mel filterbank → log-scale (dB-like).
 * @param {Float32Array} audioData - 1D audio samples
 * @param {object} options
 * @param {number} options.sampleRate - e.g. 22050
 * @param {number} options.fftSize - e.g. 2048
 * @param {number} options.hopSize - e.g. 512
 * @param {number} options.nMels - e.g. 64
 * @returns {number[][]} melSpectrogram [nMels][nFrames]
 */
export function computeMelSpectrogram(audioData, {
  sampleRate = 22050,
  fftSize = 2048,
  hopSize = 512,
  nMels = 64,
} = {}) {
  // 1) pad/truncate to length multiple of hopSize
  const targetLen = Math.ceil(audioData.length / hopSize) * hopSize;
  if (audioData.length < targetLen) {
    const tmp = new Float32Array(targetLen);
    tmp.set(audioData);
    audioData = tmp;
  }

  const fft = new FFT(fftSize);
  const filterbank = createMelFilterbank({ sampleRate, fftSize, nMels });
  const frames = [];

  // 2) STEPS: window, FFT, power, mel
  for (let i = 0; i + fftSize <= audioData.length; i += hopSize) {
    // Hann window
    const windowed = new Float32Array(fftSize);
    for (let n = 0; n < fftSize; n++) {
      const w = 0.5 - 0.5 * Math.cos((2 * Math.PI * n) / (fftSize - 1));
      windowed[n] = audioData[i + n] * w;
    }

    // real FFT
    const re = Array.from(windowed);
    const im = new Array(fftSize).fill(0);
    const out = new Array(fftSize);
    fft.transform(out, re, im);

    // power spectrum
    const power = new Array(fftSize / 2 + 1);
    for (let k = 0; k <= fftSize / 2; k++) {
      power[k] = re[k] * re[k] + im[k] * im[k];
    }

    // apply mel filterbank
    const melFrame = filterbank.map((filter) => {
      let sum = 0;
      for (let k = 0; k < filter.length; k++) {
        sum += filter[k] * power[k];
      }
      return Math.log10(sum + 1e-6);
    });
    frames.push(melFrame);
  }

  // 3) transpose frames [nFrames][nMels] → [nMels][nFrames]
  const nFrames = frames.length;
  const melSpectrogram = Array.from({ length: nMels }, (_, m) =>
    Array.from({ length: nFrames }, (_, t) => frames[t][m])
  );
  return melSpectrogram;
}

// helper to create mel filterbank
function createMelFilterbank({ sampleRate, fftSize, nMels }) {
  const mel = (f) => 2595 * Math.log10(1 + f / 700);
  const invMel = (m) => 700 * (10 ** (m / 2595) - 1);
  const melMin = mel(0);
  const melMax = mel(sampleRate / 2);
  const melPoints = Array.from({ length: nMels + 2 }, (_, i) =>
    melMin + ((melMax - melMin) * i) / (nMels + 1)
  );
  const hzPoints = melPoints.map(invMel);
  const binFreqs = Array.from({ length: fftSize / 2 + 1 }, (_, k) =>
    (k * sampleRate) / fftSize
  );

  return Array.from({ length: nMels }, (_, m) => {
    const lower = hzPoints[m];
    const center = hzPoints[m + 1];
    const upper = hzPoints[m + 2];
    return binFreqs.map((f) => {
      if (f < lower || f > upper) return 0;
      if (f <= center) return (f - lower) / (center - lower);
      return (upper - f) / (upper - center);
    });
  });
}

/**
 * Draw a melSpectrogram matrix onto a Canvas
 * @param {Canvas} canvas - react-native-canvas instance
 * @param {number[][]} melData - [nMels][nFrames]
 */
export async function drawMelSpectrogram(canvas, melData) {
  const ctx = await canvas.getContext('2d');
  const rows = melData.length;
  const cols = melData[0].length;
  canvas.width = cols;
  canvas.height = rows;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const v = melData[y][x];
      const i = 255 - Math.floor((v + 6) / 6 * 255); // normalize log10 range
      ctx.fillStyle = `rgb(${i},${i},${i})`;
      ctx.fillRect(x, y, 1, 1);
    }
  }
}
