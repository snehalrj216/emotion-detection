# 🧠 Emotion Detection AI

A real-time facial emotion detection web application built using React and face-api.js.

The application uses webcam input to analyze facial expressions and identify the most likely emotion along with its confidence score. It also provides session-based analytics and tracks changes in detected emotions.

## ✨ Features

- 🎥 Real-time webcam-based face detection
- 🧠 Facial emotion recognition using face-api.js
- 📊 Emotion confidence score
- 🕒 Session duration tracking
- 🎯 Total emotion detections
- 😊 Dominant emotion detection
- 📈 Emotion analytics with percentage distribution
- 🔄 Emotion change tracking
- 📝 Recent emotion detection history
- 📱 Responsive user interface

## 🛠️ Technologies Used

- React.js
- JavaScript (ES6+)
- CSS3
- face-api.js
- react-webcam
- Vite
- HTML5

## 🧩 How It Works

The application follows a simple real-time detection process:

### 1. Capture Face

The webcam captures the facial image in real time.

### 2. AI Analysis

face-api.js analyzes facial landmarks and facial expressions.

### 3. Detect Emotion

The application identifies the strongest detected facial expression.

### 4. Confidence Score

The predicted emotion and its confidence score are displayed.

### 5. Session Analytics

The application analyzes detected emotions and displays the dominant emotion, average confidence, total detections, and emotion changes.

## 😊 Emotions Detected

The application can detect:

- 😊 Happy
- 😢 Sad
- 😠 Angry
- 😨 Fear
- 🤢 Disgusted
- 😲 Surprised
- 😐 Neutral

## 📊 Dashboard

### Session Overview

The dashboard provides:

- Session duration
- Total detections
- Dominant emotion
- Average confidence
- Number of emotion changes

### Emotion Analytics

Displays the percentage distribution of detected emotions during the current session.

### Recent Detections

Tracks recent emotion changes instead of repeatedly displaying the same emotion during every detection cycle.

## 🎥 Demo

The application performs real-time facial emotion detection using webcam input.

> **Demo Note:** The demo video uses AI-generated test footage with clear and exaggerated facial expressions, which results in very high confidence scores. With real webcam input and more subtle expressions, confidence scores may vary depending on the expression and detection conditions.

## 📸 Screenshots

Screenshots of the application dashboard and emotion analytics will be added here.

## 🚀 Getting Started

### Prerequisites

Make sure you have the following installed:

- Node.js
- npm
- Git

### Installation

Clone the repository:

```bash
git clone https://github.com/snehalrj216/emotion-detection.git