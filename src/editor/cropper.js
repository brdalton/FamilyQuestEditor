import { currentMember } from './editor.js';

let currentImage = null;

let img = new Image();
let imgX = 0, imgY = 0;
let scale = 1;
let dragging = false;
let dragStartX = 0, dragStartY = 0;
let moved = false;

let canvas, ctx, previewCanvas, pctx, zoomSlider, circleMaskToggle, overlay;

const CROP_X = 50;
const CROP_Y = 50;
const CROP_SIZE = 200;

export function initCropper() {
  canvas = document.getElementById("photoCanvas");
  ctx = canvas.getContext("2d");
  previewCanvas = document.getElementById("previewCanvas");
  pctx = previewCanvas.getContext("2d");
  zoomSlider = document.getElementById("zoomSlider");
  circleMaskToggle = document.getElementById("circleMaskToggle");
  overlay = document.querySelector(".canvas-overlay");

  canvas.addEventListener("click", onCanvasClick);
  canvas.addEventListener("dragover", onDragOver);
  canvas.addEventListener("dragleave", onDragLeave);
  canvas.addEventListener("drop", onDrop);

  canvas.addEventListener("mousedown", onMouseDown);
  canvas.addEventListener("mouseup", onMouseUp);
  canvas.addEventListener("mouseleave", onMouseUp);
  canvas.addEventListener("mousemove", onMouseMove);
  canvas.addEventListener("wheel", onWheel, { passive: false });

  zoomSlider.addEventListener("input", () => {
    scale = parseFloat(zoomSlider.value);
    clampImageToCropBox();
    draw();
  });

  circleMaskToggle.addEventListener("change", draw);

  document.getElementById("resetCropperBtn").addEventListener("click", resetCropper);

  resetCropper();
}

/* FILE LOADING */

function onCanvasClick(e) {
  if (moved) return;
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.onchange = ev => loadImageFile(ev.target.files[0]);
  input.click();
}

function onDragOver(e) {
  e.preventDefault();
  canvas.style.background = "#e2e8f0";
}

function onDragLeave() {
  canvas.style.background = "#fafafa";
}

function onDrop(e) {
  e.preventDefault();
  canvas.style.background = "#fafafa";
  loadImageFile(e.dataTransfer.files[0]);
}

function loadImageFile(file) {
  console.log("loadImageFile fired");

  const url = URL.createObjectURL(file);

  img = new Image();
  img.onload = () => {
    URL.revokeObjectURL(url);

    currentImage = img;

    resetCropper();
    overlay.style.display = "none";
    fitImageToCropBox();
    draw();
  };

  img.src = url;
}

/* INTERACTION */

function onMouseDown(e) {
  dragging = true;
  moved = false;
  dragStartX = e.offsetX - imgX;
  dragStartY = e.offsetY - imgY;
}

function onMouseUp() {
  dragging = false;
}

function onMouseMove(e) {
  if (dragging) {
    moved = true;
    imgX = e.offsetX - dragStartX;
    imgY = e.offsetY - dragStartY;
    clampImageToCropBox();
    draw();
  }
}

function onWheel(e) {
  e.preventDefault();

  const zoom = e.deltaY < 0 ? 1.05 : 0.95;

  const mx = e.offsetX;
  const my = e.offsetY;

  const imgPointX = (mx - imgX) / scale;
  const imgPointY = (my - imgY) / scale;

  scale *= zoom;
  zoomSlider.value = scale;

  imgX = mx - imgPointX * scale;
  imgY = my - imgPointY * scale;

  clampImageToCropBox();
  draw();
}

/* GEOMETRY */

function clampImageToCropBox() {
  if (!img.width || !img.height) return;

  const imgW = img.width * scale;
  const imgH = img.height * scale;

  const minX = CROP_X + CROP_SIZE - imgW;
  const minY = CROP_Y + CROP_SIZE - imgH;
  const maxX = CROP_X;
  const maxY = CROP_Y;

  imgX = Math.min(maxX, Math.max(minX, imgX));
  imgY = Math.min(maxY, Math.max(minY, imgY));
}

function fitImageToCropBox() {
  if (!img.width || !img.height) return;

  const scaleX = CROP_SIZE / img.width;
  const scaleY = CROP_SIZE / img.height;
  scale = Math.max(scaleX, scaleY);
  zoomSlider.value = scale;

  const imgW = img.width * scale;
  const imgH = img.height * scale;

  imgX = CROP_X + (CROP_SIZE - imgW) / 2;
  imgY = CROP_Y + (CROP_SIZE - imgH) / 2;

  clampImageToCropBox();
}

/* DRAWING */

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (currentImage) {
    ctx.save();
    ctx.translate(imgX, imgY);
    ctx.scale(scale, scale);
    ctx.drawImage(currentImage, 0, 0);
    ctx.restore();
  }

  ctx.save();
  ctx.strokeStyle = "#2b6cb0";
  ctx.lineWidth = 2;

  if (circleMaskToggle.checked) {
    ctx.beginPath();
    ctx.arc(CROP_X + CROP_SIZE / 2, CROP_Y + CROP_SIZE / 2, CROP_SIZE / 2, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    ctx.strokeRect(CROP_X, CROP_Y, CROP_SIZE, CROP_SIZE);
  }

  ctx.restore();

  updatePreview();
}

function updatePreview() {
  pctx.clearRect(0, 0, 200, 200);

  pctx.drawImage(
    canvas,
    CROP_X, CROP_Y, CROP_SIZE, CROP_SIZE,
    0, 0, 200, 200
  );

  if (circleMaskToggle.checked) {
    pctx.globalCompositeOperation = "destination-in";
    pctx.beginPath();
    pctx.arc(100, 100, 100, 0, Math.PI * 2);
    pctx.fill();
    pctx.globalCompositeOperation = "source-over";
  }
}

/* RESET / SAVE */

export function clearCropper() {
  if (!canvas || !ctx) {
    console.warn("clearCropper called before initCropper");
    return;
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  currentImage = null;
  imgX = CROP_X;
  imgY = CROP_Y;
  scale = 1;

  overlay.style.display = "flex";

  draw();
}

function resetCropper() {
  imgX = CROP_X;
  imgY = CROP_Y;
  scale = 1;
  zoomSlider.value = 1;
  draw();
}

export function saveCroppedPhoto() {
  if (!currentMember) {
    alert("Save a member first.");
    return;
  }
  console.log("saveCroppedPhoto() WAS CALLED");

  const cropCanvas = document.createElement("canvas");
  cropCanvas.width = 200;
  cropCanvas.height = 200;
  const cctx = cropCanvas.getContext("2d");

  cctx.drawImage(
    canvas,
    CROP_X, CROP_Y, CROP_SIZE, CROP_SIZE,
    0, 0, 200, 200
  );

  if (circleMaskToggle.checked) {
    cctx.globalCompositeOperation = "destination-in";
    cctx.beginPath();
    cctx.arc(100, 100, 100, 0, Math.PI * 2);
    cctx.fill();
  }

  return new Promise(resolve => {
    cropCanvas.toBlob(blob => {
      currentMember.photoBlob = blob;
      currentMember.photoChanged = true;  //set to show we have saved an image
      console.log("BLOB READY:", blob);
      alert("Photo saved (ready to upload)!");
      resolve();
    }, "image/jpeg", 0.9);
  });
}