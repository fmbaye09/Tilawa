const API = "https://api.alquran.cloud/v1";

export type Surah = {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  numberOfAyahs: number;
  revelationType: string;
};

export type Reciter = {
  /** everyayah.com folder name (audio libre d'accès) */
  id: string;
  name: string;
  arabicName: string;
};

/** Récitateurs disponibles sur le CDN gratuit everyayah.com */
export const RECITERS: Reciter[] = [
  { id: "Alafasy_128kbps", name: "Mishary Al-Afasy", arabicName: "مشاري العفاسي" },
  {
    id: "Abdul_Basit_Murattal_192kbps",
    name: "Abdul Basit (Murattal)",
    arabicName: "عبد الباسط عبد الصمد",
  },
  {
    id: "Abdurrahmaan_As-Sudais_192kbps",
    name: "Abdurrahman As-Sudais",
    arabicName: "عبدالرحمن السديس",
  },
  { id: "Husary_128kbps", name: "Mahmoud Khalil Al-Husary", arabicName: "محمود خليل الحصري" },
  {
    id: "Minshawy_Murattal_128kbps",
    name: "Al-Minshawy (Murattal)",
    arabicName: "محمد صديق المنشاوي",
  },
  {
    id: "Abu%20Bakr%20Ash-Shaatree_128kbps",
    name: "Abu Bakr Ash-Shatri",
    arabicName: "أبو بكر الشاطري",
  },
  { id: "Ghamadi_40kbps", name: "Saad Al-Ghamdi", arabicName: "سعد الغامدي" },
  { id: "MaherAlMuaiqly128kbps", name: "Maher Al-Muaiqly", arabicName: "ماهر المعيقلي" },
  { id: "Muhammad_Ayyoub_128kbps", name: "Muhammad Ayyoub", arabicName: "محمد أيوب" },
  { id: "Yasser_Ad-Dussary_128kbps", name: "Yasser Ad-Dussary", arabicName: "ياسر الدوسري" },
  { id: "Hudhaify_128kbps", name: "Ali Al-Hudhaify", arabicName: "علي الحذيفي" },
];

const pad3 = (n: number) => String(n).padStart(3, "0");

export function ayahAudioUrl(reciterId: string, surah: number, ayah: number) {
  return `https://everyayah.com/data/${reciterId}/${pad3(surah)}${pad3(ayah)}.mp3`;
}

export type RecitationAyah = {
  numberInSurah: number;
  arabic: string;
  translation: string;
  audio: string;
};

export type Recitation = {
  surah: Surah;
  ayahs: RecitationAyah[];
};

