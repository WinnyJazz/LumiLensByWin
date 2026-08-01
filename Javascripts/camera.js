// constants
const WIDTH = 1176, HEIGHT = 1470, HALF = HEIGHT / 2;

const FRAMES = [
  { name: 'Classic', src: 'Assets/fish-photobooth/camerapage/frame.png' },
  // tambahin frame lain di sini, contoh:
  // { name: 'Pink', src: 'Assets/fish-photobooth/camerapage/frame-pink.png' },
];

const screens = {
  camera: document.getElementById('cameraScreen'),
  preview: document.getElementById('previewScreen'),
  frame: document.getElementById('frameScreen'),
};

const elements = {
  video: document.getElementById('liveVideo'),
  finalCanvas: document.getElementById('finalCanvas'),
  finalCtx: document.getElementById('finalCanvas').getContext('2d'),
  previewCanvas: document.getElementById('previewCanvas'),
  previewCtx: document.getElementById('previewCanvas').getContext('2d'),
  stripCanvas: document.getElementById('stripPreviewCanvas'),
  stripCtx: document.getElementById('stripPreviewCanvas').getContext('2d'),
  frameOverlayImg: document.getElementById('frameOverlayImg'),
  frameSelectorEl: document.getElementById('frameSelector'),
  takePhotoBtn: document.getElementById('takePhoto'),
  retakeBtn: document.getElementById('retakeBtn'),
  nextBtn: document.getElementById('nextBtn'),
  doneBtn: document.getElementById('doneBtn'),
  confirmFrameBtn: document.getElementById('confirmFrameBtn'),
  countdownEl: document.querySelector('.countdown-timer'),
  captureStatus: document.getElementById('captureStatus'),
  saveBtn: document.getElementById('saveBtn'),
};

let photoStage = 0; // 0 = capture pertama, 1 = capture kedua
let selectedFrame = FRAMES[0];
let tempImageData = null; // hasil capture sementara, sebelum di-confirm ke final canvas

// ============ SCREEN SWITCH ============
const showScreen = (name) => {
  Object.entries(screens).forEach(([key, el]) => {
    el.style.display = key === name ? 'flex' : 'none';
  });
};

// ============ CAMERA ============
const showFullVideo = () => {
  const { video } = elements;
  video.style.display = 'block';
  video.style.top = '0';
  video.style.left = '0';
  video.style.width = '100%';
  video.style.height = '100%';
};

const setupCamera = () => {
  navigator.mediaDevices.getUserMedia({
    video: { width: { ideal: 2560 }, height: { ideal: 1440 }, facingMode: 'user' },
    audio: false
  })
    .then(stream => {
      elements.video.srcObject = stream;
      elements.video.play();
      showFullVideo();
    })
    .catch(err => alert('Camera access failed: ' + err));
};

// ============ COUNTDOWN ============
const startCountdown = (callback) => {
  let count = 3;
  const { countdownEl } = elements;
  countdownEl.textContent = count;
  countdownEl.style.display = 'flex';
  const intervalId = setInterval(() => {
    count--;
    if (count > 0) {
      countdownEl.textContent = count;
    } else {
      clearInterval(intervalId);
      countdownEl.style.display = 'none';
      callback();
    }
  }, 1000);
};

// ============ CAPTURE KE CANVAS SEMENTARA (foto utuh, belum ditempel ke strip) ============
const captureToTemp = () => {
  const { video, previewCanvas, previewCtx } = elements;
  previewCanvas.width = WIDTH;
  previewCanvas.height = HALF;

  const vW = video.videoWidth, vH = video.videoHeight;
  const targetAspect = WIDTH / HALF, vAspect = vW / vH;
  let sx, sy, sw, sh;

  if (vAspect > targetAspect) { sh = vH; sw = vH * targetAspect; sx = (vW - sw) / 2; sy = 0; }
  else { sw = vW; sh = vW / targetAspect; sx = 0; sy = (vH - sh) / 2; }

  previewCtx.save();
  previewCtx.translate(WIDTH, 0);
  previewCtx.scale(-1, 1);
  previewCtx.drawImage(video, sx, sy, sw, sh, 0, 0, WIDTH, HALF);
  previewCtx.restore();

  tempImageData = previewCtx.getImageData(0, 0, WIDTH, HALF);
};

const handleCaptureDone = () => {
  captureToTemp();
  updatePreviewButtons();
  showScreen('preview');
};

// ============ PREVIEW ACTIONS ============
const retakePhoto = () => {
  tempImageData = null;
  showScreen('camera');
};

