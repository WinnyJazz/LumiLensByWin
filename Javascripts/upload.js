// clear local storage
window.addEventListener('DOMContentLoaded', () => localStorage.removeItem('photoStrip'));

// constants
const WIDTH = 1176, HEIGHT = 1470, HALF = HEIGHT / 2;

const FRAMES = [
  { name: 'Classic', src: 'Assets/fish-photobooth/camerapage/frame.png' },
  // tambahin frame lain di sini kalau ada
];

const screens = {
  upload: document.getElementById('uploadScreen'),
  preview: document.getElementById('previewScreen'),
  frame: document.getElementById('frameScreen'),
};

const elements = {
  finalCanvas: document.getElementById('finalCanvas'),
  finalCtx: document.getElementById('finalCanvas').getContext('2d'),
  previewCanvas: document.getElementById('previewCanvas'),
  previewCtx: document.getElementById('previewCanvas').getContext('2d'),
  stripCanvas: document.getElementById('stripPreviewCanvas'),
  stripCtx: document.getElementById('stripPreviewCanvas').getContext('2d'),
  frameOverlayImg: document.getElementById('frameOverlayImg'),
  frameSelectorEl: document.getElementById('frameSelector'),
  uploadInput: document.getElementById('uploadPhotoInput'),
  uploadBtn: document.getElementById('uploadPhoto'),
  retakeBtn: document.getElementById('retakeBtn'),
  nextBtn: document.getElementById('nextBtn'),
  doneBtn: document.getElementById('doneBtn'),
  confirmFrameBtn: document.getElementById('confirmFrameBtn'),
  saveBtn: document.getElementById('saveBtn'),
  uploadStatus: document.getElementById('uploadStatus'),
};

let photoStage = 0; // 0 = upload pertama, 1 = upload kedua
let selectedFrame = FRAMES[0];
let tempImg = null; // Image object hasil upload sementara, sebelum di-confirm

// ============ SCREEN SWITCH ============
const showScreen = (name) => {
  Object.entries(screens).forEach(([key, el]) => {
    el.style.display = key === name ? 'flex' : 'none';
  });
};

// ============ UPLOAD -> GAMBAR KE PREVIEW CANVAS (belum ditempel ke strip) ============
const drawToPreview = (img) => {
  const { previewCanvas, previewCtx } = elements;
  previewCanvas.width = WIDTH;
  previewCanvas.height = HALF;

  const imgAspect = img.width / img.height, targetAspect = WIDTH / HALF;
  let sx, sy, sw, sh;

  if (imgAspect > targetAspect) { sh = img.height; sw = img.height * targetAspect; sx = (img.width - sw) / 2; sy = 0; }
  else { sw = img.width; sh = img.width / targetAspect; sx = 0; sy = (img.height - sh) / 2; }

  previewCtx.clearRect(0, 0, WIDTH, HALF);
  previewCtx.drawImage(img, sx, sy, sw, sh, 0, 0, WIDTH, HALF);

  updatePreviewButtons();
  showScreen('preview');
};

const handleFileSelected = (file) => {
  const img = new Image();
  img.onload = () => {
    tempImg = img;
    drawToPreview(img);
  };
  img.src = URL.createObjectURL(file);
};

// ============ PREVIEW ACTIONS ============
const retakeUpload = () => {
  tempImg = null;
  elements.uploadInput.value = '';
  showScreen('upload');
};

const confirmUpload = () => {
  const { finalCtx } = elements;
  const yOffset = photoStage === 0 ? 0 : HALF;

  const imgAspect = tempImg.width / tempImg.height, targetAspect = WIDTH / HALF;
  let sx, sy, sw, sh;
  if (imgAspect > targetAspect) { sh = tempImg.height; sw = tempImg.height * targetAspect; sx = (tempImg.width - sw) / 2; sy = 0; }
  else { sw = tempImg.width; sh = tempImg.width / targetAspect; sx = 0; sy = (tempImg.height - sh) / 2; }

  finalCtx.drawImage(tempImg, sx, sy, sw, sh, 0, yOffset, WIDTH, HALF);

  photoStage++;
  tempImg = null;
  elements.uploadInput.value = '';

  if (photoStage === 1) {
    updateUploadStatus();
    showScreen('upload');
  } else {
    finalizePhotoStrip();
  }
};

const updateUploadStatus = () => {
  elements.uploadStatus.textContent = `Photo ${photoStage + 1} of 2`;
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
    finalCtx.drawImage(frame, 0, 0, WIDTH, HEIGHT);

    stripCtx.clearRect(0, 0, stripCanvas.width, stripCanvas.height);
    stripCtx.drawImage(finalCanvas, 0, 0);
    frameOverlayImg.style.display = 'none';

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
  const { uploadBtn, uploadInput, retakeBtn, nextBtn, doneBtn, confirmFrameBtn, saveBtn } = elements;

  uploadBtn.addEventListener('click', () => uploadInput.click());

  uploadInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    handleFileSelected(file);
  });

  retakeBtn.addEventListener('click', retakeUpload);
  nextBtn.addEventListener('click', confirmUpload);
  doneBtn.addEventListener('click', confirmUpload);
  confirmFrameBtn.addEventListener('click', confirmFrame);
  saveBtn.addEventListener('click', savePhoto);
};

// ============ INIT ============
const initUploadBooth = () => {
  updateUploadStatus();
  showScreen('upload');
  setupEventListeners();
};
initUploadBooth();

document.addEventListener('DOMContentLoaded', () => {
  const logo = document.querySelector('.logo');
  if (logo) logo.addEventListener('click', () => window.location.href = 'index.html');
});
