package com.tfliteapp;

import android.content.res.AssetFileDescriptor;
import android.content.res.AssetManager;
import android.util.Log;

import com.facebook.react.bridge.*;

import org.tensorflow.lite.Interpreter;
import org.tensorflow.lite.support.common.FileUtil;

import java.io.*;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.util.Arrays;

public class TFLiteModule extends ReactContextBaseJavaModule {
    private Interpreter tflite;

    public TFLiteModule(ReactApplicationContext reactContext) {
        super(reactContext);
        Log.d("TFLiteModule", "✅ Native module initialized");
        try {
            AssetManager assetManager = reactContext.getAssets();
            ByteBuffer model = FileUtil.loadMappedFile(reactContext, "model_efficient_new.tflite");
            tflite = new Interpreter(model);
        } catch (IOException e) {
            Log.e("TFLiteModule", "Model load failed: " + e.getMessage());
        }
    }

    @Override
    public String getName() {
        return "TFLiteModule";
    }
    

    @ReactMethod
    public void classify(float[] input, Promise promise) {
        float[][][][] inputData = new float[1][64][173][1];
        for (int i = 0; i < 64; i++) {
            for (int j = 0; j < 173; j++) {
                inputData[0][i][j][0] = input[i * 173 + j];
            }
        }

        float[][] output = new float[1][10];

        try {
            tflite.run(inputData, output);
            WritableArray result = Arguments.createArray();
            for (float v : output[0]) result.pushDouble(v);
            promise.resolve(result);
        } catch (Exception e) {
            promise.reject("INFERENCE_FAILED", e);
        }
    }

    @ReactMethod
public void runModelOnInput(ReadableArray inputArray, Promise promise) {
  try {
      float[] input = new float[inputArray.size()];
      for (int i = 0; i < inputArray.size(); i++) {
          input[i] = (float) inputArray.getDouble(i);
      }

      classify(input, promise); // ✅ reuse logic
  } catch (Exception e) {
      promise.reject("INFERENCE_ERROR", e.getMessage(), e);
  }
}

}

