# 📖 Tilawa Studio — Générateur de Vidéos de Récitation du Coran

<p align="center">
  <img src="public/favicon.svg" width="96" alt="Tilawa Studio Logo" />
  <h2 align="center">تلاوة — Tilawa Studio</h2>
  <p align="center">Créez et personnalisez des vidéos de récitation du Coran en Haute Définition (9:16, 1:1, 16:9) avec du texte arabe synchronisé, des traductions et des décors animés.</p>
</p>

---

## 🌟 Fonctionnalités Principales

### 📖 1. Sourates & Versets du Coran

- **114 Sourates Complètes** : Recherche instantanée et filtrage par type de révélation (Mecquoise / Médinoise).
- **Invocations Coraniques (Duas)** : Section dédiée aux 8 plus célèbres invocations coraniques (_Rabbana Atina_, _Dua Younus_, _Rabbi Ashrah_, etc.).
- **Sélection Flexible des Versets** : Sélectionnez des versets individuels, des plages ou toute la sourate.
- **Règle de la Basmala** : Gestion précise de la Basmala synchronisée avec l'audio EveryAyah.
- **Écoute de Prévisualisation** : Écoutez l'audio de chaque verset directement depuis la liste avant de créer la vidéo.

### 🎙️ 2. Récitateurs & Traductions

- **Grands Récitateurs** : Mishary Rashid Alafasy, Abdul Basit Abdul Samad, Saad Al-Ghamadi, etc.
- **Traductions** : Français (Hamidullah), Anglais, etc.

### 🎬 3. Animations & Style de Sous-Titres (Style CapCut)

- **5 Modes d'Animation** :
  - _Fondu (Fade In / Out)_
  - _Glissement (Slide Up)_
  - _Zoom / Pulse_
  - _Karaoké (Surlignage d'accent mot par mot)_
  - _Statique (Fixe)_
- **Boîte de sous-titres CapCut (Text Box)** : Rectangle arrondi semi-transparent (Sombre, Émeraude, Ardoise).
- **Lueurs & Ombres Néon** : Contour sombre, lueur dorée néon, ombre douce.
- **Typographies & Sliders** : Polices arabes (_Amiri_, _Cairo_, _Scheherazade New_) et curseurs de taille (80% à 140%).

### 🌌 4. Décors Vidéo & Connecteur GitHub Automatique

- **Dépôt GitHub Auto-connecté** : Connecté en temps réel à [`fmbaye09/Tilawa-videos`](https://github.com/fmbaye09/Tilawa-videos). Chaque vidéo ajoutée sur GitHub apparaît automatiquement dans l'application !
- **Importation de Médias Personnels** : Possibilité pour chaque utilisateur d'importer ses propres photos ou vidéos.
- **Formats d'Image Multiples** : Vertical (9:16 TikTok/Reels), Carré (1:1 Instagram), Paysage (16:9 YouTube).

### 📹 5. Exportation HD & Historique Local

- **Export 60 FPS HD & 12 Mbps Bitrate** : Enregistrement sur Canvas 2D ultra-fluide et net.
- **Enregistrement toujours depuis 0:00** : Départ automatique au tout début du premier verset sélectionné.
- **Historique "Mes Vidéos" (IndexedDB)** : Sauvegarde locale de vos 12 derniers exports vidéo.

---

## 🛠️ Technologies Utilisées

- **Framework** : [React 19](https://react.dev/) + [Vite](https://vitejs.dev/)
- **Routage & State** : [TanStack Router](https://tanstack.com/router) + [TanStack Query](https://tanstack.com/query)
- **Styling** : [Tailwind CSS v4](https://tailwindcss.com/) + [Lucide React](https://lucide.dev/)
- **Moteur Graphique & Audio** : Canvas 2D, HTML5 AudioContext & MediaRecorder API
- **Persistance** : Browser IndexedDB + LocalStorage

---

## 🚀 Installation & Démarrage Rapide

### Prérequis

- [Node.js](https://nodejs.org/) (v18 ou supérieure)

### 1. Cloner le projet

```bash
git clone https://github.com/fmbaye09/Tilawa.git
cd Tilawa
```

### 2. Installer les dépendances

```bash
npm install
```

### 3. Lancer le serveur de développement

```bash
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000) dans votre navigateur.

---

## ⚙️ Commandes Utiles

| Commande              | Description                                                   |
| :-------------------- | :------------------------------------------------------------ |
| `npm run dev`         | Lance le serveur de développement Vite                        |
| `npm run build`       | Compile le projet pour la production                          |
| `npm run preview`     | Prévisualise la version de production                         |
| `npm run sync-videos` | Scanne le dossier `public/videos/` local et génère les décors |
| `npm run format`      | Formate le code avec Prettier                                 |
| `npm run lint`        | Exécute la vérification ESLint                                |

---

## 📜 Licence

Ce projet est distribué sous licence MIT. Libre à vous de l'utiliser et de le contribuer.
