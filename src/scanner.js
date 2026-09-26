function stopStream(stream) {
  stream?.getTracks().forEach((track) => track.stop());
}

function isHardCameraError(error) {
  const name = error?.name || '';
  return name === 'NotAllowedError' || name === 'NotFoundError' || name === 'SecurityError' || name === 'NotReadableError';
}

export function cameraErrorMessage(error) {
  const name = error?.name || '';
  if (!window.isSecureContext) {
    return 'Camera scanning needs HTTPS. You can still type the barcode below.';
  }
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return 'Camera permission is blocked. Allow it in the browser settings, or type the barcode below.';
  }
  if (name === 'NotFoundError' || name === 'OverconstrainedError') {
    return 'No camera was found. Type the barcode below.';
  }
  if (name === 'NotReadableError') {
    return 'The camera is in use by another app. Type the barcode below.';
  }
  return 'The camera could not start. Type the barcode below.';
}

async function play(video, stream) {
  video.srcObject = stream;
  video.muted = true;
  video.playsInline = true;
  await video.play();
}

async function startNative(video, onCode, onFallback) {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: { facingMode: { ideal: 'environment' } },
  });
  await play(video, stream);

  let detector;
  try {
    const wanted = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'itf', 'qr_code'];
    const supported = typeof BarcodeDetector.getSupportedFormats === 'function'
      ? await BarcodeDetector.getSupportedFormats()
      : wanted;
    const formats = wanted.filter((format) => supported.includes(format));
    detector = new BarcodeDetector(formats.length ? { formats } : undefined);
  } catch (error) {
    stopStream(stream);
    video.srcObject = null;
    throw error;
  }

  let timer = 0;
  let stopped = false;
  let failures = 0;
  let found = false;

  const stop = () => {
    stopped = true;
    window.clearTimeout(timer);
    stopStream(stream);
    if (video.srcObject === stream) video.srcObject = null;
  };

  const tick = async () => {
    if (stopped || found) return;
    try {
      const codes = await detector.detect(video);
      failures = 0;
      const raw = codes?.[0]?.rawValue;
      if (raw) {
        found = true;
        stop();
        onCode(raw);
        return;
      }
    } catch {
      failures += 1;
      if (failures >= 2) {
        stop();
        await onFallback();
        return;
      }
    }
    timer = window.setTimeout(tick, 180);
  };

  timer = window.setTimeout(tick, 200);
  return { stop, backend: 'native' };
}

async function startZxing(video, onCode) {
  const { BrowserMultiFormatReader } = await import('@zxing/browser');
  const reader = new BrowserMultiFormatReader();
  let stopped = false;
  let controls = null;
  controls = await reader.decodeFromConstraints(
    { audio: false, video: { facingMode: { ideal: 'environment' } } },
    video,
    (result) => {
      if (stopped || !result) return;
      const text = result.getText();
      if (!text) return;
      stopped = true;
      controls?.stop();
      onCode(text);
    },
  );
  return {
    backend: 'zxing',
    stop() {
      stopped = true;
      try {
        controls?.stop();
      } catch {
        /* already stopped */
      }
    },
  };
}

export async function startScanner(video, onCode) {
  const handle = {
    backend: '',
    stop() {},
  };
  const adopt = (next) => {
    handle.backend = next.backend;
    handle.stop = () => next.stop();
  };

  if ('BarcodeDetector' in window) {
    try {
      const native = await startNative(video, onCode, async () => {
        const fallback = await startZxing(video, onCode);
        adopt(fallback);
      });
      adopt(native);
      return handle;
    } catch (error) {
      if (isHardCameraError(error)) throw error;
    }
  }

  const fallback = await startZxing(video, onCode);
  adopt(fallback);
  return handle;
}
