export type TextAnimationType = "none" | "fade" | "slide" | "zoom" | "karaoke";
export type TextShadowStyle = "none" | "soft" | "gold_glow" | "dark_outline";

export type TextStyleOptions = {
  // Fonts
  arabicFont?: string; // "Amiri", "Cairo", "Scheherazade New"
  translationFont?: string; // "Cairo", "Inter", "Playfair Display"

  // Scale (0.8 to 1.5)
  arabicScale?: number;
  translationScale?: number;

  // Colors
  arabicColor?: string;
  translationColor?: string;
  highlightColor?: string;

  // Animations & Effects
  animation?: TextAnimationType;
  shadowStyle?: TextShadowStyle;
  veilOpacity?: number; // 0.2 to 0.95

  // Subtitle Box Background
  showBox?: boolean;
  boxColor?: string;

  // Visibility Toggles
  showHeader?: boolean;
  showTranslation?: boolean;
  showFooter?: boolean;
};

export type FrameData = {
  surahName: string;
  surahLatin: string;
  arabic: string;
  translation: string;
  reciter: string;
  ayahLabel: string;
  progress: number;
  ayahProgress?: number; // 0 to 1 progress within current ayah for animation effects
  styles?: TextStyleOptions;
  logoImg?: HTMLImageElement | null;
};

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrap(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    kept[maxLines - 1] = `${kept[maxLines - 1]!.slice(0, -1)}…`;
    return kept;
  }
  return lines;
}

