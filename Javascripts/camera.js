// constants
const WIDTH = 1176, HEIGHT = 1470, HALF = HEIGHT / 2;

// dom elements
const elements = {
  video: document.getElementById('liveVideo'),
  canvas: document.getElementById('finalCanvas'),
  ctx: document.getElementById('finalCanvas').getContext('2d'),
  takePhotoBtn: document.getElementById('takePhoto'),
  downloadBtn: document.getElementById('downloadBtn'),
  countdownEl: document.querySelector('.countdown-timer')
};

let photoStage = 0; // 0=capture pertama, 1=capture kedua, 2=selesai

// video selalu full 1 kotak, ga usah digeser2 lagi
const showFullVideo = () => {
  const { video } = elements;
  video.style.display = 'block';
  video.style.top = '0';
  video.style.left = '0';
  video.style.width = '100%';
  video.style.height = '100%';
};

// countdown
const startCountdown = callback => {
  let count = 3;
  const { countdownEl } = elements;
  countdownEl.textContent = count;
  countdownEl.style.display = 'flex';
  const intervalId = setInterval(() => {
    count--;
    if (count > 0) countdownEl.textContent = count;
    else {
      clearInterval(intervalId);
      countdownEl.style.display = 'none';
      callback();
    }
  }, 1000);
};

// capture photo — tetep nulis ke setengah atas/bawah CANVAS,
// video di layar tetep full, ga kepengaruh
const capturePhoto = () => {
  const { video, ctx, takePhotoBtn } = elements;
  const yOffset = photoStage === 0 ? 0 : HALF;
  const vW = video.videoWidth, vH = video.videoHeight;
  const targetAspect = WIDTH / HALF, vAspect = vW / vH;
  let sx, sy, sw, sh;

  if (vAspect > targetAspect) { sh = vH; sw = vH * targetAspect; sx = (vW - sw) / 2; sy = 0; }
  else { sw = vW; sh = vW / targetAspect; sx = 0; sy = (vH - sh) / 2; }

  ctx.save();
  ctx.translate(WIDTH, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, sx, sy, sw, sh, 0, yOffset, WIDTH, HALF);
  ctx.restore();

  photoStage++;
  if (photoStage === 1) { takePhotoBtn.disabled = false; } // capture ke-2 masih boleh
  else if (photoStage === 2) finalizePhotoStrip();
};

// finalize photo strip
const finalizePhotoStrip = () => {
  const { video, ctx, canvas } = elements;
  video.style.display = 'none';
  const frame = new Image();
  frame.src = 'Assets/fish-photobooth/camerapage/frame.png';
  frame.onload = () => {
    ctx.drawImage(frame, 0, 0, WIDTH, HEIGHT);
    localStorage.setItem('photoStrip', canvas.toDataURL('image/png'));
    setTimeout(() => window.location.href = 'final.html', 50);
  };
  frame.complete && frame.onload();
};

// download photo
const downloadPhoto = () => {
  elements.canvas.toBlob(blob => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'photo-strip.png';
    a.click();
  }, 'image/png');
};

// setup camera
const setupCamera = () => {
  navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 2560 }, height: { ideal: 1440 }, facingMode: 'user' }, audio: false })
    .then(stream => { elements.video.srcObject = stream; elements.video.play(); showFullVideo(); })
    .catch(err => alert('Camera access failed: ' + err));
};

// setup events
const setupEventListeners = () => {
  const { takePhotoBtn, downloadBtn } = elements;

  takePhotoBtn.addEventListener('click', () => {
    if (photoStage > 1) return;
    takePhotoBtn.disabled = true;
    startCountdown(capturePhoto);
  });

  downloadBtn.addEventListener('click', downloadPhoto);
  // resize listener lama dihapus karena video udah ga pernah digeser-geser lagi
};

// initialize photo booth
const initPhotoBooth = () => { setupCamera(); setupEventListeners(); };
initPhotoBooth();

// logo redirect
document.addEventListener('DOMContentLoaded', () => {
  const logo = document.querySelector('.logo');
  if (logo) logo.addEventListener('click', () => window.location.href = 'index.html');
});