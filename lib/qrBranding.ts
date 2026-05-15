import QRCode from 'qrcode';

const DEFAULT_LOGO_SRC = '/logo.png';
const BADGE_LOGO_SRC = '/moni-logo-transparent.png';
const MONI_DARK = '#050A10';
const MONI_CARD = '#0D1B2A';
const MONI_ACCENT = '#00F5D4';

interface BrandedQRCodeOptions {
  width?: number;
  margin?: number;
  darkColor?: string;
  lightColor?: string;
  logoSrc?: string;
  logoScale?: number;
}

interface PaymentBadgeOptions {
  canvas: HTMLCanvasElement;
  paymentLink: string;
  merchantName: string;
  moniNumber: string;
  amountLabel?: string;
  note?: string;
  logoSrc?: string;
}

const roundedRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) => {
  const r = Math.min(radius, width / 2, height / 2);

  const nativeRoundRect = (ctx as CanvasRenderingContext2D & {
    roundRect?: (x: number, y: number, width: number, height: number, radius: number) => void;
  }).roundRect;

  if (typeof nativeRoundRect === 'function') {
    ctx.beginPath();
    nativeRoundRect.call(ctx, x, y, width, height, r);
    return;
  }

  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
};

const fillRoundedRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fillStyle: string | CanvasGradient
) => {
  roundedRect(ctx, x, y, width, height, radius);
  ctx.fillStyle = fillStyle;
  ctx.fill();
};

const strokeRoundedRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  strokeStyle: string,
  lineWidth = 2
) => {
  roundedRect(ctx, x, y, width, height, radius);
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
};

const loadImage = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
  const image = new Image();
  image.onload = () => resolve(image);
  image.onerror = () => reject(new Error(`Image introuvable: ${src}`));
  image.src = src;
});

const drawImageContain = (
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement | HTMLCanvasElement,
  x: number,
  y: number,
  width: number,
  height: number
) => {
  const imageWidth = image instanceof HTMLCanvasElement ? image.width : image.naturalWidth;
  const imageHeight = image instanceof HTMLCanvasElement ? image.height : image.naturalHeight;
  const scale = Math.min(width / imageWidth, height / imageHeight);
  const drawWidth = imageWidth * scale;
  const drawHeight = imageHeight * scale;
  const drawX = x + (width - drawWidth) / 2;
  const drawY = y + (height - drawHeight) / 2;
  ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
};

const drawFittedText = (
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  fontSize: number,
  minFontSize: number,
  weight: number | string,
  color: string,
  align: CanvasTextAlign = 'center'
) => {
  let size = fontSize;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;

  do {
    ctx.font = `${weight} ${size}px Inter, Arial, sans-serif`;
    if (ctx.measureText(text).width <= maxWidth || size <= minFontSize) break;
    size -= 2;
  } while (size > minFontSize);

  ctx.fillText(text, x, y);
  return size;
};

const shortenLink = (link: string) => {
  const clean = link.replace(/^https?:\/\//, '');
  if (clean.length <= 54) return clean;
  return `${clean.slice(0, 27)}...${clean.slice(-18)}`;
};

export const renderBrandedQRCodeToCanvas = async (
  canvas: HTMLCanvasElement,
  value: string,
  options: BrandedQRCodeOptions = {}
) => {
  const {
    width = 300,
    margin = 2,
    darkColor = MONI_DARK,
    lightColor = '#FFFFFF',
    logoSrc = DEFAULT_LOGO_SRC,
    logoScale = 0.22,
  } = options;

  await new Promise<void>((resolve, reject) => {
    QRCode.toCanvas(
      canvas,
      value,
      {
        errorCorrectionLevel: 'H',
        margin,
        width,
        color: {
          dark: darkColor,
          light: lightColor,
        },
      },
      (error) => {
        if (error) reject(error);
        else resolve();
      }
    );
  });

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  try {
    const logo = await loadImage(logoSrc);
    const logoBoxSize = Math.round(width * logoScale);
    const logoPadding = Math.round(logoBoxSize * 0.18);
    const logoX = (canvas.width - logoBoxSize) / 2;
    const logoY = (canvas.height - logoBoxSize) / 2;

    ctx.save();
    ctx.shadowColor = 'rgba(5, 10, 16, 0.18)';
    ctx.shadowBlur = Math.round(width * 0.025);
    ctx.shadowOffsetY = Math.round(width * 0.01);
    fillRoundedRect(ctx, logoX, logoY, logoBoxSize, logoBoxSize, Math.round(logoBoxSize * 0.24), '#FFFFFF');
    ctx.restore();

    roundedRect(ctx, logoX + logoPadding, logoY + logoPadding, logoBoxSize - logoPadding * 2, logoBoxSize - logoPadding * 2, Math.round(logoBoxSize * 0.18));
    ctx.save();
    ctx.clip();
    drawImageContain(ctx, logo, logoX + logoPadding, logoY + logoPadding, logoBoxSize - logoPadding * 2, logoBoxSize - logoPadding * 2);
    ctx.restore();
  } catch (error) {
    console.warn('Logo QR indisponible:', error);
  }
};

export const generateBrandedQRCodeDataURL = async (
  value: string,
  options: BrandedQRCodeOptions = {}
) => {
  if (typeof document === 'undefined') {
    return QRCode.toDataURL(value, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      quality: 0.95,
      margin: options.margin ?? 2,
      width: options.width ?? 300,
      color: {
        dark: options.darkColor ?? MONI_DARK,
        light: options.lightColor ?? '#FFFFFF',
      },
    });
  }

  const canvas = document.createElement('canvas');
  await renderBrandedQRCodeToCanvas(canvas, value, options);
  return canvas.toDataURL('image/png');
};

