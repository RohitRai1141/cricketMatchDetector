# 🏏 Cricket Match Tracker

A smart cricket scoring application built with **React** and **OpenCV.js**. This app allows users to track cricket match scores in real-time and utilizes the device's camera for motion detection to assist in tracking ball deliveries.

![React](https://img.shields.io/badge/React-19-blue?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)
![OpenCV](https://img.shields.io/badge/OpenCV.js-4.8.0-green?logo=opencv)
![Tailwind](https://img.shields.io/badge/Tailwind-3.0-cyan?logo=tailwindcss)

## ✨ Features

### 🎮 Match Management
- **New Match:** Quick setup for overs, players, and team names.
- **Chase Mode:** Start a match directly from the 2nd innings by inputting the target score.
- **Resume Match:** Restore a match from any state (specific over, score, and wickets) in case of accidental browser refreshes or device swaps.
- **Local Storage:** Automatically saves match state to prevent data loss.

### 📹 Computer Vision & Camera
- **Motion Detection:** Uses **OpenCV.js** to detect ball movement and trigger scoring prompts.
- **Color Calibration:** Calibrate the camera to specific ball colors (Red Cricket Ball or Green/Yellow Tennis Ball).
- **Video Recording:** continuous video buffering allows you to download match footage at the end of the game.

### 📊 Scoring & Analysis
- **Live Scoreboard:** Tracks runs, wickets, overs, current run rate (CRR), and required run rate (RRR).
- **Match Summary:** Generates a post-match report with:
  - Statistical Highlights (Big overs, boundaries).
  - Tactical Advice based on run rate and wickets lost.
  - Match Result headlines.

## 🛠 Tech Stack

- **Frontend:** React 19, TypeScript
- **Styling:** Tailwind CSS
- **Computer Vision:** OpenCV.js (WebAssembly)
- **Icons:** Lucide React
- **Build:** ESM / Vite (Recommended)

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/cricket-match-tracker.git
   cd cricket-match-tracker
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm start
   # or
   npm run dev
   ```

4. **Open in Browser**
   Navigate to `http://localhost:3000` (or the port shown in your terminal).

   > **Note:** To use the Camera features on a mobile device, you must access the app via **HTTPS** or `localhost`. If testing on a phone on the same network, you may need a secure tunnel (like ngrok).

## 📱 How to Use

### 1. Setup
Choose your mode:
- **New:** Standard match start.
- **Chase:** Enter the 1st innings score manually to start the chase immediately.
- **Resume:** If you need to fix a state or continue a game from yesterday, input the exact current stats.

### 2. Camera Calibration (Optional)
1. Tap the **Camera** icon to enable the view.
2. Tap **"CALIBRATE"**.
3. Place the ball inside the yellow box on the screen.
4. Tap the screen to lock the color profile.
5. The app will now track objects matching that color profile to help trigger events.

### 3. Scoring
- **Manual:** Tap the `+ Add Score Manually` button (or wait for motion detection to trigger it) to open the scoring pad.
- Select runs (0, 1, 2, 3, 4, 6) or **OUT**.
- Use the **Undo** button in the header if you make a mistake.

### 4. End Game
- Click the **END** button to generate the match summary.
- You can download the recorded video footage from the summary screen.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
