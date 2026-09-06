/// <reference lib="webworker" />
import { pipeline, env, RawImage } from '@huggingface/transformers';
env.allowLocalModels = false;
if (env.backends.onnx.wasm) env.backends.onnx.wasm.numThreads = 1;
self.onmessage = async (
  event: MessageEvent<{ photo: Blob; labels: string[] }>,
) => {
  try {
    self.postMessage({
      status:
        'Downloading the free vision model. First use can take a few minutes…',
    });
    const classifier = await pipeline(
      'zero-shot-image-classification',
      'Xenova/clip-vit-base-patch32',
      { device: 'wasm', dtype: 'q8' },
    );
    self.postMessage({ status: 'Comparing machine shapes…' });
    const image = await RawImage.fromBlob(event.data.photo);
    const result = await classifier(image, event.data.labels);
    self.postMessage({ result });
    await classifier.dispose();
  } catch {
    self.postMessage({
      error:
        'Photo matching is unavailable on this device. Try reading the label or choose a machine type manually.',
    });
  }
};