export const renderPaymentBadgeToCanvas = async ({
  canvas,
  paymentLink,
  merchantName,
  moniNumber,
  amountLabel,
  note,
  logoSrc = BADGE_LOGO_SRC,
}: PaymentBadgeOptions) => {
  const width = 1080;
  const height = 1440;
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const background = ctx.createLinearGradient(0, 0, width, height);
  background.addColorStop(0, '#081421');
  background.addColorStop(0.48, MONI_DARK);
  background.addColorStop(1, '#062E35');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.translate(-130, 208);
  ctx.rotate(-0.11);
  fillRoundedRect(ctx, 0, 0, 1320, 150, 75, 'rgba(0, 245, 212, 0.12)');
  ctx.restore();

  ctx.save();
  ctx.translate(690, 1260);
  ctx.rotate(-0.18);
  fillRoundedRect(ctx, 0, 0, 520, 84, 42, 'rgba(255, 255, 255, 0.08)');
  ctx.restore();

  const logo = await loadImage(logoSrc).catch(() => null);

  if (logo) {
    drawImageContain(ctx, logo, 72, 70, 250, 84);
  } else {
    drawFittedText(ctx, 'Moni.io', 72, 104, 250, 44, 28, 800, MONI_ACCENT, 'left');
  }

  drawFittedText(ctx, 'Votre argent, partout en Afrique', 72, 166, 520, 25, 18, 600, 'rgba(255,255,255,0.70)', 'left');
  fillRoundedRect(ctx, 790, 82, 218, 58, 29, 'rgba(0, 245, 212, 0.16)');
  drawFittedText(ctx, 'PAIEMENT', 899, 112, 160, 25, 18, 800, MONI_ACCENT);

  drawFittedText(ctx, 'Scannez et payez', width / 2, 272, 900, 74, 48, 900, '#FFFFFF');
  drawFittedText(ctx, 'avec Moni', width / 2, 348, 760, 68, 44, 900, MONI_ACCENT);

  fillRoundedRect(ctx, 88, 422, 904, 150, 34, 'rgba(13, 27, 42, 0.92)');
  strokeRoundedRect(ctx, 88, 422, 904, 150, 34, 'rgba(0, 245, 212, 0.28)', 2);
  drawFittedText(ctx, merchantName || 'Marchand Moni', width / 2, 468, 780, 45, 26, 800, '#FFFFFF');
  drawFittedText(ctx, moniNumber, width / 2, 524, 560, 32, 22, 800, MONI_ACCENT);

  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.34)';
  ctx.shadowBlur = 36;
  ctx.shadowOffsetY = 18;
  fillRoundedRect(ctx, 164, 622, 752, 632, 46, '#FFFFFF');
  ctx.restore();

  const qrCanvas = document.createElement('canvas');
  await renderBrandedQRCodeToCanvas(qrCanvas, paymentLink, {
    width: 520,
    margin: 2,
    logoSrc,
    logoScale: 0.2,
  });
  ctx.drawImage(qrCanvas, 280, 680, 520, 520);

  fillRoundedRect(ctx, 255, 598, 570, 58, 29, MONI_ACCENT);
  drawFittedText(ctx, 'SCANNEZ ET PAYEZ AVEC MONI', width / 2, 628, 470, 26, 18, 900, MONI_DARK);

  if (amountLabel) {
    fillRoundedRect(ctx, 342, 1186, 396, 54, 27, 'rgba(5, 10, 16, 0.08)');
    drawFittedText(ctx, `Montant: ${amountLabel}`, width / 2, 1214, 340, 26, 18, 800, MONI_DARK);
  }

  if (note?.trim()) {
    drawFittedText(ctx, note.trim(), width / 2, 1288, 760, 28, 18, 700, 'rgba(255,255,255,0.78)');
  }

  const chipY = 1320;
  const chips = ['Scannez', 'Confirmez', 'Payez'];
  chips.forEach((chip, index) => {
    const x = 128 + index * 280;
    fillRoundedRect(ctx, x, chipY, 236, 58, 29, index === 1 ? 'rgba(0, 245, 212, 0.18)' : 'rgba(255,255,255,0.10)');
    drawFittedText(ctx, chip, x + 118, chipY + 30, 184, 24, 18, 800, index === 1 ? MONI_ACCENT : '#FFFFFF');
  });

  drawFittedText(ctx, shortenLink(paymentLink), width / 2, 1404, 840, 22, 16, 600, 'rgba(255,255,255,0.54)');
};