type ApiResponse<T> = { code: number; status: string; data: T };

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`);
  if (!res.ok) throw new Error(`Erreur API (${res.status})`);
  const json = (await res.json()) as ApiResponse<T>;
  return json.data;
}

export async function fetchSurahs(): Promise<Surah[]> {
  return get<Surah[]>("/surah");
}

type EditionAyah = { numberInSurah: number; text: string; audio?: string };
type EditionSurah = Surah & { ayahs: EditionAyah[] };

export async function fetchRecitation(
  surahNumber: number,
  reciterId: string,
  translation: string,
): Promise<Recitation> {
  const editions = ["quran-uthmani", ...(translation === "none" ? [] : [translation])].join(",");
  const data = await get<EditionSurah[]>(`/surah/${surahNumber}/editions/${editions}`);
  const audioEdition = data[0]!;
  const translationEdition = data[1];

  return {
    surah: {
      number: audioEdition.number,
      name: audioEdition.name,
      englishName: audioEdition.englishName,
      englishNameTranslation: audioEdition.englishNameTranslation,
      numberOfAyahs: audioEdition.ayahs.length,
      revelationType: audioEdition.revelationType,
    },
    ayahs: audioEdition.ayahs.map((ayah, i) => {
      let arabic = ayah.text.replace(/^\uFEFF/, "").trim();
      if (surahNumber !== 1 && ayah.numberInSurah === 1) {
        // Strip Basmala prepended by API to Ayah 1 (Basmala is only Ayah 1 in Surah Al-Fatihah)
        arabic = arabic.replace(/^بِسْمِ\s+ٱللَّهِ\s+ٱلرَّحْمَٰنِ\s+ٱلرَّحِيمِ\s*/, "").trim();
        arabic = arabic.replace(/^بِسْمِ\s+ٱللَّهِ\s+ٱلرَّحْمَٰنِ\s+ٱلرَّحِيمِ\s*/, "").trim();
        arabic = arabic.replace(/^بِسْمِ\s+اللَّهِ\s+الرَّحْمَنِ\s+الرَّحِيمِ\s*/, "").trim();
      }
      return {
        numberInSurah: ayah.numberInSurah,
        arabic,
        translation: translationEdition?.ayahs[i]?.text ?? "",
        audio: ayahAudioUrl(reciterId, surahNumber, ayah.numberInSurah),
      };
    }),
  };
}

export const TRANSLATIONS = [
  { id: "fr.hamidullah", label: "Français — Hamidullah" },
  { id: "en.sahih", label: "English — Sahih International" },
  { id: "es.cortes", label: "Español — Cortés" },
  { id: "none", label: "Sans traduction" },
] as const;

export type VerseSuggestion = {
  label: string;
  description?: string;
  from: number;
  to: number;
};

export type QuranicDua = {
  id: string;
  title: string;
  category: string;
  surahNumber: number;
  surahName: string;
  ayahFrom: number;
  ayahTo: number;
  arabicSnippet: string;
  translationSnippet: string;
};

/** Invocations Coraniques (Duas) célèbres avec versets et récitations */
export const QURANIC_DUAS: QuranicDua[] = [
  {
    id: "rabbana_atina",
    title: "Rabbana Atina (Le Bien-être ici-bas & au-delà)",
    category: "Protection & Paix",
    surahNumber: 2,
    surahName: "Al-Baqarah",
    ayahFrom: 201,
    ayahTo: 201,
    arabicSnippet:
      "رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ",
    translationSnippet:
      "Seigneur! Accorde-nous belle part ici-bas, et belle part dans l'au-delà, et protège-nous du châtiment du Feu!",
  },
  {
    id: "dua_younus",
    title: "Dua Younus (La Délivrance dans l'épreuve)",
    category: "Délivrance & Pardon",
    surahNumber: 21,
    surahName: "Al-Anbiya",
    ayahFrom: 87,
    ayahTo: 87,
    arabicSnippet: "لَّا إِلَٰهَ إِلَّا أَنتَ سُبْحَانَكَ إِنِّي كُنتُ مِنَ الظَّالِمِينَ",
    translationSnippet:
      "Pas de divinité à part Toi! Pureté à Toi! J'étais vraiment du nombre des injustes.",
  },
  {
    id: "rabbana_tuzigh",
    title: "Rabbana La Tuzigh Qulubana (La Fermeté du Cœur)",
    category: "Guidée & Foi",
    surahNumber: 3,
    surahName: "Ali 'Imran",
    ayahFrom: 8,
    ayahTo: 8,
    arabicSnippet:
      "رَبَّنَا لَا تُزِغْ قُلُوبَنَا بَعْدَ إِذْ هَدَيْتَنَا وَهَبْ لَنَا مِن لَّدُنكَ رَحْمَةً",
    translationSnippet:
      "Seigneur! Ne laisse pas dévier nos cœurs après que Tu nous as guidés; et accorde-nous Ta miséricorde.",
  },
  {
    id: "rabbi_salat",
    title: "Rabbi Ij'alni Muqima As-Salat (La Prière & la Famille)",
    category: "Prière & Descendance",
    surahNumber: 14,
    surahName: "Ibrahim",
    ayahFrom: 40,
    ayahTo: 41,
    arabicSnippet:
      "رَبِّ اجْعَلْنِي مُقِيمَ الصَّلَاةِ وَمِن ذُرِّيَّتِي ۚ رَبَّنَا وَتَقَبَّلْ دُعَاءِ",
    translationSnippet:
      "Ô mon Seigneur! Fais que j'accomplisse assidûment la Salat, ainsi qu'une partie de ma descendance...",
  },
  {
    id: "rabbana_hab_lana",
    title: "Rabbana Hab Lana (Pour le Foyer & les Époux)",
    category: "Famille & Époux",
    surahNumber: 25,
    surahName: "Al-Furqan",
    ayahFrom: 74,
    ayahTo: 74,
    arabicSnippet:
      "رَبَّنَا هَبْ لَنَا مِنْ أَزْوَاجِنَا وَذُرِّيَّاتِنَا قُرَّةَ أَعْيُنٍ وَاجْعَلْنَا لِلْمُتَّقِينَ إِمَامًا",
    translationSnippet:
      "Seigneur, accorde-nous en nos épouses et nos descendants la joie des yeux...",
  },
  {
    id: "rabbi_ashrah",
    title: "Rabbi Ashrah Li Sadri (L'Apaisement & l'Éloquence)",
    category: "Sagesse & Sérénité",
    surahNumber: 20,
    surahName: "Ta-Ha",
    ayahFrom: 25,
    ayahTo: 28,
    arabicSnippet: "رَبِّ اشْرَحْ لِي صَدْرِي وَيَسِّرْ لِي أَمْرِي",
    translationSnippet:
      "Seigneur, ouvre-moi ma poitrine, et facilite-moi ma tâche, et dénoue un nœud en ma langue...",
  },
  {
    id: "rabbi_walidayya",
    title: "Rabbana Aghfir Li Wa Liwalidayya (Pour les Parents)",
    category: "Parents & Pardon",
    surahNumber: 14,
    surahName: "Ibrahim",
    ayahFrom: 41,
    ayahTo: 41,
    arabicSnippet:
      "رَبَّنَا اغْفِرْ لِي وَلِوَالِدَيَّ وَلِلْمُؤْمِنِينَ يَوْمَ يَقُومُ الْحِسَابُ",
    translationSnippet:
      "Seigneur! Pardonne-moi, ainsi qu'à mes parents et aux croyants, le jour où le compte sera établi.",
  },
  {
    id: "rabbi_khayr",
    title: "Rabbi Inni Lima Anzalta (Pour les Besoins & le Secours)",
    category: "Providence & Besoins",
    surahNumber: 28,
    surahName: "Al-Qasas",
    ayahFrom: 24,
    ayahTo: 24,
    arabicSnippet: "رَبِّ إِنِّي لِمَا أَنزَلْتَ إِلَيَّ مِنْ خَيْرٍ فَقِيرٌ",
    translationSnippet: "Seigneur, j'ai grand besoin du bien que Tu feras descendre vers moi.",
  },
];

/** Suggestions de versets les plus célèbres / les plus récités par sourate */
export const FAMOUS_SUGGESTIONS: Record<number, VerseSuggestion[]> = {
  1: [{ label: "Toute la sourate (v. 1-7)", description: "Al-Fatihah complète", from: 1, to: 7 }],
  2: [
    { label: "Ayat Al-Kursi (v. 255)", description: "Le verset du Trône", from: 255, to: 255 },
    {
      label: "Fin d'Al-Baqarah (v. 285-286)",
      description: "Aamana Ar-Rasool",
      from: 285,
      to: 286,
    },
    { label: "Début d'Al-Baqarah (v. 1-5)", description: "Alif-Lam-Meem", from: 1, to: 5 },
  ],
  3: [
    {
      label: "Versets de la Création (v. 190-194)",
      description: "Inna fi khalqi s-samawat...",
      from: 190,
      to: 194,
    },
    {
      label: "Verset du Royaume (v. 26-27)",
      description: "Qul Allahumma Malikal-Mulk...",
      from: 26,
      to: 27,
    },
  ],
  18: [
    {
      label: "10 premiers versets (v. 1-10)",
      description: "Protection contre le Dajjal",
      from: 1,
      to: 10,
    },
    {
      label: "10 derniers versets (v. 101-110)",
      description: "Fin d'Al-Kahf",
      from: 101,
      to: 110,
    },
  ],
  36: [
    { label: "Début de Ya-Sin (v. 1-12)", description: "Ya-Sin", from: 1, to: 12 },
    {
      label: "Derniers versets de Ya-Sin (v. 77-83)",
      description: "Innama amruhu...",
      from: 77,
      to: 83,
    },
  ],
  55: [
    {
      label: "Début d'Ar-Rahman (v. 1-25)",
      description: "Fabi-ayyi ala-i Rabbikuma...",
      from: 1,
      to: 25,
    },
    { label: "Fin d'Ar-Rahman (v. 60-78)", description: "Hal jaza-ul ihsan...", from: 60, to: 78 },
  ],
  56: [
    {
      label: "Début d'Al-Waqi'ah (v. 1-30)",
      description: "Idha waqa'atil-waqi'ah",
      from: 1,
      to: 30,
    },
    {
      label: "Fin d'Al-Waqi'ah (v. 75-96)",
      description: "Fala uqsimu bimawaqi'in-nujum",
      from: 75,
      to: 96,
    },
  ],
  59: [
    {
      label: "Derniers versets d'Al-Hashr (v. 22-24)",
      description: "Huwallahullazi la ilaha illa Huwa...",
      from: 22,
      to: 24,
    },
  ],
  67: [
    {
      label: "Début d'Al-Mulk (v. 1-12)",
      description: "Tabarakallazi biyadihil-mulk",
      from: 1,
      to: 12,
    },
    { label: "Sourate entière (v. 1-30)", description: "Al-Mulk complète", from: 1, to: 30 },
  ],
  87: [
    {
      label: "Sourate Al-A'la complète (v. 1-19)",
      description: "Sabbi hisma Rabbikal-A'la",
      from: 1,
      to: 19,
    },
  ],
  89: [
    {
      label: "Appel de l'Âme apaisée (v. 27-30)",
      description: "Ya ayyatuhan-nafsul-mutma'innah",
      from: 27,
      to: 30,
    },
  ],
  93: [
    {
      label: "Sourate Ad-Duha complète (v. 1-11)",
      description: "Wad-duha wal-layli idha saja",
      from: 1,
      to: 11,
    },
  ],
  94: [
    {
      label: "Sourate Ash-Sharh (v. 1-8)",
      description: "Alam nashrah laka sadrak",
      from: 1,
      to: 8,
    },
  ],
  112: [
    { label: "Al-Ikhlas complète (v. 1-4)", description: "Qul Huwallahu Ahad", from: 1, to: 4 },
  ],
  113: [
    {
      label: "Al-Falaq complète (v. 1-5)",
      description: "Qul a'udhu birabbil-falaq",
      from: 1,
      to: 5,
    },
  ],
  114: [
    { label: "An-Nas complète (v. 1-6)", description: "Qul a'udhu birabbin-nas", from: 1, to: 6 },
  ],
};