export function drawFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  bg: HTMLImageElement | HTMLVideoElement | null,
  data: FrameData,
) {
  const styles = data.styles || {};
  const animation = styles.animation || "none";
  const ayahProgress = Math.max(0, Math.min(1, data.ayahProgress || 0));

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#04120d";
  ctx.fillRect(0, 0, width, height);

  // Background Media (Image or Video)
  if (bg) {
    if (bg instanceof HTMLImageElement && bg.complete && bg.naturalWidth) {
      const scale = Math.max(width / bg.naturalWidth, height / bg.naturalHeight);
      const w = bg.naturalWidth * scale;
      const h = bg.naturalHeight * scale;
      ctx.drawImage(bg, (width - w) / 2, (height - h) / 2, w, h);
    } else if (bg instanceof HTMLVideoElement && bg.readyState >= 2 && bg.videoWidth) {
      const scale = Math.max(width / bg.videoWidth, height / bg.videoHeight);
      const w = bg.videoWidth * scale;
      const h = bg.videoHeight * scale;
      ctx.drawImage(bg, (width - w) / 2, (height - h) / 2, w, h);
    }
  }

  // Background Veil (Darkening Overlay)
  const veilOpacity = styles.veilOpacity ?? 0.75;
  const veil = ctx.createLinearGradient(0, 0, 0, height);
  veil.addColorStop(0, `rgba(2, 16, 12, ${Math.min(0.95, veilOpacity * 1.1)})`);
  veil.addColorStop(0.5, `rgba(2, 16, 12, ${veilOpacity * 0.7})`);
  veil.addColorStop(1, `rgba(2, 16, 12, ${Math.min(0.98, veilOpacity * 1.15)})`);
  ctx.fillStyle = veil;
  ctx.fillRect(0, 0, width, height);

  const unit = Math.min(width, height) / 1080;
  const pad = width * 0.09;
  const maxWidth = width - pad * 2;
  ctx.textAlign = "center";

  // Header (Surah Title)
  if (styles.showHeader !== false) {
    ctx.fillStyle = "rgba(226, 190, 116, 0.95)";
    ctx.font = `${46 * unit}px Amiri, serif`;
    ctx.fillText(data.surahName, width / 2, height * 0.11);
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.font = `${24 * unit}px Cairo, sans-serif`;
    ctx.fillText(data.surahLatin.toUpperCase(), width / 2, height * 0.11 + 42 * unit);
  }

  // Calculate Text Sizes & Layout
  const arabicFont = styles.arabicFont || "Amiri";
  const translationFont = styles.translationFont || "Cairo";
  const arabicScale = styles.arabicScale || 1.0;
  const transScale = styles.translationScale || 1.0;

  let arabicSize = 82 * unit * arabicScale;
  let arabicLines: string[] = [];
  for (let i = 0; i < 14; i++) {
    ctx.font = `${arabicSize}px "${arabicFont}", serif`;
    arabicLines = wrap(ctx, data.arabic, maxWidth, 8);
    if (arabicLines.length <= 5) break;
    arabicSize *= 0.9;
  }
  const arabicLh = arabicSize * 1.75;

  const showTrans = styles.showTranslation !== false && Boolean(data.translation);
  const transSize = 34 * unit * transScale;
  ctx.font = `${transSize}px "${translationFont}", sans-serif`;
  const transLines = showTrans ? wrap(ctx, data.translation, maxWidth * 0.92, 6) : [];
  const transLh = transSize * 1.55;

  const blockHeight =
    arabicLines.length * arabicLh +
    (transLines.length ? transLines.length * transLh + 70 * unit : 0);

  const centerY = height / 2 - blockHeight / 2 + arabicLh * 0.75;

  // Compute Animation Transformation Parameters (CapCut Animations)
  let alpha = 1.0;
  let offsetY = 0;
  let scaleFactor = 1.0;

  if (animation === "fade") {
    // Smooth Fade In at start and Fade Out at end
    if (ayahProgress < 0.15) {
      alpha = ayahProgress / 0.15;
    } else if (ayahProgress > 0.85) {
      alpha = (1 - ayahProgress) / 0.15;
    }
  } else if (animation === "slide") {
    // Smooth Slide Up on entry
    if (ayahProgress < 0.25) {
      const p = ayahProgress / 0.25;
      offsetY = (1 - p) * 35 * unit;
      alpha = p;
    }
  } else if (animation === "zoom") {
    // Gentle pulse/zoom effect
    scaleFactor = 0.94 + Math.sin(ayahProgress * Math.PI) * 0.08;
  }

  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  ctx.translate(0, offsetY);

  // Subtitle Box Background (CapCut Box Style)
  if (styles.showBox) {
    const boxPadding = 30 * unit;
    const boxWidth = Math.min(width * 0.88, maxWidth + boxPadding * 2);
    const boxY = centerY - arabicLh * 0.8;
    const boxH = blockHeight + boxPadding * 1.5;

    ctx.fillStyle = styles.boxColor || "rgba(0, 0, 0, 0.65)";
    ctx.beginPath();
    ctx.roundRect(width / 2 - boxWidth / 2, boxY, boxWidth, boxH, 20 * unit);
    ctx.fill();
  }

  // Shadow / Glow Style Setup
  const shadowStyle = styles.shadowStyle || "soft";
  if (shadowStyle === "gold_glow") {
    ctx.shadowColor = "rgba(243, 208, 130, 0.85)";
    ctx.shadowBlur = 30 * unit;
  } else if (shadowStyle === "dark_outline") {
    ctx.shadowColor = "rgba(0, 0, 0, 0.95)";
    ctx.shadowBlur = 34 * unit;
  } else if (shadowStyle === "soft") {
    ctx.shadowColor = "rgba(0, 0, 0, 0.65)";
    ctx.shadowBlur = 24 * unit;
  } else {
    ctx.shadowBlur = 0;
  }

  // Render Arabic Text
  ctx.font = `${arabicSize * scaleFactor}px "${arabicFont}", serif`;
  ctx.fillStyle = styles.arabicColor || "#fdf8ec";

  if (animation === "karaoke") {
    // Karaoke Mode: Highlight words based on audio progress
    const words = data.arabic.split(/\s+/).filter(Boolean);
    const highlightedCount = Math.floor(words.length * ayahProgress);
    const activeWordIndex = Math.min(words.length - 1, highlightedCount);

    let y = centerY;
    for (const line of arabicLines) {
      const lineWords = line.split(/\s+/).filter(Boolean);
      // If line contains active word, draw line with highlight
      ctx.fillStyle = styles.arabicColor || "#fdf8ec";
      ctx.fillText(line, width / 2, y);

      // Accent current progress line
      if (lineWords.some((w) => words[activeWordIndex] === w)) {
        ctx.shadowColor = styles.highlightColor || "#f3d082";
        ctx.shadowBlur = 20 * unit;
        ctx.fillStyle = styles.highlightColor || "#f3d082";
        ctx.fillText(line, width / 2, y);
      }
      y += arabicLh;
    }
  } else {
    // Normal Render
    let y = centerY;
    for (const line of arabicLines) {
      ctx.fillText(line, width / 2, y);
      y += arabicLh;
    }
  }

  ctx.shadowBlur = 0;

  // Render Translation Text
  if (transLines.length) {
    const currentArabicY = centerY + arabicLines.length * arabicLh;
    let y = currentArabicY - arabicLh * 0.3;

    // Separator line
    ctx.fillStyle = "rgba(226, 190, 116, 0.4)";
    ctx.fillRect(width / 2 - 40 * unit, y, 80 * unit, 2 * unit);
    y += 32 * unit;

    ctx.font = `${transSize * scaleFactor}px "${translationFont}", sans-serif`;
    ctx.fillStyle = styles.translationColor || "rgba(255, 255, 255, 0.85)";

    if (shadowStyle !== "none") {
      ctx.shadowColor = "rgba(0, 0, 0, 0.7)";
      ctx.shadowBlur = 16 * unit;
    }

    for (const line of transLines) {
      ctx.fillText(line, width / 2, y);
      y += transLh;
    }
  }

  ctx.restore();

  // Footer (Progress Bar & Ayah Label)
  const barY = height - height * 0.065;

  if (styles.showFooter !== false) {
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.fillRect(pad, barY, maxWidth, 4 * unit);
    ctx.fillStyle = "#e2be74";
    ctx.fillRect(pad, barY, maxWidth * Math.min(Math.max(data.progress, 0), 1), 4 * unit);

    ctx.font = `${22 * unit}px Cairo, sans-serif`;
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.fillText(data.reciter, pad, barY - 18 * unit);
    ctx.textAlign = "right";
    ctx.fillStyle = "rgba(226, 190, 116, 0.9)";
    ctx.fillText(data.ayahLabel, width - pad, barY - 18 * unit);
  }

  // Watermark — Centered below the progress bar ("en dessous de la barre")
  ctx.save();

  const arabicFontStr = `bold ${15 * unit}px Amiri, serif`;
  const latinFontStr = `600 ${11 * unit}px Inter, sans-serif`;

  ctx.font = arabicFontStr;
  const arabicW = ctx.measureText("تلاوة").width;

  ctx.font = latinFontStr;
  const latinW = ctx.measureText("Tilawa Studio").width;

  const iconSize = 18 * unit;
  const iconGap = 7 * unit;
  const wordGap = 7 * unit;
  const innerPadX = 12 * unit;

  const totalContentW = iconSize + iconGap + arabicW + wordGap + latinW;
  const wmW = totalContentW + innerPadX * 2;
  const wmH = 30 * unit;
  const wmX = (width - wmW) / 2;
  const wmY = styles.showFooter !== false ? barY + 10 * unit : height - 42 * unit;

  // Snug Capsule Background
  ctx.fillStyle = "rgba(4, 18, 13, 0.75)";
  roundRect(ctx, wmX, wmY, wmW, wmH, wmH / 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(243, 208, 130, 0.5)";
  ctx.lineWidth = 1.2 * unit;
  ctx.stroke();

  let curX = wmX + innerPadX;
  const iconY = wmY + (wmH - iconSize) / 2;

  const logoImg = data.logoImg;
  if (logoImg && logoImg.complete && logoImg.naturalWidth) {
    ctx.drawImage(logoImg, curX, iconY, iconSize, iconSize);
  } else {
    // Vector Fallback Crescent Icon
    ctx.fillStyle = "#f3d082";
    ctx.beginPath();
    ctx.arc(curX + iconSize * 0.45, iconY + iconSize * 0.5, iconSize * 0.42, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(4, 18, 13, 0.75)";
    ctx.beginPath();
    ctx.arc(curX + iconSize * 0.58, iconY + iconSize * 0.42, iconSize * 0.35, 0, Math.PI * 2);
    ctx.fill();
  }

  curX += iconSize + iconGap;

  // Calligraphy "تلاوة"
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.font = arabicFontStr;
  ctx.fillStyle = "#f3d082";
  ctx.fillText("تلاوة", curX, wmY + wmH / 2);

  curX += arabicW + wordGap;

  // Brand "Tilawa Studio"
  ctx.font = latinFontStr;
  ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
  ctx.fillText("Tilawa Studio", curX, wmY + wmH / 2);

  ctx.restore();
}