const confirmPhoto = () => {
  const { finalCtx } = elements;
  const yOffset = photoStage === 0 ? 0 : HALF;
  finalCtx.putImageData(tempImageData, 0, yOffset);

  photoStage++;
  tempImageData = null;

  if (photoStage === 1) {
    updateCaptureStatus();
    showScreen('camera');
  } else {
    finalizePhotoStrip();
  }
};

const updateCaptureStatus = () => {
  elements.captureStatus.textContent = `Photo ${photoStage + 1} of 2`;
};

const updatePreviewButtons = () => {
  const { retakeBtn, nextBtn, doneBtn } = elements;
  nextBtn.style.display = photoStage === 0 ? 'inline-block' : 'none';
  doneBtn.style.display = photoStage === 1 ? 'inline-block' : 'none';
};

// ============ FINALIZE STRIP -> LAYAR PILIH FRAME ============
const finalizePhotoStrip = () => {
  const { finalCanvas, stripCanvas, stripCtx } = elements;
  stripCanvas.width = WIDTH;
  stripCanvas.height = HEIGHT;
  stripCtx.drawImage(finalCanvas, 0, 0);

  renderFrameSelector();
  applySelectedFrame();
  showScreen('frame');
};

const renderFrameSelector = () => {
  const { frameSelectorEl } = elements;
  frameSelectorEl.innerHTML = '';
  FRAMES.forEach((frame) => {
    const btn = document.createElement('button');
    btn.className = 'frame-thumb' + (frame === selectedFrame ? ' selected' : '');
    btn.innerHTML = `<img src="${frame.src}" alt="${frame.name}">`;
    btn.addEventListener('click', () => {
      selectedFrame = frame;
      [...frameSelectorEl.children].forEach(c => c.classList.remove('selected'));
      btn.classList.add('selected');
      applySelectedFrame();
    });
    frameSelectorEl.appendChild(btn);
  });
};

const applySelectedFrame = () => {
  elements.frameOverlayImg.src = selectedFrame.src;
};

// ============ CONFIRM FRAME -> TAMPILKAN HASIL JADI (di halaman yang sama) ============
const confirmFrame = () => {
  const { finalCanvas, finalCtx, stripCanvas, stripCtx, frameOverlayImg } = elements;
  const frame = new Image();
  frame.src = selectedFrame.src;

  const doConfirm = () => {
    // bakar frame ke finalCanvas (buffer) -> ini yang jadi source of truth buat save
    finalCtx.drawImage(frame, 0, 0, WIDTH, HEIGHT);

    // update tampilan biar strip yang keliatan = hasil jadi (foto + frame nyatu)
    stripCtx.clearRect(0, 0, stripCanvas.width, stripCanvas.height);
    stripCtx.drawImage(finalCanvas, 0, 0);
    frameOverlayImg.style.display = 'none'; // frame udah nempel di canvas, overlay img ga perlu lagi

    // sembunyiin pilihan frame & tombol confirm, sisain hasil jadi + save
    screens.frame.classList.add('frame-screen-confirmed');
  };

  if (frame.complete) doConfirm();
  else frame.onload = doConfirm;
};

// ============ SAVE PHOTO (Save As) ============
const savePhoto = async () => {
  const { finalCanvas } = elements;

  finalCanvas.toBlob(async (blob) => {
    if (window.showSaveFilePicker) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: 'photo-strip.png',
          types: [{ description: 'PNG Image', accept: { 'image/png': ['.png'] } }],
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
      } catch (err) {
        if (err.name !== 'AbortError') console.error('Save failed:', err);
      }
      return;
    }

    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'photo-strip.png';
    a.click();
    URL.revokeObjectURL(a.href);
  }, 'image/png');
};

// ============ EVENTS ============
const setupEventListeners = () => {
  const { takePhotoBtn, retakeBtn, nextBtn, doneBtn, confirmFrameBtn } = elements;

  takePhotoBtn.addEventListener('click', () => {
    takePhotoBtn.disabled = true;
    startCountdown(() => {
      handleCaptureDone();
      takePhotoBtn.disabled = false;
    });
  });

  retakeBtn.addEventListener('click', retakePhoto);
  nextBtn.addEventListener('click', confirmPhoto);
  doneBtn.addEventListener('click', confirmPhoto);
  confirmFrameBtn.addEventListener('click', confirmFrame);
  saveBtn.addEventListener('click', savePhoto);
};

// ============ INIT ============
const initPhotoBooth = () => {
  updateCaptureStatus();
  showScreen('camera');
  setupCamera();
  setupEventListeners();
};
initPhotoBooth();

document.addEventListener('DOMContentLoaded', () => {
  const logo = document.querySelector('.logo');
  if (logo) logo.addEventListener('click', () => window.location.href = 'index.html');
});