import { useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js";
import Webcam from "react-webcam";
import "./App.css";

// ==========================================
// EMOTION DATA
// ==========================================

const emotionData = {
  happy: {
    label: "Happy",
    emoji: "😊",
  },

  sad: {
    label: "Sad",
    emoji: "😢",
  },

  angry: {
    label: "Angry",
    emoji: "😡",
  },

  fearful: {
    label: "Fear",
    emoji: "😨",
  },

  disgusted: {
    label: "Disgusted",
    emoji: "🤢",
  },

  surprised: {
    label: "Surprised",
    emoji: "😮",
  },

  neutral: {
    label: "Neutral",
    emoji: "😐",
  },
};

// ==========================================
// CONFIDENCE THRESHOLD
// ==========================================

const CONFIDENCE_THRESHOLD = 0.6;

// ==========================================
// APP
// ==========================================

function App() {
  const webcamRef = useRef(null);

  // NEW: canvas overlay for drawing face box + landmarks
  const canvasRef = useRef(null);

  const detectionInterval = useRef(null);

  // Stores the last emotion shown in Recent Detections
  const lastHistoryEmotion = useRef(null);

  // Prevents multiple async detections from running together
  const detectionInProgress = useRef(false);

  const sessionStartTime = useRef(null);

  // ========================================
  // STATES
  // ========================================

  const [modelsLoaded, setModelsLoaded] = useState(false);

  // NEW: surface model load failures instead of an infinite "Loading..." button
  const [modelError, setModelError] = useState(null);

  const [cameraOn, setCameraOn] = useState(false);

  const [currentEmotion, setCurrentEmotion] = useState(null);

  const [confidence, setConfidence] = useState(0);

  // NEW: tracks whether a face is currently visible in frame
  const [faceDetected, setFaceDetected] = useState(false);

  const [history, setHistory] = useState([]);

  const [analytics, setAnalytics] = useState({
    total: 0,

    emotions: {
      happy: 0,
      sad: 0,
      angry: 0,
      fearful: 0,
      disgusted: 0,
      surprised: 0,
      neutral: 0,
    },
  });

  const [sessionDuration, setSessionDuration] = useState(0);

  const [totalConfidence, setTotalConfidence] = useState(0);

  const [emotionChanges, setEmotionChanges] = useState(0);

  // ========================================
  // LOAD AI MODELS
  // ========================================

  useEffect(() => {
    const loadModels = async () => {
      try {
        const MODEL_URL = "/models";

        await faceapi.nets.tinyFaceDetector.loadFromUri(
          MODEL_URL
        );

        await faceapi.nets.faceLandmark68Net.loadFromUri(
          MODEL_URL
        );

        await faceapi.nets.faceExpressionNet.loadFromUri(
          MODEL_URL
        );

        setModelsLoaded(true);
        setModelError(null);

        console.log(
          "AI Models Loaded Successfully"
        );
      } catch (error) {
        console.error(
          "Model loading error:",
          error
        );

        // NEW: show a real message instead of leaving the button stuck
        setModelError(
          "Couldn't load the AI models. Check your connection and refresh the page."
        );
      }
    };

    loadModels();

    return () => {
      if (detectionInterval.current) {
        clearInterval(
          detectionInterval.current
        );
      }
    };
  }, []);

  // ========================================
  // SESSION TIMER
  // ========================================

  useEffect(() => {
    if (
      !cameraOn ||
      !sessionStartTime.current
    ) {
      return;
    }

    const timer = setInterval(() => {
      const elapsed = Math.floor(
        (Date.now() -
          sessionStartTime.current) /
          1000
      );

      setSessionDuration(elapsed);
    }, 1000);

    return () => clearInterval(timer);
  }, [cameraOn]);

  // ========================================
  // DETECT EMOTION
  // ========================================

  const detectEmotion = async () => {
    if (
      !webcamRef.current ||
      !webcamRef.current.video ||
      webcamRef.current.video.readyState !== 4 ||
      !modelsLoaded
    ) {
      return;
    }

    // ======================================
    // PREVENT OVERLAPPING DETECTIONS
    // ======================================

    if (detectionInProgress.current) {
      return;
    }

    detectionInProgress.current = true;

    try {
      const video = webcamRef.current.video;

      const detection =
        await faceapi
          .detectSingleFace(
            video,
            new faceapi.TinyFaceDetectorOptions()
          )
          .withFaceLandmarks()
          .withFaceExpressions();

      // ======================================
      // NEW: keep the overlay canvas in sync
      // with the video element's rendered size
      // ======================================

      const canvas = canvasRef.current;

      if (canvas) {
        const displaySize = {
          width: video.videoWidth,
          height: video.videoHeight,
        };

        faceapi.matchDimensions(canvas, displaySize);

        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (detection) {
          const resized = faceapi.resizeResults(
            detection,
            displaySize
          );

          faceapi.draw.drawDetections(canvas, resized);
          faceapi.draw.drawFaceLandmarks(canvas, resized);
        }
      }

      // ======================================
      // NEW: no face in frame — clear current
      // emotion instead of leaving a stale label
      // ======================================

      if (!detection) {
        setFaceDetected(false);
        setCurrentEmotion(null);
        setConfidence(0);
        return;
      }

      setFaceDetected(true);

      const expressions =
        detection.expressions;

      // ======================================
      // FIND STRONGEST EMOTION
      // ======================================

      const strongestEmotion =
        Object.keys(expressions).reduce(
          (a, b) =>
            expressions[a] >
            expressions[b]
              ? a
              : b
        );

      const emotionConfidence =
        expressions[strongestEmotion];

      // ======================================
      // IGNORE LOW-CONFIDENCE RESULTS
      // ======================================

      if (
        emotionConfidence <
        CONFIDENCE_THRESHOLD
      ) {
        // NEW: still a face, just not a confident
        // read — reflect that instead of freezing
        // on the last confident label
        setCurrentEmotion(null);
        setConfidence(0);
        return;
      }

      const displayEmotion =
        emotionData[
          strongestEmotion
        ]?.label ||
        strongestEmotion;

      const numericConfidence =
        emotionConfidence * 100;

      // ======================================
      // CURRENT EMOTION
      // ======================================

      setCurrentEmotion(
        displayEmotion
      );

      setConfidence(
        numericConfidence
      );

      // ======================================
      // ANALYTICS
      // ======================================

      setAnalytics((previous) => ({
        total:
          previous.total + 1,

        emotions: {
          ...previous.emotions,

          [strongestEmotion]:
            previous.emotions[
              strongestEmotion
            ] + 1,
        },
      }));

      // ======================================
      // TOTAL CONFIDENCE
      // ======================================

      setTotalConfidence(
        (previous) =>
          previous +
          numericConfidence
      );

      // ======================================
      // SMART HISTORY
      // Only save when emotion changes
      // ======================================

      if (
        lastHistoryEmotion.current !==
        displayEmotion
      ) {
        const newDetection = {
          emotion:
            displayEmotion,

          confidence:
            numericConfidence.toFixed(1),

          time:
            new Date().toLocaleTimeString(),

          emoji:
            emotionData[
              strongestEmotion
            ]?.emoji ||
            "🙂",
        };

        setHistory((previous) => [
          newDetection,
          ...previous,
        ].slice(0, 5));

        // Don't count the first
        // detection as a change
        if (
          lastHistoryEmotion.current !==
          null
        ) {
          setEmotionChanges(
            (previous) =>
              previous + 1
          );
        }

        lastHistoryEmotion.current =
          displayEmotion;
      }
    } catch (error) {
      console.error(
        "Emotion detection error:",
        error
      );
    } finally {
      // Allow the next detection
      detectionInProgress.current =
        false;
    }
  };

  // ========================================
  // START CAMERA
  // ========================================

  const startCamera = () => {
    sessionStartTime.current =
      Date.now();

    setSessionDuration(0);

    setTotalConfidence(0);

    setEmotionChanges(0);

    setCurrentEmotion(null);

    setConfidence(0);

    setFaceDetected(false);

    setHistory([]);

    setAnalytics({
      total: 0,

      emotions: {
        happy: 0,
        sad: 0,
        angry: 0,
        fearful: 0,
        disgusted: 0,
        surprised: 0,
        neutral: 0,
      },
    });

    lastHistoryEmotion.current =
      null;

    detectionInProgress.current =
      false;

    setCameraOn(true);

    if (detectionInterval.current) {
      clearInterval(
        detectionInterval.current
      );
    }

    detectionInterval.current =
      setInterval(
        detectEmotion,
        1000
      );
  };

  // ========================================
  // STOP CAMERA
  // ========================================

  const stopCamera = () => {
    setCameraOn(false);

    if (detectionInterval.current) {
      clearInterval(
        detectionInterval.current
      );

      detectionInterval.current =
        null;
    }

    setCurrentEmotion(null);

    setConfidence(0);

    setFaceDetected(false);

    sessionStartTime.current =
      null;

    lastHistoryEmotion.current =
      null;

    detectionInProgress.current =
      false;

    // NEW: clear any leftover box/landmarks drawn on canvas
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  // ========================================
  // RESET ANALYTICS
  // ========================================

  const resetAnalytics = () => {
    setAnalytics({
      total: 0,

      emotions: {
        happy: 0,
        sad: 0,
        angry: 0,
        fearful: 0,
        disgusted: 0,
        surprised: 0,
        neutral: 0,
      },
    });

    setHistory([]);

    setCurrentEmotion(null);

    setConfidence(0);

    setSessionDuration(0);

    setTotalConfidence(0);

    setEmotionChanges(0);

    lastHistoryEmotion.current =
      null;

    detectionInProgress.current =
      false;
  };

  // ========================================
  // FORMAT DURATION
  // ========================================

  const formatDuration = (
    seconds
  ) => {
    const minutes =
      Math.floor(seconds / 60);

    const remainingSeconds =
      seconds % 60;

    return `${String(
      minutes
    ).padStart(2, "0")}:${String(
      remainingSeconds
    ).padStart(2, "0")}`;
  };

  // ========================================
  // DOMINANT EMOTION
  // ========================================

  const dominantEmotionKey =
    Object.keys(
      analytics.emotions
    ).reduce((a, b) =>
      analytics.emotions[a] >
      analytics.emotions[b]
        ? a
        : b
    );

  const dominantEmotion =
    analytics.total > 0
      ? emotionData[
          dominantEmotionKey
        ]?.label
      : "—";

  const dominantEmoji =
    analytics.total > 0
      ? emotionData[
          dominantEmotionKey
        ]?.emoji
      : "🙂";

  // ========================================
  // AVERAGE CONFIDENCE
  // ========================================

  const averageConfidence =
    analytics.total > 0
      ? (
          totalConfidence /
          analytics.total
        ).toFixed(1)
      : "0.0";

  // ========================================
  // EMOTION PERCENTAGES
  // ========================================

  const getPercentage = (key) => {
    if (
      analytics.total === 0
    ) {
      return "0.0";
    }

    return (
      (analytics.emotions[key] /
        analytics.total) *
      100
    ).toFixed(1);
  };

  // ========================================
  // RENDER
  // ========================================

  return (
    <div className="app">

      {/* ==================================
          HEADER
      ================================== */}

      <header className="header">

        <h1>
          🧠 Emotion Detection AI
        </h1>

        <p>
          Real-time facial emotion
          analysis using AI
        </p>

      </header>

      {/* ==================================
          CAMERA
      ================================== */}

      <section className="camera-section">

        <div className="camera-container">

          {cameraOn ? (

            <div className="webcam-wrapper" style={{ position: "relative" }}>

              <Webcam
                ref={webcamRef}
                audio={false}
                className="webcam"
                videoConstraints={{
                  facingMode: "user",
                }}
              />

              {/* NEW: overlay canvas for face box + landmarks */}
              <canvas
                ref={canvasRef}
                className="overlay-canvas"
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  pointerEvents: "none",
                }}
              />

              {/* NEW: visible "no face detected" hint */}
              {!faceDetected && (
                <div className="no-face-badge">
                  No face detected
                </div>
              )}

            </div>

          ) : (

            <div className="camera-placeholder">

              <span>
                📷
              </span>

              <h3>
                Camera is Off
              </h3>

              <p>
                Start the camera to begin
                emotion detection.
              </p>

            </div>

          )}

        </div>

        <div className="camera-controls">

          {!cameraOn ? (

            <button
              className="start-btn"
              onClick={startCamera}
              disabled={!modelsLoaded}
            >

              {modelError
                ? "⚠ Models Failed to Load"
                : modelsLoaded
                ? "▶ Start Camera"
                : "⏳ Loading AI Models..."}

            </button>

          ) : (

            <button
              className="stop-btn"
              onClick={stopCamera}
            >

              ■ Stop Camera

            </button>

          )}

        </div>

        {/* NEW: visible error message if models failed to load */}
        {modelError && (
          <p className="model-error">
            {modelError}
          </p>
        )}

        {/* CURRENT EMOTION */}

        {cameraOn && (

          currentEmotion ? (

            <div className="current-emotion">

              <span className="emotion-emoji">

                {
                  Object.values(
                    emotionData
                  ).find(
                    (item) =>
                      item.label ===
                      currentEmotion
                  )?.emoji
                }

              </span>

              <div>

                <span>
                  Current Emotion
                </span>

                <strong>
                  {currentEmotion}
                </strong>

              </div>

              <div className="confidence">

                {confidence.toFixed(1)}%

              </div>

            </div>

          ) : (

            // NEW: explicit state instead of showing
            // nothing / a stale label
            <div className="current-emotion current-emotion--empty">

              <span className="emotion-emoji">
                🙂
              </span>

              <div>

                <span>
                  Current Emotion
                </span>

                <strong>
                  {faceDetected
                    ? "Analyzing..."
                    : "No face in frame"}
                </strong>

              </div>

            </div>

          )

        )}

      </section>

      {/* ==================================
          SESSION OVERVIEW
      ================================== */}

      <section className="session-overview">

        <div className="session-heading">

          <h2>
            📊 Session Overview
          </h2>

          <p>
            Live analysis of your
            current session
          </p>

        </div>

        <div className="session-grid">

          <div className="session-card">

            <span className="session-icon">
              ⏱️
            </span>

            <div>

              <small>
                Duration
              </small>

              <strong>
                {formatDuration(
                  sessionDuration
                )}
              </strong>

            </div>

          </div>

          <div className="session-card">

            <span className="session-icon">
              🎯
            </span>

            <div>

              <small>
                Detections
              </small>

              <strong>
                {analytics.total}
              </strong>

            </div>

          </div>

          <div className="session-card">

            <span className="session-icon">
              {dominantEmoji}
            </span>

            <div>

              <small>
                Dominant Emotion
              </small>

              <strong>
                {dominantEmotion}
              </strong>

            </div>

          </div>

          <div className="session-card">

            <span className="session-icon">
              📈
            </span>

            <div>

              <small>
                Avg. Confidence
              </small>

              <strong>
                {averageConfidence}%
              </strong>

            </div>

          </div>

          <div className="session-card">

            <span className="session-icon">
              🔄
            </span>

            <div>

              <small>
                Emotion Changes
              </small>

              <strong>
                {emotionChanges}
              </strong>

            </div>

          </div>

        </div>

      </section>

      {/* ==================================
          DASHBOARD
      ================================== */}

      <section className="dashboard">

        {/* =================================
            RECENT DETECTIONS
        ================================= */}

        <div className="recent-section">

          <div className="section-heading">

            <div>

              <h2>
                🕘 Recent Detections
              </h2>

              <p>
                Emotion changes detected
              </p>

            </div>

          </div>

          {history.length === 0 ? (

            <div className="empty-state">

              <span>
                🔍
              </span>

              <p>
                No emotion changes yet
              </p>

            </div>

          ) : (

            <div className="history-list">

              {history.map(
                (item, index) => (

                  <div
                    className="history-item"
                    key={index}
                  >

                    <span className="history-emoji">
                      {item.emoji}
                    </span>

                    <strong>
                      {item.emotion}
                    </strong>

                    <span className="history-confidence">
                      {item.confidence}%
                    </span>

                    <span className="history-time">
                      {item.time}
                    </span>

                  </div>

                )
              )}

            </div>

          )}

        </div>

        {/* =================================
            EMOTION ANALYTICS
        ================================= */}

        <div className="analytics-section">

          <div className="section-heading">

            <div>

              <h2>
                📈 Emotion Analytics
              </h2>

              <p>
                Real-time emotion distribution
              </p>

            </div>

            <button
              className="reset-btn"
              onClick={resetAnalytics}
            >
              Reset
            </button>

          </div>

          {/* TOP CARDS */}

          <div className="analytics-top">

            <div className="analytics-card">

              <span>
                🔎
              </span>

              <div>

                <small>
                  Total Detections
                </small>

                <strong>
                  {analytics.total}
                </strong>

              </div>

            </div>

            <div className="analytics-card">

              <span>
                {dominantEmoji}
              </span>

              <div>

                <small>
                  Dominant Emotion
                </small>

                <strong>
                  {dominantEmotion}
                </strong>

              </div>

            </div>

          </div>

          {/* EMOTION BARS */}

          <div className="emotion-grid">

            {Object.keys(
              analytics.emotions
            ).map((key) => {

              const percentage =
                getPercentage(key);

              return (

                <div
                  className="emotion-item"
                  key={key}
                >

                  <div className="emotion-info">

                    <span className="emotion-name">

                      {
                        emotionData[
                          key
                        ].emoji
                      }

                      {" "}

                      {
                        emotionData[
                          key
                        ].label
                      }

                    </span>

                    <span className="emotion-percentage">

                      {percentage}%

                    </span>

                  </div>

                  <div className="progress-bar">

                    <div
                      className="progress-fill"
                      style={{
                        width:
                          `${percentage}%`,
                      }}
                    />

                  </div>

                </div>

              );

            })}

          </div>

          {/* SMALL STATS */}

          <div className="analytics-stats">

            <div>

              <small>
                Average Confidence
              </small>

              <strong>
                {averageConfidence}%
              </strong>

            </div>

            <div>

              <small>
                Emotion Changes
              </small>

              <strong>
                {emotionChanges}
              </strong>

            </div>

          </div>

        </div>

      </section>

      {/* ==================================
          HOW IT WORKS
      ================================== */}

      <section className="how-it-works">

        <div className="how-heading">

          <h2>
            ⚙️ How It Works
          </h2>

          <p>
            From camera input to
            emotion prediction
          </p>

        </div>

        <div className="steps">

          <div className="step-card">

            <span>
              📷
            </span>

            <small>
              01
            </small>

            <h3>
              Capture Face
            </h3>

            <p>
              Webcam captures your facial
              image in real time.
            </p>

          </div>

          <div className="step-card">

            <span>
              🧠
            </span>

            <small>
              02
            </small>

            <h3>
              AI Analysis
            </h3>

            <p>
              Face-api.js analyzes facial
              landmarks and expressions.
            </p>

          </div>

          <div className="step-card">

            <span>
              😊
            </span>

            <small>
              03
            </small>

            <h3>
              Detect Emotion
            </h3>

            <p>
              The strongest facial expression
              is identified.
            </p>

          </div>

          <div className="step-card">

            <span>
              📊
            </span>

            <small>
              04
            </small>

            <h3>
              Confidence
            </h3>

            <p>
              The predicted emotion and
              confidence score are displayed.
            </p>

          </div>

        </div>

      </section>

      {/* ==================================
          FOOTER
      ================================== */}

      <footer>
        Powered by React • face-api.js • AI — runs 100% client-side, no video data leaves your browser
      </footer>

    </div>
  );
}

export default App;