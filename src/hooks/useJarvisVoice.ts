import { useState, useEffect, useRef, useCallback } from 'react';

interface UseJarvisVoiceOptions {
  wsUrl?: string;
  onTranscript?: (text: string) => void;
}

export function useJarvisVoice(options: UseJarvisVoiceOptions = {}) {
  const wsUrl = options.wsUrl || process.env.NEXT_PUBLIC_WS_URL || "wss://vayux.onrender.com/ws/jarvis-live";
  
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [activeVoiceModel, setActiveVoiceModel] = useState<string>('gemini-2.5-flash-native-audio-latest');
  const [activeReasoningModel, setActiveReasoningModel] = useState<string>('gemini-3.7-flash');

  const wsRef = useRef<WebSocket | null>(null);
  
  const speakerContextRef = useRef<AudioContext | null>(null);
  const micContextRef = useRef<AudioContext | null>(null);
  const micSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const audioQueueRef = useRef<ArrayBuffer[]>([]);
  const isPlayingRef = useRef(false);
  const nextPlayTimeRef = useRef<number>(0);

  // Fetch best reasoning model for background cognitive tasks on mount
  useEffect(() => {
    async function loadBestModel() {
      try {
        const res = await fetch("/api/models/best");
        if (res.ok) {
          const data = await res.json();
          if (data.model_id) {
            setActiveReasoningModel(data.model_id);
          }
        }
      } catch {
        // Fallback initialized
      }
    }
    loadBestModel();
  }, []);

  const playNextAudioChunk = useCallback(async function playNext() {
    if (audioQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      setIsSpeaking(false);
      return;
    }

    isPlayingRef.current = true;
    setIsSpeaking(true);
    const chunk = audioQueueRef.current.shift()!;

    if (!speakerContextRef.current) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      speakerContextRef.current = new AudioCtx({ sampleRate: 24000 });
    }

    const ctx = speakerContextRef.current;
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    const pcmData = new Int16Array(chunk);
    const audioBuffer = ctx.createBuffer(1, pcmData.length, 24000);
    const channelData = audioBuffer.getChannelData(0);

    for (let i = 0; i < pcmData.length; i++) {
      channelData[i] = pcmData[i] / 32768.0;
    }

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);
    
    // Scheduled playback to eliminate jitter and audio pops
    const now = ctx.currentTime;
    const startTime = Math.max(now, nextPlayTimeRef.current);
    source.start(startTime);
    nextPlayTimeRef.current = startTime + audioBuffer.duration;

    source.onended = () => {
      if (audioQueueRef.current.length > 0) {
        playNext();
      } else {
        isPlayingRef.current = false;
        setIsSpeaking(false);
        nextPlayTimeRef.current = 0;
      }
    };
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(wsUrl);
    ws.binaryType = 'arraybuffer';

    ws.onopen = () => setIsConnected(true);
    ws.onclose = () => {
      setIsConnected(false);
      setIsRecording(false);
      setIsSpeaking(false);
      isPlayingRef.current = false;
    };

    ws.onmessage = (event) => {
      if (typeof event.data === 'string') {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'status' && msg.voice_model) {
            setActiveVoiceModel(msg.voice_model);
          }
          if (msg.type === 'transcript') {
            setTranscript((prev) => (prev ? prev + ' ' + msg.text : msg.text));
            options.onTranscript?.(msg.text);
          }
        } catch {
          // ignore non-json messages
        }
      } else if (event.data instanceof ArrayBuffer) {
        audioQueueRef.current.push(event.data);
        if (!isPlayingRef.current) {
          playNextAudioChunk();
        }
      }
    };

    wsRef.current = ws;
  }, [wsUrl, options, playNextAudioChunk]);

  const startListening = async () => {
    connect();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });
      mediaStreamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioCtx = new AudioCtx({ sampleRate: 16000 });
      
      micContextRef.current = audioCtx;
      
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }
      const source = audioCtx.createMediaStreamSource(stream);
      micSourceRef.current = source;
      
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);

      processor.onaudioprocess = (e) => {
        if (wsRef.current?.readyState !== WebSocket.OPEN) return;
        // Echo Gating: Do not forward microphone feedback while assistant is outputting audio
        if (isPlayingRef.current) return;

        const inputData = e.inputBuffer.getChannelData(0);
        const pcm16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }
        wsRef.current.send(pcm16.buffer);
      };

      source.connect(processor);
      processor.connect(audioCtx.destination);
      processorRef.current = processor;
      setIsRecording(true);
    } catch (err) {
      console.error('Failed to access microphone:', err);
    }
  };

  const stopListening = () => {
    processorRef.current?.disconnect();
    micSourceRef.current?.disconnect();
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    
    if (micContextRef.current && micContextRef.current.state !== 'closed') {
      micContextRef.current.close();
    }
    
    setIsRecording(false);
  };

  const sendTextQuery = (text: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'text_query', text }));
    }
  };

  useEffect(() => {
    return () => {
      stopListening();
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (speakerContextRef.current && speakerContextRef.current.state !== 'closed') {
        speakerContextRef.current.close();
      }
    };
  }, []);

  return {
    isConnected,
    isRecording,
    isSpeaking,
    transcript,
    activeVoiceModel,
    activeReasoningModel,
    startListening,
    stopListening,
    sendTextQuery,
    connect
  };
}