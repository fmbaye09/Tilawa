import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  BookOpen,
  Layers,
  Film,
  Search,
  Check,
  ChevronRight,
  ArrowLeft,
  ArrowRight,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Download,
  Video,
  Sparkles,
  SlidersHorizontal,
  Star,
  CheckSquare,
  Square,
  Sun,
  Moon,
  Volume2,
  Upload,
  Camera,
  Trash2,
  Clock,
  Wand2,
  Type,
  Palette,
  Eye,
  X,
  Link,
  FileText,
} from "lucide-react";

import bgMosque from "../assets/bg-mosque.jpg";
import bgDesert from "../assets/bg-desert.jpg";
import bgPattern from "../assets/bg-pattern.jpg";
import { LOCAL_FOLDER_BACKGROUNDS } from "../lib/backgrounds.gen";
import { fetchGithubBackgrounds } from "../lib/github-backgrounds";
import {
  drawFrame,
  type FrameData,
  type TextAnimationType,
  type TextShadowStyle,
} from "../lib/frame";
import {
  fetchRecitation,
  fetchSurahs,
  RECITERS,
  TRANSLATIONS,
  FAMOUS_SUGGESTIONS,
  QURANIC_DUAS,
  type VerseSuggestion,
  type QuranicDua,
} from "../lib/quran";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tilawa Studio — Générateur de vidéos de récitation du Coran" },
      {
        name: "description",
        content:
          "Choisissez une sourate, un récitateur et un décor, puis générez une vidéo de récitation du Coran avec le texte arabe et sa traduction.",
      },
      { property: "og:title", content: "Tilawa Studio — Vidéos de récitation du Coran" },
      {
        property: "og:description",
        content:
          "Générez gratuitement des vidéos de récitation du Coran : sourates, récitateurs et traductions synchronisés.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StudioApp,
});

type GeneratedVideo = {
  id: string;
  url: string;
  fileName: string;
  surahName: string;
  createdAt: string;
  duration: number;
};

const VIDEO_DB_NAME = "tilawa-studio-db";
const VIDEO_STORE_NAME = "generated-videos";

function openVideoDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(VIDEO_DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(VIDEO_STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveVideoBlob(id: string, blob: Blob): Promise<void> {
  const db = await openVideoDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(VIDEO_STORE_NAME, "readwrite");
    transaction.objectStore(VIDEO_STORE_NAME).put(blob, id);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  db.close();
}

async function loadVideoBlob(id: string): Promise<Blob | null> {
  const db = await openVideoDatabase();
  const blob = await new Promise<Blob | null>((resolve, reject) => {
    const request = db
      .transaction(VIDEO_STORE_NAME, "readonly")
      .objectStore(VIDEO_STORE_NAME)
      .get(id);
    request.onsuccess = () => resolve((request.result as Blob | undefined) ?? null);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return blob;
}

async function deleteVideoBlob(id: string): Promise<void> {
  const db = await openVideoDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(VIDEO_STORE_NAME, "readwrite");
    transaction.objectStore(VIDEO_STORE_NAME).delete(id);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  db.close();
}

export type BackgroundItem = {
  id: string;
  label: string;
  type: "image" | "video";
  src: string;
  isCustom?: boolean;
};

const PRESET_BACKGROUNDS: BackgroundItem[] = [
  // Photos
  { id: "mosque", label: "Mosquée", type: "image", src: bgMosque },
  { id: "desert", label: "Dunes", type: "image", src: bgDesert },
  { id: "pattern", label: "Motif", type: "image", src: bgPattern },
  {
    id: "stars_photo",
    label: "Ciel Étoilé",
    type: "image",
    src: "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?q=80&w=1000",
  },
  // Vidéos — clips externes sélectionnés sur Mixkit
  {
    id: "dark_starry_night_mixkit",
    label: "Nuit étoilée sombre",
    type: "video",
    src: "https://video-previews.elements.envatousercontent.com/files/75b5334d-16d7-4609-bf2f-c1ccfa904cbe/video_preview_h264.mp4",
  },
  {
    id: "starry_skyline_mixkit",
    label: "Ciel étoilé panoramique",
    type: "video",
    src: "https://video-previews.elements.envatousercontent.com/files/061809af-066e-4598-a3ed-14dc0a123e1c/video_preview_h264.mp4",
  },
  {
    id: "starry_sky_video",
    label: "Nuit Étoilée",
    type: "video",
    src: "https://assets.mixkit.co/videos/preview/mixkit-starry-night-sky-over-a-mountain-range-40742-large.mp4",
  },
  {
    id: "clouds_video",
    label: "Ciel & Nuages",
    type: "video",
    src: "https://assets.mixkit.co/videos/preview/mixkit-clouds-and-blue-sky-2408-large.mp4",
  },
  {
    id: "waves_video",
    label: "Vagues & Mer",
    type: "video",
    src: "https://assets.mixkit.co/videos/preview/mixkit-waves-in-the-water-1164-large.mp4",
  },
  {
    id: "cloudinary_video_1",
    label: "Décor Cloudinary 1",
    type: "video",
    src: "https://res.cloudinary.com/p9sc3kd4/video/upload/v1787473056/Pinterest_video_1337074889534215_1337074889534215.mp4",
  },
  ...LOCAL_FOLDER_BACKGROUNDS,
];

const RATIOS = [
  { id: "9:16", label: "Vertical 9:16", w: 1080, h: 1920 },
  { id: "1:1", label: "Carré 1:1", w: 1080, h: 1080 },
  { id: "16:9", label: "Paysage 16:9", w: 1920, h: 1080 },
];

function formatDuration(seconds: number): string {
  if (!seconds || isNaN(seconds) || seconds <= 0) return "0s";
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  if (mins > 0) {
    return `${mins} min ${secs < 10 ? "0" : ""}${secs} s`;
  }
  return `${secs} s`;
}

function StudioApp() {
  // Navigation & Step state
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Theme state (Default light mode, toggleable)
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== "undefined") {
      return (
        localStorage.getItem("theme") === "dark" ||
        document.documentElement.classList.contains("dark")
      );
    }
    return false;
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDark]);

  // Revenir en haut lorsque l’utilisateur arrive sur l’étape des versets,
  // notamment après avoir sélectionné une sourate située en bas de la liste.
  useEffect(() => {
    if (step === 2) {
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [step]);

  // Step 1 states
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "Meccan" | "Medinan">("all");

  // Selection states
  const [surahNumber, setSurahNumber] = useState(1);
  const [reciter, setReciter] = useState(RECITERS[0]!.id);
  const [translation, setTranslation] = useState<string>("fr.hamidullah");
  const [ratio, setRatio] = useState("9:16");

  // Background states (Presets & Custom Uploads)
  const [backgroundList, setBackgroundList] = useState<BackgroundItem[]>(PRESET_BACKGROUNDS);
  const [selectedBgId, setSelectedBgId] = useState<string>("mosque");
  const [bgTab, setBgTab] = useState<"all" | "image" | "video" | "custom">("all");

  const bgMediaElementRef = useRef<HTMLImageElement | HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Verse Selection via Checkboxes
  const [selectedAyahs, setSelectedAyahs] = useState<number[]>([1, 2, 3, 4, 5, 6, 7]);

  // Audio preview for individual verses in Step 2
  const [previewingAudioUrl, setPreviewingAudioUrl] = useState<string | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  // CapCut Text & Visual Customization States
  const [sidebarTab, setSidebarTab] = useState<"anim" | "typo" | "style" | "media">("anim");

  const [arabicFont, setArabicFont] = useState<string>("Amiri");
  const [translationFont, setTranslationFont] = useState<string>("Cairo");
  const [arabicScale, setArabicScale] = useState<number>(1.0);
  const [translationScale, setTranslationScale] = useState<number>(1.0);

  const [arabicColor, setArabicColor] = useState<string>("#fdf8ec");
  const [translationColor, setTranslationColor] = useState<string>("rgba(255, 255, 255, 0.85)");
  const [highlightColor, setHighlightColor] = useState<string>("#f3d082");

  const [animation, setAnimation] = useState<TextAnimationType>("fade");
  const [shadowStyle, setShadowStyle] = useState<TextShadowStyle>("soft");
  const [veilOpacity, setVeilOpacity] = useState<number>(0.75);

  const [showBox, setShowBox] = useState<boolean>(false);
  const [boxColor, setBoxColor] = useState<string>("rgba(0, 0, 0, 0.65)");

  const [showHeader, setShowHeader] = useState<boolean>(true);
  const [showTranslation, setShowTranslation] = useState<boolean>(true);
  const [showFooter, setShowFooter] = useState<boolean>(true);

  // Player / Canvas / Recorder states for Step 3
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [recording, setRecording] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [generatedVideos, setGeneratedVideos] = useState<GeneratedVideo[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const saved = localStorage.getItem("tilawa-generated-video-history");
      if (!saved) return [];
      const history = JSON.parse(saved) as Omit<GeneratedVideo, "url">[];
      return history.map((video) => ({ ...video, url: "" }));
    } catch {
      localStorage.removeItem("tilawa-generated-video-history");
      return [];
    }
  });

  useEffect(() => {
    const history = generatedVideos.map(({ url: _url, ...video }) => video);
    localStorage.setItem("tilawa-generated-video-history", JSON.stringify(history.slice(0, 12)));
  }, [generatedVideos]);

  useEffect(() => {
    generatedVideos.forEach((video) => {
      if (!video.url) {
        void loadVideoBlob(video.id).then((blob) => {
          if (!blob) return;
          setGeneratedVideos((currentVideos) =>
            currentVideos.map((current) =>
              current.id === video.id ? { ...current, url: URL.createObjectURL(blob) } : current,
            ),
          );
        });
      }
    });
  }, [generatedVideos]);

  // Audio Duration Tracking
  const [ayahDurations, setAyahDurations] = useState<Record<string, number>>({});

  // Queries
  const surahs = useQuery({ queryKey: ["surahs"], queryFn: fetchSurahs, staleTime: Infinity });
  const recitation = useQuery({
    queryKey: ["recitation", surahNumber, reciter, translation],
    queryFn: () => fetchRecitation(surahNumber, reciter, translation),
    staleTime: Infinity,
  });

  const githubBackgrounds = useQuery({
    queryKey: ["github-backgrounds"],
    queryFn: fetchGithubBackgrounds,
    staleTime: 1000 * 60 * 5,
  });

  // Automatically merge GitHub background videos from https://github.com/fmbaye09/Tilawa-videos
  useEffect(() => {
    if (githubBackgrounds.data && githubBackgrounds.data.length > 0) {
      setBackgroundList((prevList) => {
        const existingSrcs = new Set(prevList.map((item) => item.src));
        const newFromGithub = githubBackgrounds.data!.filter((item) => !existingSrcs.has(item.src));
        if (newFromGithub.length === 0) return prevList;
        return [...newFromGithub, ...prevList];
      });
    }
  }, [githubBackgrounds.data]);

  const selectedSurah = useMemo(() => {
    return surahs.data?.find((s) => s.number === surahNumber) ?? null;
  }, [surahs.data, surahNumber]);

  const maxAyah = selectedSurah?.numberOfAyahs ?? 7;

  // Filter ayahs to only include those checked by user
  const ayahs = useMemo(() => {
    const all = recitation.data?.ayahs ?? [];
    return all
      .filter((a) => selectedAyahs.includes(a.numberInSurah))
      .sort((a, b) => a.numberInSurah - b.numberInSurah);
  }, [recitation.data, selectedAyahs]);

  // Fetch audio durations for selected ayahs
  useEffect(() => {
    if (!ayahs.length) return;
    ayahs.forEach((ayah) => {
      if (ayahDurations[ayah.audio]) return;
      const a = new Audio();
      a.crossOrigin = "anonymous";
      a.src = ayah.audio;
      a.onloadedmetadata = () => {
        if (a.duration && !isNaN(a.duration)) {
          setAyahDurations((prev) => ({ ...prev, [ayah.audio]: a.duration }));
        }
      };
    });
  }, [ayahs, ayahDurations]);

  // Total Video Duration Calculation
  const totalVideoDuration = useMemo(() => {
    let knownSum = 0;
    let unknownCount = 0;
    ayahs.forEach((ayah) => {
      if (ayahDurations[ayah.audio]) {
        knownSum += ayahDurations[ayah.audio];
      } else {
        unknownCount++;
      }
    });
    return knownSum + unknownCount * 8;
  }, [ayahs, ayahDurations]);

  const current = ayahs[index];
  const preset = RATIOS.find((r) => r.id === ratio)!;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const frameRef = useRef<FrameData>({
    surahName: "",
    surahLatin: "",
    arabic: "",
    translation: "",
    reciter: "",
    ayahLabel: "",
    progress: 0,
    ayahProgress: 0,
  });
  const recorderRef = useRef<MediaRecorder | null>(null);
  const audioGraphRef = useRef<{ ctx: AudioContext; dest: MediaStreamAudioDestinationNode } | null>(
    null,
  );

  // Background Loader Effect
  useEffect(() => {
    const item = backgroundList.find((b) => b.id === selectedBgId) || backgroundList[0];
    if (!item) return;

    if (bgMediaElementRef.current instanceof HTMLVideoElement) {
      bgMediaElementRef.current.pause();
      bgMediaElementRef.current.src = "";
      bgMediaElementRef.current.load();
    }
    bgMediaElementRef.current = null;

    if (item.type === "image") {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = item.src;
      img.onload = () => {
        bgMediaElementRef.current = img;
      };
    } else if (item.type === "video") {
      const video = document.createElement("video");
      video.crossOrigin = "anonymous";
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.src = item.src;
      void video.play().catch(() => {});
      bgMediaElementRef.current = video;
    }
  }, [selectedBgId, backgroundList]);

  // Handle custom image/video file upload (supports multiple selection by lot)
  const handleCustomMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const newItems: BackgroundItem[] = [];
    files.forEach((file, index) => {
      const isVideo = file.type.startsWith("video/");
      const isImage = file.type.startsWith("image/");
      if (!isVideo && !isImage) return;

      const objectUrl = URL.createObjectURL(file);
      newItems.push({
        id: `custom_${Date.now()}_${index}`,
        label: file.name.length > 14 ? `${file.name.slice(0, 12)}…` : file.name,
        type: isVideo ? "video" : "image",
        src: objectUrl,
        isCustom: true,
      });
    });

    if (newItems.length > 0) {
      setBackgroundList((prev) => [...newItems, ...prev]);
      setSelectedBgId(newItems[0].id);
      setBgTab("custom");
      toast.success(`${newItems.length} fichier(s) média importé(s) !`);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Remove custom media item
  const handleRemoveCustomMedia = (idToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setBackgroundList((prev) => prev.filter((item) => item.id !== idToRemove));
    if (selectedBgId === idToRemove) {
      setSelectedBgId("mosque");
    }
  };

  // Filtered background items based on active category tab
  const filteredBackgrounds = useMemo(() => {
    if (bgTab === "image") return backgroundList.filter((b) => b.type === "image");
    if (bgTab === "video") return backgroundList.filter((b) => b.type === "video");
    if (bgTab === "custom") return backgroundList.filter((b) => b.isCustom);
    return backgroundList;
  }, [backgroundList, bgTab]);

  // Stop verse preview when step changes
  useEffect(() => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
    }
    setPreviewingAudioUrl(null);
  }, [step, surahNumber, reciter]);

  // Handle individual verse audio preview play/pause
  const handleToggleVersePreview = (e: React.MouseEvent, audioUrl: string) => {
    e.stopPropagation();
    if (previewingAudioUrl === audioUrl) {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
      }
      setPreviewingAudioUrl(null);
    } else {
      if (previewAudioRef.current) {
        previewAudioRef.current.src = audioUrl;
        void previewAudioRef.current.play().catch(() => setPreviewingAudioUrl(null));
        setPreviewingAudioUrl(audioUrl);
      }
    }
  };

  // Select Surah
  const handleSelectSurah = (sNumber: number) => {
    setSurahNumber(sNumber);
    const s = surahs.data?.find((item) => item.number === sNumber);
    const count = s?.numberOfAyahs ?? 7;
    const initial = Array.from({ length: Math.min(count, 7) }, (_, i) => i + 1);
    setSelectedAyahs(initial);
    setIndex(0);
    setStep(2);
  };

  // Helper to select a continuous range
  const selectRange = (from: number, to: number) => {
    const range: number[] = [];
    for (let i = from; i <= to; i++) {
      range.push(i);
    }
    setSelectedAyahs(range);
    setIndex(0);
  };

  // Handle Dua selection
  const handleSelectDua = (dua: QuranicDua) => {
    setSurahNumber(dua.surahNumber);
    selectRange(dua.ayahFrom, dua.ayahTo);
    setStep(2);
  };

  // Toggle single ayah checkbox
  const toggleAyah = (ayahNum: number) => {
    setSelectedAyahs((prev) => {
      if (prev.includes(ayahNum)) {
        return prev.filter((n) => n !== ayahNum);
      }
      return [...prev, ayahNum].sort((a, b) => a - b);
    });
    setIndex(0);
  };

  // Select all verses in surah
  const selectAll = () => {
    const total = recitation.data?.ayahs.length ?? maxAyah;
    const all = Array.from({ length: total }, (_, i) => i + 1);
    setSelectedAyahs(all);
    setIndex(0);
  };

  // Deselect all verses
  const deselectAll = () => {
    setSelectedAyahs([]);
    setIndex(0);
  };

  // Keep frame data fresh for canvas rendering
  useEffect(() => {
    frameRef.current = {
      surahName: recitation.data?.surah.name ?? "",
      surahLatin: recitation.data
        ? `Sourate ${recitation.data.surah.number} · ${recitation.data.surah.englishName}`
        : "",
      arabic: current?.arabic ?? "",
      translation: current?.translation ?? "",
      reciter: RECITERS.find((r) => r.id === reciter)?.name ?? "",
      ayahLabel: current ? `آية ${current.numberInSurah}` : "",
      progress: frameRef.current.progress,
      ayahProgress: frameRef.current.ayahProgress,
      styles: {
        arabicFont,
        translationFont,
        arabicScale,
        translationScale,
        arabicColor,
        translationColor,
        highlightColor,
        animation,
        shadowStyle,
        veilOpacity,
        showBox,
        boxColor,
        showHeader,
        showTranslation,
        showFooter,
      },
    };
  }, [
    recitation.data,
    current,
    reciter,
    arabicFont,
    translationFont,
    arabicScale,
    translationScale,
    arabicColor,
    translationColor,
    highlightColor,
    animation,
    shadowStyle,
    veilOpacity,
    showBox,
    boxColor,
    showHeader,
    showTranslation,
    showFooter,
  ]);

  // Canvas render loop
  useEffect(() => {
    if (step !== 3) return;
    let raf = 0;
    const loop = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (canvas && ctx) {
        const audio = audioRef.current;
        const ratioDone = audio && audio.duration ? audio.currentTime / audio.duration : 0;
        const total = ayahs.length || 1;
        frameRef.current.progress = (index + ratioDone) / total;
        frameRef.current.ayahProgress = ratioDone;
        drawFrame(ctx, canvas.width, canvas.height, bgMediaElementRef.current, frameRef.current);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [index, ayahs.length, step]);

  // Audio playback controller
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !current || step !== 3) return;
    if (audio.src !== current.audio) audio.src = current.audio;
    if (playing) void audio.play().catch(() => setPlaying(false));
    else audio.pause();
  }, [current, playing, step]);

  const stopRecorder = useCallback(() => {
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
    }
  }, []);

  const handleEnded = () => {
    if (index < ayahs.length - 1) {
      setIndex((i) => i + 1);
    } else {
      setPlaying(false);
      setIndex(0);
      if (recording) {
        stopRecorder();
        setRecording(false);
      }
    }
  };

  const startRecording = async () => {
    const canvas = canvasRef.current;
    const audio = audioRef.current;
    if (!canvas || !audio || !ayahs.length) return;
    setDownloadUrl(null);

    if (!audioGraphRef.current) {
      const ctx = new AudioContext();
      const source = ctx.createMediaElementSource(audio);
      const dest = ctx.createMediaStreamDestination();
      source.connect(dest);
      source.connect(ctx.destination);
      audioGraphRef.current = { ctx, dest };
    }
    await audioGraphRef.current.ctx.resume();

    const stream = canvas.captureStream(30);
    for (const track of audioGraphRef.current.dest.stream.getAudioTracks()) {
      stream.addTrack(track);
    }
    const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
      ? "video/webm;codecs=vp9,opus"
      : "video/webm";
    const recorder = new MediaRecorder(stream, { mimeType: mime });
    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size) chunks.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: "video/webm" });
      const videoId = `video_${Date.now()}`;
      const fileName = `tilawa-sourate-${surahNumber}-${new Date().toISOString().slice(0, 10)}.webm`;
      const videoUrl = URL.createObjectURL(blob);
      const generatedVideo: GeneratedVideo = {
        id: videoId,
        url: videoUrl,
        fileName,
        surahName: selectedSurah?.englishName ?? `Sourate ${surahNumber}`,
        createdAt: new Date().toISOString(),
        duration: totalVideoDuration,
      };

      setDownloadUrl(videoUrl);
      setGeneratedVideos((videos) =>
        [generatedVideo, ...videos.filter((video) => video.id !== videoId)].slice(0, 12),
      );
      void saveVideoBlob(videoId, blob).catch(() => {
        toast.error("La vidéo est prête, mais n’a pas pu être conservée dans l’historique local.");
      });
      toast.success("Vidéo terminée", {
        description: "Votre vidéo est prête à être téléchargée.",
        action: {
          label: "Télécharger",
          onClick: () => {
            const link = document.createElement("a");
            link.href = videoUrl;
            link.download = fileName;
            link.click();
          },
        },
      });
    };
    recorderRef.current = recorder;
    recorder.start();

    setIndex(0);
    setRecording(true);
    setPlaying(true);
  };

  const cancelRecording = () => {
    stopRecorder();
    setRecording(false);
    setPlaying(false);
  };

  // Filtered surahs for Step 1
  const filteredSurahs = useMemo(() => {
    const list = surahs.data ?? [];
    return list.filter((s) => {
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !query ||
        s.englishName.toLowerCase().includes(query) ||
        s.name.includes(query) ||
        s.englishNameTranslation.toLowerCase().includes(query) ||
        s.number.toString() === query;
      const matchesFilter = filterType === "all" || s.revelationType === filterType;
      return matchesSearch && matchesFilter;
    });
  }, [surahs.data, searchQuery, filterType]);

  // Famous suggestions
  const famousSuggestions = useMemo(() => {
    const specific = FAMOUS_SUGGESTIONS[surahNumber];
    if (specific && specific.length > 0) return specific;

    const list: VerseSuggestion[] = [
      { label: `Toute la sourate (v. 1-${maxAyah})`, from: 1, to: maxAyah },
    ];
    if (maxAyah >= 5) {
      list.push({ label: "5 premiers versets (v. 1-5)", from: 1, to: 5 });
    }
    if (maxAyah >= 10) {
      list.push({ label: "10 premiers versets (v. 1-10)", from: 1, to: 10 });
    }
    return list;
  }, [surahNumber, maxAyah]);

  const popularSuggestions = useMemo(
    () =>
      Object.entries(FAMOUS_SUGGESTIONS)
        .flatMap(([number, suggestions]) =>
          suggestions.map((suggestion) => ({ ...suggestion, surahNumber: Number(number) })),
        )
        .slice(0, 8),
    [],
  );

  const handlePopularSuggestion = (suggestion: (typeof popularSuggestions)[number]) => {
    setSurahNumber(suggestion.surahNumber);
    setSelectedAyahs(
      Array.from(
        { length: suggestion.to - suggestion.from + 1 },
        (_, index) => suggestion.from + index,
      ),
    );
    setIndex(0);
    setStep(2);
  };

  return (
    <main className="min-h-screen bg-background text-foreground pb-16">
      {/* Background Glow */}
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,color-mix(in_oklab,var(--color-primary)_20%,transparent),transparent_65%)]" />

      <div className="relative mx-auto max-w-6xl px-3 py-5 sm:px-6 sm:py-10">
        {/* Header Bar */}
        <header className="mb-6 flex flex-col items-center justify-between gap-3 sm:mb-8 sm:gap-4 sm:flex-row">
          <div className="text-center sm:text-left">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 backdrop-blur-md">
              <span className="font-arabic text-xl font-bold text-primary">تلاوة</span>
              <span className="text-xs font-semibold uppercase tracking-widest text-primary/90">
                Tilawa Studio
              </span>
            </div>
            <h1 className="mt-2 max-w-[20rem] text-center text-xl font-extrabold leading-tight tracking-tight sm:max-w-none sm:text-left sm:text-3xl">
              Créez vos vidéos de récitation du Coran
            </h1>
          </div>

          {/* Dark / Light Theme Toggle Button */}
          <button
            type="button"
            onClick={() => setIsDark((prev) => !prev)}
            aria-label="Basculer le thème"
            className="flex items-center gap-2 rounded-full border border-border/80 bg-card/80 px-4 py-2 text-xs font-semibold text-foreground shadow-sm backdrop-blur-md transition hover:border-primary/40 hover:bg-accent"
          >
            {isDark ? (
              <>
                <Sun className="h-4 w-4 text-amber-400" />
                <span>Mode Clair</span>
              </>
            ) : (
              <>
                <Moon className="h-4 w-4 text-primary" />
                <span>Mode Sombre</span>
              </>
            )}
          </button>
        </header>

        {/* Stepper Navigation */}
        <nav aria-label="Progression du studio" className="mb-6 sm:mb-10">
          <div className="mx-auto flex max-w-2xl items-center justify-between rounded-2xl border border-border/80 bg-card/60 p-1 shadow-lg backdrop-blur-md sm:p-2">
            {/* Step 1 Button */}
            <button
              type="button"
              onClick={() => setStep(1)}
              className={`flex min-h-11 flex-1 items-center justify-center gap-1 rounded-xl px-1.5 py-2 text-[11px] font-semibold transition-all sm:gap-2.5 sm:px-3 sm:text-sm ${
                step === 1
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                  step === 1
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                1
              </div>
              <BookOpen className="hidden h-4 w-4 sm:inline-block" />
              <span>Sourate</span>
            </button>

            <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />

            {/* Step 2 Button */}
            <button
              type="button"
              onClick={() => setStep(2)}
              className={`flex min-h-11 flex-1 items-center justify-center gap-1 rounded-xl px-1.5 py-2 text-[11px] font-semibold transition-all sm:gap-2.5 sm:px-3 sm:text-sm ${
                step === 2
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                  step === 2
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                2
              </div>
              <Layers className="hidden h-4 w-4 sm:inline-block" />
              <span>Versets</span>
            </button>

            <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />

            {/* Step 3 Button */}
            <button
              type="button"
              onClick={() => setStep(3)}
              className={`flex min-h-11 flex-1 items-center justify-center gap-1 rounded-xl px-1.5 py-2 text-[11px] font-semibold transition-all sm:gap-2.5 sm:px-3 sm:text-sm ${
                step === 3
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                  step === 3
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                3
              </div>
              <Film className="hidden h-4 w-4 sm:inline-block" />
              <span className="sm:hidden">Studio</span>
              <span className="hidden sm:inline">Studio &amp; Vidéo</span>
            </button>
          </div>
        </nav>

        {/* STEP 1: Surah Selection */}
        {step === 1 && (
          <section className="animate-step-in space-y-4 sm:space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
                  Étape 1 : Choisir la Sourate ou la Dua
                </h2>
                <p className="text-xs text-muted-foreground sm:text-sm">
                  Sélectionnez une sourate ou choisissez une invocation coranique célèbre (Dua).
                </p>
              </div>

              {/* Filter Pills */}
              <div className="flex w-full overflow-x-auto rounded-lg border border-border/70 bg-card/60 p-1 backdrop-blur-md sm:w-auto sm:self-auto">
                <button
                  type="button"
                  onClick={() => setFilterType("all")}
                  className={`min-h-10 flex-1 whitespace-nowrap rounded-md px-2.5 py-1.5 text-[11px] font-medium transition sm:px-3 sm:text-xs ${
                    filterType === "all"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Toutes ({surahs.data?.length ?? 114})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType("Meccan")}
                  className={`min-h-10 flex-1 whitespace-nowrap rounded-md px-2.5 py-1.5 text-[11px] font-medium transition sm:px-3 sm:text-xs ${
                    filterType === "Meccan"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Mecquoises
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType("Medinan")}
                  className={`min-h-10 flex-1 whitespace-nowrap rounded-md px-2.5 py-1.5 text-[11px] font-medium transition sm:px-3 sm:text-xs ${
                    filterType === "Medinan"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Médinoises
                </button>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Rechercher par nom (Al-Fatiha, Bakarah, 114…)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-border/80 bg-card/80 py-3 pl-10 pr-4 text-sm shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>

            {/* Surahs Loading */}
            {surahs.isLoading && (
              <div className="py-20 text-center text-sm text-muted-foreground">
                Chargement des 114 sourates du Saint Coran…
              </div>
            )}

            {/* Surahs Grid */}
            {!surahs.isLoading && (
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                {filteredSurahs.map((s) => {
                  const isSelected = surahNumber === s.number;
                  return (
                    <button
                      key={s.number}
                      type="button"
                      onClick={() => handleSelectSurah(s.number)}
                      className={`group relative flex items-center justify-between rounded-xl border p-4 text-left transition-all duration-200 ${
                        isSelected
                          ? "border-primary bg-primary/10 shadow-md ring-1 ring-primary"
                          : "border-border/60 bg-card/60 hover:border-primary/50 hover:bg-card hover:shadow-md"
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold transition-colors ${
                            isSelected
                              ? "bg-primary text-primary-foreground shadow"
                              : "bg-muted/70 text-foreground group-hover:bg-primary/20 group-hover:text-primary"
                          }`}
                        >
                          {s.number}
                        </div>

                        <div>
                          <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                            {s.englishName}
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            {s.englishNameTranslation}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="font-arabic text-xl font-bold text-primary">{s.name}</span>
                        <div className="mt-1 flex items-center justify-end gap-1.5 text-[11px] text-muted-foreground">
                          <span>{s.numberOfAyahs} versets</span>
                          <span>·</span>
                          <span>{s.revelationType === "Meccan" ? "Mecquoise" : "Médinoise"}</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {!surahs.isLoading && filteredSurahs.length === 0 && (
              <div className="py-16 text-center text-sm text-muted-foreground">
                Aucune sourate ne correspond à votre recherche "{searchQuery}".
              </div>
            )}

            {/* Quranic Duas Section */}
            <div className="mt-6 rounded-2xl border border-primary/30 bg-primary/5 p-3.5 shadow-lg backdrop-blur-md space-y-3.5 sm:mt-8 sm:space-y-4 sm:p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <h3 className="text-base font-bold text-foreground">
                    Invocations Coraniques Célèbres (Duas)
                  </h3>
                </div>
                <span className="text-xs text-primary font-semibold">
                  Accès direct avec récitation
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {QURANIC_DUAS.map((dua) => (
                  <button
                    key={dua.id}
                    type="button"
                    onClick={() => handleSelectDua(dua)}
                    className="group relative flex flex-col justify-between rounded-xl border border-border/80 bg-card/80 p-3.5 text-left transition-all duration-200 hover:border-primary hover:bg-primary/10 hover:shadow-md"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-[10px] font-bold text-primary">
                          {dua.category}
                        </span>
                        <span className="text-[11px] font-semibold text-muted-foreground">
                          {dua.surahName} ({dua.surahNumber})
                        </span>
                      </div>

                      <h4 className="text-xs font-extrabold text-foreground group-hover:text-primary transition-colors">
                        {dua.title}
                      </h4>

                      <p className="font-arabic text-sm text-right text-primary/90 font-bold line-clamp-1">
                        {dua.arabicSnippet}
                      </p>

                      <p className="text-[11px] text-muted-foreground line-clamp-2">
                        {dua.translationSnippet}
                      </p>
                    </div>

                    <div className="mt-3 flex items-center justify-between border-t border-border/40 pt-2 text-[11px] font-bold text-primary">
                      <span>Réciter cette Dua</span>
                      <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                    </div>
                  </button>
                ))}
              </div>

              <div className="rounded-2xl border border-border/70 bg-card/60 p-4 shadow-md backdrop-blur-md sm:p-5">
                <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
                  <Star className="h-4 w-4 fill-primary/30" />
                  <span>Suggestions de versets populaires</span>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {popularSuggestions.map((suggestion) => (
                    <button
                      key={`${suggestion.surahNumber}-${suggestion.from}-${suggestion.to}`}
                      type="button"
                      onClick={() => handlePopularSuggestion(suggestion)}
                      className="flex min-h-11 items-center justify-between gap-2 rounded-xl border border-primary/25 bg-primary/5 px-3 py-2 text-left text-xs transition hover:border-primary hover:bg-primary/15"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-bold text-foreground">
                          {suggestion.label}
                        </span>
                        <span className="block text-[11px] text-muted-foreground">
                          Sourate {suggestion.surahNumber}
                        </span>
                      </span>
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-primary" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* STEP 2: Ayah Selection */}
        {step === 2 && (
          <section className="animate-step-in space-y-4 sm:space-y-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
                  Étape 2 : Sélectionner les Versets
                </h2>
                <p className="text-xs text-muted-foreground sm:text-sm">
                  Cochez les versets à inclure, écoutez chaque verset ou utilisez une suggestion.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setStep(1)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline self-start sm:self-auto"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Changer de sourate
              </button>
            </div>

            {/* Selected Surah Summary Header */}
            {selectedSurah && (
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-primary/40 bg-primary/10 p-4 shadow-sm backdrop-blur-md sm:gap-0 sm:p-5">
                <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-base font-bold text-primary-foreground shadow">
                    {selectedSurah.number}
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate text-base font-bold text-foreground sm:text-lg">
                      Sourate {selectedSurah.englishName}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {selectedSurah.englishNameTranslation} · {selectedSurah.numberOfAyahs} versets
                      au total
                    </p>
                  </div>
                </div>

                <div className="max-w-[42%] shrink-0 text-right">
                  <span className="font-arabic text-xl font-bold text-primary sm:text-2xl">
                    {selectedSurah.name}
                  </span>
                  <p className="text-xs text-muted-foreground">
                    {selectedSurah.revelationType === "Meccan" ? "Mecquoise" : "Médinoise"}
                  </p>
                </div>
              </div>
            )}

            {/* Famous Suggestions Badges */}
            <div className="rounded-2xl border border-border/70 bg-card/60 p-5 shadow-md backdrop-blur-md space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider">
                <Star className="h-4 w-4 fill-primary/30" />
                <span>Suggestions de récitation célèbres / populaires</span>
              </div>
              <div className="flex flex-wrap gap-2.5">
                {famousSuggestions.map((sug, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => selectRange(sug.from, sug.to)}
                    className="flex flex-col items-start gap-0.5 rounded-xl border border-primary/30 bg-primary/10 px-4 py-2 text-left text-xs transition hover:border-primary hover:bg-primary/20"
                  >
                    <span className="font-bold text-foreground">{sug.label}</span>
                    {sug.description && (
                      <span className="text-[11px] text-muted-foreground">{sug.description}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Ayahs Checkbox List */}
            <div className="space-y-3 rounded-2xl border border-border/70 bg-card/60 p-3.5 shadow-lg backdrop-blur-md sm:space-y-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border/50">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                    Liste des versets
                  </span>
                  <span className="rounded-full bg-primary/20 px-3 py-0.5 text-xs font-bold text-primary">
                    {selectedAyahs.length} sélectionné(s)
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={selectAll}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 font-medium text-foreground hover:bg-accent"
                  >
                    <CheckSquare className="h-3.5 w-3.5 text-primary" />
                    Tout cocher
                  </button>
                  <button
                    type="button"
                    onClick={deselectAll}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 font-medium text-muted-foreground hover:text-foreground hover:bg-accent"
                  >
                    <Square className="h-3.5 w-3.5" />
                    Tout décocher
                  </button>
                </div>
              </div>

              {recitation.isLoading && (
                <div className="py-16 text-center text-sm text-muted-foreground">
                  Chargement des versets en cours…
                </div>
              )}

              {!recitation.isLoading && recitation.isError && (
                <div className="py-16 text-center text-sm text-destructive">
                  Erreur lors de la récupération des versets. Veuillez réessayer.
                </div>
              )}

              {!recitation.isLoading && recitation.data && (
                <div className="max-h-[58vh] space-y-3 overflow-y-auto pr-1 sm:max-h-[540px] sm:pr-2">
                  {recitation.data.ayahs.map((ayah) => {
                    const isChecked = selectedAyahs.includes(ayah.numberInSurah);
                    const isPreviewing = previewingAudioUrl === ayah.audio;

                    return (
                      <div
                        key={ayah.numberInSurah}
                        onClick={() => toggleAyah(ayah.numberInSurah)}
                        className={`group cursor-pointer flex items-start gap-3 rounded-xl border p-3 transition-all duration-150 sm:gap-4 sm:p-4 ${
                          isChecked
                            ? "border-primary/60 bg-primary/5 shadow-sm"
                            : "border-border/50 bg-background/40 hover:border-primary/30 hover:bg-background/80 opacity-70"
                        }`}
                      >
                        <div className="mt-1 shrink-0">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleAyah(ayah.numberInSurah)}
                            className="sr-only"
                          />
                          <div
                            className={`flex h-6 w-6 items-center justify-center rounded-md border transition-colors ${
                              isChecked
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-muted-foreground/40 bg-background group-hover:border-primary/60"
                            }`}
                          >
                            {isChecked && <Check className="h-4 w-4 stroke-[3]" />}
                          </div>
                        </div>

                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between">
                            <span
                              className={`text-xs font-bold ${
                                isChecked ? "text-primary" : "text-muted-foreground"
                              }`}
                            >
                              Verset {ayah.numberInSurah}
                            </span>

                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                title="Écouter ce verset"
                                onClick={(e) => handleToggleVersePreview(e, ayah.audio)}
                                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold transition ${
                                  isPreviewing
                                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                                    : "border-border/80 bg-card/90 text-muted-foreground hover:border-primary/60 hover:text-foreground"
                                }`}
                              >
                                {isPreviewing ? (
                                  <>
                                    <Pause className="h-3 w-3 fill-current" />
                                    <span>Pause</span>
                                  </>
                                ) : (
                                  <>
                                    <Volume2 className="h-3.5 w-3.5 text-primary" />
                                    <span>Écouter</span>
                                  </>
                                )}
                              </button>

                              <span className="text-xs text-muted-foreground font-arabic">
                                آية {ayah.numberInSurah}
                              </span>
                            </div>
                          </div>

                          <p className="font-arabic text-xl leading-loose text-right text-foreground">
                            {ayah.arabic}
                          </p>

                          {ayah.translation && (
                            <p className="text-xs text-muted-foreground border-t border-border/30 pt-2">
                              {ayah.translation}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="pt-4 border-t border-border/50 flex justify-end">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  disabled={selectedAyahs.length === 0}
                  className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground shadow-lg transition hover:brightness-110 disabled:opacity-40 sm:w-auto sm:px-7"
                >
                  <span>Continuer vers le Studio ({selectedAyahs.length} verset(s))</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </section>
        )}

        {/* STEP 3: Studio & Video Generation */}
        {step === 3 && (
          <section className="animate-step-in space-y-4 sm:space-y-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
                  Étape 3 : Studio & Génération Vidéo
                </h2>
                <p className="text-xs text-muted-foreground sm:text-sm">
                  Personnalisez entièrement vos sous-titres, animations CapCut et médias.
                </p>
              </div>

              <div className="flex gap-2 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card/80 px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-accent"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Modifier les versets ({selectedAyahs.length})
                </button>
              </div>
            </div>

            <div className="grid gap-5 sm:gap-8 lg:grid-cols-[minmax(0,1fr)_370px]">
              {/* Studio Canvas Stage */}
              <section className="flex flex-col items-center gap-5">
                <div className="w-full rounded-2xl border border-border/60 bg-card/60 p-2.5 shadow-2xl backdrop-blur sm:p-4">
                  <canvas
                    ref={canvasRef}
                    width={preset.w}
                    height={preset.h}
                    className="mx-auto block h-auto w-full max-w-[420px] rounded-xl shadow-lg"
                    style={{ aspectRatio: `${preset.w} / ${preset.h}` }}
                  />
                </div>

                {/* Player Controls */}
                <div className="grid w-full grid-cols-3 items-center gap-2 sm:flex sm:w-auto sm:flex-wrap sm:justify-center sm:gap-3">
                  <button
                    type="button"
                    onClick={() => setIndex((i) => Math.max(0, i - 1))}
                    disabled={!ayahs.length || index === 0}
                    className="flex min-h-11 items-center justify-center gap-1 rounded-full border border-border px-2 py-2 text-[11px] font-semibold text-muted-foreground transition hover:text-foreground disabled:opacity-40 sm:px-4 sm:text-xs"
                  >
                    <SkipBack className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Verset précédent</span>
                    <span className="sm:hidden">Préc.</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPlaying((p) => !p)}
                    disabled={!ayahs.length}
                    className="flex min-h-11 items-center justify-center gap-2 rounded-full bg-primary px-2 py-2.5 text-sm font-bold text-primary-foreground shadow-lg transition hover:brightness-110 disabled:opacity-40 sm:px-7"
                  >
                    {playing ? (
                      <>
                        <Pause className="h-4 w-4" /> Pause
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 fill-current" /> Lecture
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setIndex((i) => Math.min(ayahs.length - 1, i + 1))}
                    disabled={!ayahs.length || index >= ayahs.length - 1}
                    className="flex min-h-11 items-center justify-center gap-1 rounded-full border border-border px-2 py-2 text-[11px] font-semibold text-muted-foreground transition hover:text-foreground disabled:opacity-40 sm:px-4 sm:text-xs"
                  >
                    <span className="hidden sm:inline">Verset suivant</span>
                    <span className="sm:hidden">Suiv.</span>
                    <SkipForward className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Video Generation Section */}
                <div className="flex w-full flex-col items-center gap-3 pt-1 sm:pt-2">
                  {recording ? (
                    <button
                      type="button"
                      onClick={cancelRecording}
                      className="flex items-center gap-2 rounded-full bg-destructive px-6 py-2.5 text-sm font-bold text-destructive-foreground shadow-md"
                    >
                      <Video className="h-4 w-4 animate-pulse" />
                      Arrêter l'enregistrement
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void startRecording()}
                      disabled={!ayahs.length}
                      className="flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-primary/60 bg-primary/10 px-4 py-3 text-sm font-bold text-primary shadow-lg transition hover:bg-primary/20 disabled:opacity-40 sm:w-auto sm:px-7"
                    >
                      <Sparkles className="h-4 w-4" />
                      Générer la vidéo
                    </button>
                  )}

                  <p className="max-w-sm text-center text-xs text-muted-foreground">
                    {recording
                      ? "Enregistrement en cours… Laissez la récitation se dérouler jusqu'à la fin."
                      : "La vidéo sera enregistrée en direct au format WebM HD avec vos animations et styles."}
                  </p>

                  {downloadUrl && (
                    <a
                      href={downloadUrl}
                      download={`recitation-sourate-${surahNumber}.webm`}
                      className="flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground shadow-lg transition hover:brightness-110 sm:w-auto"
                    >
                      <Download className="h-4 w-4" />
                      Télécharger la vidéo WebM
                    </a>
                  )}
                </div>

                {generatedVideos.length > 0 && (
                  <section className="w-full rounded-2xl border border-border/60 bg-card/60 p-3.5 shadow-lg backdrop-blur sm:p-5">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
                          <Clock className="h-4 w-4 text-primary" />
                          Mes vidéos
                        </h3>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Retrouvez vos 12 derniers exports sur cet appareil.
                        </p>
                      </div>
                      <span className="rounded-full bg-primary/15 px-2.5 py-1 text-[11px] font-bold text-primary">
                        {generatedVideos.length}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {generatedVideos.map((video) => (
                        <div
                          key={video.id}
                          className="flex items-center gap-3 rounded-xl border border-border/60 bg-background/40 p-3"
                        >
                          <Video className="h-4 w-4 shrink-0 text-primary" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-bold text-foreground">
                              {video.surahName}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              {new Date(video.createdAt).toLocaleDateString("fr-FR")} ·{" "}
                              {formatDuration(video.duration)}
                            </p>
                          </div>
                          {video.url ? (
                            <a
                              href={video.url}
                              download={video.fileName}
                              aria-label={`Télécharger ${video.fileName}`}
                              className="flex min-h-10 min-w-10 items-center justify-center rounded-full bg-primary/15 text-primary transition hover:bg-primary/25"
                            >
                              <Download className="h-4 w-4" />
                            </a>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">Chargement…</span>
                          )}
                          <button
                            type="button"
                            aria-label={`Supprimer ${video.fileName}`}
                            onClick={() => {
                              void deleteVideoBlob(video.id);
                              if (video.url) URL.revokeObjectURL(video.url);
                              setGeneratedVideos((videos) =>
                                videos.filter((item) => item.id !== video.id),
                              );
                            }}
                            className="flex min-h-10 min-w-10 items-center justify-center rounded-full text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </section>

              {/* CapCut-Inspired 4-Tab Customization Sidebar */}
              <aside className="space-y-4 rounded-2xl border border-border/60 bg-card/60 p-3.5 shadow-xl backdrop-blur sm:space-y-5 sm:p-5">
                <div className="flex items-center justify-between border-b border-border/50 pb-3">
                  <h3 className="text-sm font-bold tracking-wider text-foreground uppercase flex items-center gap-2">
                    <SlidersHorizontal className="h-4 w-4 text-primary" />
                    Studio & Sous-titres
                  </h3>
                </div>

                {/* 4 Navigation Tabs */}
                <div className="grid grid-cols-4 gap-1 rounded-xl bg-muted/60 p-1 text-xs">
                  <button
                    type="button"
                    onClick={() => setSidebarTab("anim")}
                    className={`flex min-h-11 flex-col items-center justify-center gap-1 rounded-lg py-1.5 text-[11px] font-semibold transition ${
                      sidebarTab === "anim"
                        ? "bg-card text-primary shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Wand2 className="h-3.5 w-3.5" />
                    <span>Anim.</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSidebarTab("typo")}
                    className={`flex min-h-11 flex-col items-center justify-center gap-1 rounded-lg py-1.5 text-[11px] font-semibold transition ${
                      sidebarTab === "typo"
                        ? "bg-card text-primary shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Type className="h-3.5 w-3.5" />
                    <span>Police</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSidebarTab("style")}
                    className={`flex min-h-11 flex-col items-center justify-center gap-1 rounded-lg py-1.5 text-[11px] font-semibold transition ${
                      sidebarTab === "style"
                        ? "bg-card text-primary shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Palette className="h-3.5 w-3.5" />
                    <span>Style</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSidebarTab("media")}
                    className={`flex min-h-11 flex-col items-center justify-center gap-1 rounded-lg py-1.5 text-[11px] font-semibold transition ${
                      sidebarTab === "media"
                        ? "bg-card text-primary shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>Décor</span>
                  </button>
                </div>

                {/* TAB 1: CapCut Text Animations */}
                {sidebarTab === "anim" && (
                  <div className="space-y-4 animate-step-in">
                    <Field label="Animation d'apparition (Style CapCut)">
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: "fade", label: "Fondu (Fade)", desc: "Apparition douce" },
                          { id: "slide", label: "Glissement (Slide)", desc: "Du bas vers le haut" },
                          { id: "zoom", label: "Zoom / Pulse", desc: "Effet d'impulsion" },
                          { id: "karaoke", label: "Karaoké", desc: "Surlignage des mots" },
                          { id: "none", label: "Fixe", desc: "Sans animation" },
                        ].map((anim) => (
                          <button
                            key={anim.id}
                            type="button"
                            onClick={() => setAnimation(anim.id as TextAnimationType)}
                            className={`flex flex-col items-start p-2.5 rounded-xl border text-left transition ${
                              animation === anim.id
                                ? "border-primary bg-primary/10 text-primary shadow-sm"
                                : "border-border/70 hover:border-primary/50 text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            <span className="text-xs font-bold">{anim.label}</span>
                            <span className="text-[10px] opacity-75">{anim.desc}</span>
                          </button>
                        ))}
                      </div>
                    </Field>

                    {animation === "karaoke" && (
                      <Field label="Couleur de surlignage Karaoké">
                        <div className="flex gap-2">
                          {[
                            { color: "#f3d082", label: "Or" },
                            { color: "#fef08a", label: "Jaune" },
                            { color: "#38bdf8", label: "Bleu Néon" },
                            { color: "#4ade80", label: "Vert" },
                          ].map((c) => (
                            <button
                              key={c.color}
                              type="button"
                              onClick={() => setHighlightColor(c.color)}
                              style={{ backgroundColor: c.color }}
                              className={`h-8 flex-1 rounded-lg border text-xs font-bold shadow-sm transition ${
                                highlightColor === c.color ? "ring-2 ring-foreground scale-105" : ""
                              }`}
                            />
                          ))}
                        </div>
                      </Field>
                    )}
                  </div>
                )}

                {/* TAB 2: Typography & Scaling */}
                {sidebarTab === "typo" && (
                  <div className="space-y-4 animate-step-in">
                    <Field label="Police Arabe">
                      <select
                        value={arabicFont}
                        onChange={(e) => setArabicFont(e.target.value)}
                        className="control"
                      >
                        <option value="Amiri">Amiri (Calligraphie classique)</option>
                        <option value="Cairo">Cairo (Moderne Sans)</option>
                        <option value="Scheherazade New">Scheherazade New (Naskh pur)</option>
                      </select>
                    </Field>

                    <Field label={`Taille texte arabe (${Math.round(arabicScale * 100)}%)`}>
                      <input
                        type="range"
                        min="0.8"
                        max="1.4"
                        step="0.05"
                        value={arabicScale}
                        onChange={(e) => setArabicScale(parseFloat(e.target.value))}
                        className="w-full accent-primary"
                      />
                    </Field>

                    <Field label="Police Traduction">
                      <select
                        value={translationFont}
                        onChange={(e) => setTranslationFont(e.target.value)}
                        className="control"
                      >
                        <option value="Cairo">Cairo (Sans-Serif élégant)</option>
                        <option value="Inter">Inter (Épuré moderne)</option>
                        <option value="Playfair Display">
                          Playfair Display (Serif littéraire)
                        </option>
                      </select>
                    </Field>

                    <Field label={`Taille traduction (${Math.round(translationScale * 100)}%)`}>
                      <input
                        type="range"
                        min="0.8"
                        max="1.4"
                        step="0.05"
                        value={translationScale}
                        onChange={(e) => setTranslationScale(parseFloat(e.target.value))}
                        className="w-full accent-primary"
                      />
                    </Field>
                  </div>
                )}

                {/* TAB 3: Style & Subtitle Box */}
                {sidebarTab === "style" && (
                  <div className="space-y-4 animate-step-in">
                    <Field label="Couleur Texte Arabe">
                      <div className="flex gap-2">
                        {[
                          { color: "#fdf8ec", label: "Crème" },
                          { color: "#ffffff", label: "Blanc" },
                          { color: "#f3d082", label: "Or" },
                          { color: "#fef08a", label: "Jaune" },
                        ].map((c) => (
                          <button
                            key={c.color}
                            type="button"
                            onClick={() => setArabicColor(c.color)}
                            className={`flex-1 rounded-lg border py-1.5 text-xs font-semibold shadow-sm transition ${
                              arabicColor === c.color
                                ? "border-primary bg-primary/20 ring-1 ring-primary"
                                : "border-border"
                            }`}
                          >
                            <span
                              className="inline-block h-3 w-3 rounded-full mr-1 align-middle"
                              style={{ backgroundColor: c.color }}
                            />
                            {c.label}
                          </button>
                        ))}
                      </div>
                    </Field>

                    {/* CapCut Subtitle Box Toggle */}
                    <div className="rounded-xl border border-border/80 bg-card/60 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground">
                          Boîte d'arrière-plan du texte (Style CapCut)
                        </span>
                        <input
                          type="checkbox"
                          checked={showBox}
                          onChange={(e) => setShowBox(e.target.checked)}
                          className="h-4 w-4 accent-primary"
                        />
                      </div>

                      {showBox && (
                        <div className="pt-2 flex gap-2 border-t border-border/40">
                          {[
                            { color: "rgba(0, 0, 0, 0.65)", label: "Sombre" },
                            { color: "rgba(6, 46, 28, 0.75)", label: "Vert Émeraude" },
                            { color: "rgba(30, 41, 59, 0.75)", label: "Ardoise" },
                          ].map((b) => (
                            <button
                              key={b.color}
                              type="button"
                              onClick={() => setBoxColor(b.color)}
                              className={`flex-1 rounded-lg border py-1 text-[11px] font-semibold transition ${
                                boxColor === b.color
                                  ? "border-primary bg-primary/20 text-primary"
                                  : "border-border text-muted-foreground"
                              }`}
                            >
                              {b.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <Field label="Effet d'Ombre & Lueur">
                      <select
                        value={shadowStyle}
                        onChange={(e) => setShadowStyle(e.target.value as TextShadowStyle)}
                        className="control"
                      >
                        <option value="soft">Ombre douce naturelle</option>
                        <option value="gold_glow">Lueur Dorée Néon</option>
                        <option value="dark_outline">Contour Sombre à fort contraste</option>
                        <option value="none">Sans ombre</option>
                      </select>
                    </Field>
                  </div>
                )}

                {/* TAB 4: Media & Visibility Controls */}
                {sidebarTab === "media" && (
                  <div className="space-y-4 animate-step-in">
                    <Field label="Récitateur">
                      <select
                        value={reciter}
                        onChange={(e) => setReciter(e.target.value)}
                        className="control"
                      >
                        {RECITERS.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name} — {r.arabicName}
                          </option>
                        ))}
                      </select>
                    </Field>

                    <Field label="Traduction">
                      <select
                        value={translation}
                        onChange={(e) => setTranslation(e.target.value)}
                        className="control"
                      >
                        {TRANSLATIONS.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </Field>

                    <Field label={`Voile d'arrière-plan (${Math.round(veilOpacity * 100)}%)`}>
                      <input
                        type="range"
                        min="0.2"
                        max="0.95"
                        step="0.05"
                        value={veilOpacity}
                        onChange={(e) => setVeilOpacity(parseFloat(e.target.value))}
                        className="w-full accent-primary"
                      />
                    </Field>

                    {/* Visibility Toggles */}
                    <div className="space-y-2 rounded-xl border border-border/80 bg-card/60 p-3 text-xs">
                      <span className="font-bold text-foreground block pb-1 border-b border-border/40">
                        Affichage des éléments
                      </span>
                      <label className="flex items-center justify-between cursor-pointer">
                        <span>En-tête (Nom de Sourate)</span>
                        <input
                          type="checkbox"
                          checked={showHeader}
                          onChange={(e) => setShowHeader(e.target.checked)}
                          className="h-4 w-4 accent-primary"
                        />
                      </label>
                      <label className="flex items-center justify-between cursor-pointer">
                        <span>Texte de Traduction</span>
                        <input
                          type="checkbox"
                          checked={showTranslation}
                          onChange={(e) => setShowTranslation(e.target.checked)}
                          className="h-4 w-4 accent-primary"
                        />
                      </label>
                      <label className="flex items-center justify-between cursor-pointer">
                        <span>Pied de page (Barre & Verset)</span>
                        <input
                          type="checkbox"
                          checked={showFooter}
                          onChange={(e) => setShowFooter(e.target.checked)}
                          className="h-4 w-4 accent-primary"
                        />
                      </label>
                    </div>

                    <Field label="Décor vidéo / photo">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-1 pb-1 border-b border-border/40">
                          <div className="flex gap-1 overflow-x-auto">
                            <button
                              type="button"
                              onClick={() => setBgTab("all")}
                              className={`rounded-md px-2 py-1 text-[11px] font-semibold transition ${
                                bgTab === "all"
                                  ? "bg-primary text-primary-foreground"
                                  : "text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              Tous
                            </button>
                            <button
                              type="button"
                              onClick={() => setBgTab("image")}
                              className={`rounded-md px-2 py-1 text-[11px] font-semibold transition ${
                                bgTab === "image"
                                  ? "bg-primary text-primary-foreground"
                                  : "text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              Photos
                            </button>
                            <button
                              type="button"
                              onClick={() => setBgTab("video")}
                              className={`rounded-md px-2 py-1 text-[11px] font-semibold transition ${
                                bgTab === "video"
                                  ? "bg-primary text-primary-foreground"
                                  : "text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              Vidéos
                            </button>
                            {backgroundList.some((b) => b.isCustom) && (
                              <button
                                type="button"
                                onClick={() => setBgTab("custom")}
                                className={`rounded-md px-2 py-1 text-[11px] font-semibold transition ${
                                  bgTab === "custom"
                                    ? "bg-primary text-primary-foreground"
                                    : "text-muted-foreground hover:text-foreground"
                                }`}
                              >
                                Mes Médias
                              </button>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            title="Importer votre photo ou vidéo"
                            className="inline-flex items-center gap-1 rounded-md border border-primary/40 bg-primary/10 px-2 py-1 text-[11px] font-bold text-primary hover:bg-primary/20 shrink-0"
                          >
                            <Upload className="h-3 w-3" />
                            <span>+ Importer</span>
                          </button>

                          <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            accept="image/*,video/*"
                            onChange={handleCustomMediaUpload}
                            className="hidden"
                          />
                        </div>

                        <div className="grid grid-cols-3 gap-2 max-h-[160px] overflow-y-auto pr-1">
                          {filteredBackgrounds.map((b) => {
                            const isSelected = selectedBgId === b.id;
                            return (
                              <div
                                key={b.id}
                                onClick={() => setSelectedBgId(b.id)}
                                className={`group relative cursor-pointer overflow-hidden rounded-lg border text-xs transition-all ${
                                  isSelected
                                    ? "border-primary ring-2 ring-primary/40 shadow-md"
                                    : "border-border/70 hover:border-primary/50"
                                }`}
                              >
                                <div className="relative h-14 w-full bg-black/40">
                                  {b.type === "image" ? (
                                    <img
                                      src={b.src}
                                      alt={b.label}
                                      loading="lazy"
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <video
                                      src={b.src}
                                      muted
                                      loop
                                      playsInline
                                      className="h-full w-full object-cover"
                                    />
                                  )}

                                  <div className="absolute left-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm">
                                    {b.type === "video" ? (
                                      <Video className="h-2.5 w-2.5" />
                                    ) : (
                                      <Camera className="h-2.5 w-2.5" />
                                    )}
                                  </div>

                                  {b.isCustom && (
                                    <button
                                      type="button"
                                      title="Supprimer ce média"
                                      onClick={(e) => handleRemoveCustomMedia(b.id, e)}
                                      className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive/80 text-destructive-foreground opacity-0 group-hover:opacity-100 transition"
                                    >
                                      <Trash2 className="h-2.5 w-2.5" />
                                    </button>
                                  )}
                                </div>

                                <span className="block truncate py-0.5 px-1 text-center text-[10px] font-medium text-muted-foreground">
                                  {b.label}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </Field>

                    <Field label="Format d'image">
                      <div className="flex gap-2">
                        {RATIOS.map((r) => (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => setRatio(r.id)}
                            className={`flex-1 rounded-lg border px-2 py-2 text-xs font-semibold transition ${
                              ratio === r.id
                                ? "border-primary bg-primary/10 text-primary shadow-sm"
                                : "border-border text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            {r.label}
                          </button>
                        ))}
                      </div>
                    </Field>
                  </div>
                )}

                {/* Sidebar Summary & Video Duration Indicator */}
                <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground flex items-center gap-1.5">
                      <Clock className="h-4 w-4 text-primary" />
                      Durée totale vidéo :
                    </span>
                    <span className="font-extrabold text-primary text-sm">
                      {formatDuration(totalVideoDuration)}
                    </span>
                  </div>

                  <div className="text-[11px] text-muted-foreground space-y-0.5 pt-2 border-t border-border/40">
                    <p>
                      <strong className="text-foreground">Sourate :</strong>{" "}
                      {selectedSurah?.englishName} ({selectedAyahs.length} verset(s))
                    </p>
                    <p>
                      <strong className="text-foreground">Verset en cours :</strong> {index + 1} /{" "}
                      {ayahs.length || 1}
                    </p>
                  </div>
                </div>
              </aside>
            </div>
          </section>
        )}
      </div>

      {/* Floating Action Button for Step 2 */}
      {step === 2 && selectedAyahs.length > 0 && (
        <div className="fixed bottom-6 right-6 z-50 animate-step-in">
          <button
            type="button"
            onClick={() => setStep(3)}
            className="flex items-center gap-2.5 rounded-full bg-primary px-6 py-3.5 text-sm font-extrabold text-primary-foreground shadow-2xl ring-4 ring-primary/20 transition-all duration-200 hover:scale-105 hover:brightness-110 active:scale-95"
          >
            <span>Continuer vers le Studio ({selectedAyahs.length})</span>
            <ArrowRight className="h-4 w-4 stroke-[3]" />
          </button>
        </div>
      )}

      {/* Dedicated Preview Audio Player */}
      <audio
        ref={previewAudioRef}
        crossOrigin="anonymous"
        onEnded={() => setPreviewingAudioUrl(null)}
        className="hidden"
      />

      {/* Studio Audio Player */}
      <audio ref={audioRef} crossOrigin="anonymous" onEnded={handleEnded} className="hidden" />
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}
