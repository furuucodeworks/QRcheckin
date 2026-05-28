import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import "./App.css";

// アプリの状態
type AppState = "scanning" | "confirming" | "submitting" | "success" | "error";

// モード
type Mode = "auto" | "confirm";

// パス情報
type PassInfo = {
  passId: string;
  expiresAt: string | undefined;
  isExpired: boolean;
};

export default function App() {
  const [appState, setAppState] = useState<AppState>("scanning");
  const [mode, setMode] = useState<Mode>("auto");
  const [passInfo, setPassInfo] = useState<PassInfo | null>(null);
  const [optionUsed, setOptionUsed] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [countdown, setCountdown] = useState(4);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scanningRef = useRef(false);
  const modeRef = useRef<Mode>("auto");

  // カメラ起動
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "user" } })
      .then((stream) => {
        video.srcObject = stream;
        video.play().catch(() => {});
      });
  }, []);

  // QR読み取りループ
  useEffect(() => {
    if (appState !== "scanning") {
      scanningRef.current = false;
      return;
    }
    scanningRef.current = true;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const tick = async () => {
      if (!scanningRef.current) return;
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const result = jsQR(imageData.data, canvas.width, canvas.height);
        if (result) {
          let passId: string | null = null;
          try {
            const url = new URL(result.data);
            passId = url.searchParams.get("pass_id");
          } catch {
            // 有効なURLでなければ無視する
          }
          if (passId) {
            scanningRef.current = false;
            await handleScan(passId);
            return;
          }
        }
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [appState]);

  // 完了後カウントダウン
  useEffect(() => {
    if (appState !== "success") return;
    setCountdown(4);
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(interval);
          setAppState("scanning");
          return 4;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [appState]);

  // QR読み取り後の処理
  async function handleScan(passId: string) {
    try {
      const res = await fetch(
        `/api/pass?pass_id=${encodeURIComponent(passId)}`,
      );
      const data = await res.json();
      if (!data.ok) {
        setErrorMsg(data.error ?? "エラーが発生しました");
        setAppState("error");
        return;
      }
      if (modeRef.current === "auto") {
        await submitCheckin(passId, false);
      } else {
        setPassInfo(data);
        setOptionUsed(false);
        setAppState("confirming");
      }
    } catch {
      setErrorMsg("サーバーに接続できませんでした");
      setAppState("error");
    }
  }

  // チェックイン登録
  async function submitCheckin(passId: string, optionUsed: boolean) {
    setAppState("submitting");
    try {
      const res = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pass_id: passId, option_used: optionUsed }),
      });
      const data = await res.json();
      if (!data.ok) {
        setErrorMsg(data.error ?? "登録に失敗しました");
        setAppState("error");
        return;
      }
      setAppState("success");
    } catch {
      setErrorMsg("サーバーに接続できませんでした");
      setAppState("error");
    }
  }

  return (
    <div className="app">
      <div className="mode-toggle">
        <button
          className={mode === "auto" ? "active" : ""}
          onClick={() => {
            setMode("auto");
            modeRef.current = "auto";
          }}
        >
          自動
        </button>
        <button
          className={mode === "confirm" ? "active" : ""}
          onClick={() => {
            setMode("confirm");
            modeRef.current = "confirm";
          }}
        >
          確認
        </button>
      </div>

      <div className="camera-wrapper">
        <video ref={videoRef} playsInline muted />
        <canvas ref={canvasRef} />
      </div>

      {appState === "scanning" && (
        <p className="status">QRコードをかざしてください</p>
      )}

      {appState === "confirming" && passInfo && (
        <div className="confirm-card">
          <h2>チェックイン確認</h2>
          <p>パスID: {passInfo.passId}</p>
          <p>有効期限: {passInfo.expiresAt ?? "未設定"}</p>
          <p className={passInfo.isExpired ? "expired" : "valid"}>
            {passInfo.isExpired ? "期限切れです" : "利用可能です"}
          </p>
          <label>
            <input
              type="checkbox"
              checked={optionUsed}
              onChange={(e) => setOptionUsed(e.target.checked)}
            />
            保険料利用
          </label>
          <button
            className="btn btn-primary"
            onClick={() => submitCheckin(passInfo.passId, optionUsed)}
          >
            チェックイン登録
          </button>
          <button
            className="btn btn-cancel"
            onClick={() => setAppState("scanning")}
          >
            キャンセル
          </button>
        </div>
      )}

      {appState === "submitting" && <p className="status">登録中...</p>}

      {appState === "success" && (
        <div className="success">
          <h2>✅ チェックイン完了</h2>
          <p>{countdown}秒後にカメラに戻ります</p>
        </div>
      )}

      {appState === "error" && (
        <div>
          <p className="error-text">{errorMsg}</p>
          <button
            className="btn btn-cancel"
            onClick={() => setAppState("scanning")}
          >
            戻る
          </button>
        </div>
      )}
    </div>
  );
}
