'use client';
import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import api from '../../../lib/api';
import ScoreBoard from '../../../components/ScoreBoard';
import { Video, VideoOff, Circle, Download, RefreshCw } from 'lucide-react';

export default function StreamPage() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSize, setRecordingSize] = useState(0);
  const [matches, setMatches] = useState([]);
  const [activeMatch, setActiveMatch] = useState(null);

  const params = useSearchParams();
  const matchId = params.get('matchId');

  useEffect(() => {
    api.get('/api/matches?status=En%20cours').then(r => {
      setMatches(r.data);
      const m = matchId ? r.data.find(x => x._id === matchId) : r.data[0];
      if (m) setActiveMatch(m);
    });
    return () => stopCamera();
  }, []);

  // Poll active match score
  useEffect(() => {
    if (!activeMatch || !isStreaming) return;
    const interval = setInterval(() => {
      api.get('/api/matches/' + activeMatch._id).then(r => setActiveMatch(r.data));
    }, 3000);
    return () => clearInterval(interval);
  }, [activeMatch?._id, isStreaming]);

  async function startCamera() {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
      audio: true,
    });
    streamRef.current = stream;
    if (videoRef.current) videoRef.current.srcObject = stream;
    setIsStreaming(true);
    if (activeMatch) api.patch('/api/matches/' + activeMatch._id, { is_streaming: true });
  }

  function stopCamera() {
    stopRecording();
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsStreaming(false);
  }

  function startRecording() {
    if (!streamRef.current) return;
    chunksRef.current = [];
    setRecordingSize(0);
    const mimeType = MediaRecorder.isTypeSupported('video/mp4') ? 'video/mp4' : 'video/webm';
    const recorder = new MediaRecorder(streamRef.current, { mimeType });
    recorderRef.current = recorder;
    recorder.ondataavailable = e => {
      if (e.data.size > 0) {
        chunksRef.current.push(e.data);
        setRecordingSize(s => s + e.data.size);
      }
    };
    recorder.start(1000);
    setIsRecording(true);
  }

  function stopRecording() {
    recorderRef.current?.stop();
    recorderRef.current = null;
    setIsRecording(false);
  }

  function stopAndDownload() {
    stopRecording();
    setTimeout(() => {
      if (!chunksRef.current.length) return;
      const isMp4 = chunksRef.current[0]?.type?.includes('mp4');
      const blob = new Blob(chunksRef.current, { type: isMp4 ? 'video/mp4' : 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'match-' + (activeMatch?._id || Date.now()) + (isMp4 ? '.mp4' : '.webm');
      a.click();
      URL.revokeObjectURL(url);
    }, 500);
  }

  const mbRecorded = (recordingSize / 1024 / 1024).toFixed(1);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-2">Enregistrement vidéo</h1>
      <p className="text-sm text-gray-400 mb-6">Filmez votre match avec le score en overlay — enregistrement local</p>

      {matches.length > 1 && (
        <select
          className="w-full h-11 px-4 rounded-xl border border-gray-200 mb-4 bg-white"
          value={activeMatch?._id || ''}
          onChange={e => setActiveMatch(matches.find(m => m._id === e.target.value))}
        >
          {matches.map(m => <option key={m._id} value={m._id}>{m.player_name} vs {m.opponent_name}</option>)}
        </select>
      )}

      <div className="relative rounded-2xl overflow-hidden bg-black aspect-video mb-4">
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        {!isStreaming && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white/40">
            <Video className="w-12 h-12 mb-2" />
            <p className="text-sm">Appuyer pour démarrer la caméra</p>
          </div>
        )}
        {isStreaming && activeMatch && (
          <div className="absolute top-3 left-2 z-10" style={{ maxWidth: '55%' }}>
            <ScoreBoard score={activeMatch.score} playerName={activeMatch.player_name} opponentName={activeMatch.opponent_name} compact={true} />
          </div>
        )}
        {isRecording && (
          <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-red-600 px-2.5 py-1 rounded-full">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            <span className="text-xs font-bold text-white">REC {mbRecorded} MB</span>
          </div>
        )}
      </div>

      <div className="flex gap-3 mb-4">
        {!isStreaming ? (
          <button onClick={startCamera} className="flex-1 h-12 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition">
            <Video className="w-5 h-5" /> Démarrer la caméra
          </button>
        ) : (
          <>
            <button onClick={stopCamera} className="flex-1 h-12 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition">
              <VideoOff className="w-5 h-5" /> Arrêter
            </button>
            <button onClick={() => { stopCamera(); setTimeout(startCamera, 300); }} className="h-12 px-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition">
              <RefreshCw className="w-4 h-4" />
            </button>
          </>
        )}
      </div>

      {isStreaming && (
        <div className="bg-white border border-gray-200 rounded-2xl p-4">
          <p className="text-sm font-semibold mb-1">Enregistrement local</p>
          <p className="text-xs text-gray-400 mb-3">La vidéo est enregistrée dans le navigateur et téléchargée automatiquement à l'arrêt.</p>
          {!isRecording ? (
            <button onClick={startRecording} className="flex items-center gap-2 h-11 px-5 border border-red-300 text-red-600 rounded-xl font-semibold hover:bg-red-50 transition">
              <Circle className="w-4 h-4 fill-current" /> Démarrer l'enregistrement
            </button>
          ) : (
            <button onClick={stopAndDownload} className="flex items-center gap-2 h-11 px-5 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition">
              <Download className="w-4 h-4" /> Arrêter et télécharger ({mbRecorded} MB)
            </button>
          )}
        </div>
      )}
    </div>
  );
}
