import { useState, useEffect, useRef, useCallback } from 'react';

interface UseJarvisVoiceOptions {
  wsUrl?: string;
  onTranscript?: (text: string) => void;
}

export function useJarvisVoice(options: UseJarvisVoiceOptions = {}) {
  const wsUrl = options.wsUrl || process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/ws/jarvis-live";
  
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
  const isPlayingRef = useRef(false);
  const nextPlayTimeRef = useRef<number>(0);
  const speakingTimeoutRef = useRef<number | null>(null);

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

  /**
   * Pipelined Web Audio Scheduling
   * Schedules incoming 24kHz PCM chunks seamlessly on the Web Audio hardware clock
   * to eliminate cracks, pops, and stuttering.
   */
  const scheduleAudioChunk = useCallback((chunk: ArrayBuffer) => {
    if (!speakerContextRef.current) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      speakerContextRef.current = new AudioCtx({ sampleRate: 24000 });
    }

    const ctx = speakerContextRef.current;
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    // Ensure strictly even byte length for 16-bit PCM to prevent alignment distortion
    const validByteLength = chunk.byteLength - (chunk.byteLength % 2);
    if (validByteLength < 4) return;

    const pcmData = new Int16Array(chunk.slice(0, validByteLength));
    const audioBuffer = ctx.createBuffer(1, pcmData.length, 24000);
    const channelData = audioBuffer.getChannelData(0);

    for (let i = 0; i < pcmData.length; i++) {
      channelData[i] = pcmData[i] / 32768.0;
    }

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);

    const now = ctx.currentTime;
    // Add a tiny 40ms initial jitter buffer on the first chunk so continuous chunks flow seamlessly
    const startTime = nextPlayTimeRef.current > now ? nextPlayTimeRef.current : (now + 0.04);
    source.start(startTime);
    nextPlayTimeRef.current = startTime + audioBuffer.duration;

    setIsSpeaking(true);
    isPlayingRef.current = true;

    if (speakingTimeoutRef.current) {
      window.clearTimeout(speakingTimeoutRef.current);
    }
    const remainingMs = Math.max(50, (nextPlayTimeRef.current - now) * 1000 + 40);
    speakingTimeoutRef.current = window.setTimeout(() => {
      if (speakerContextRef.current && speakerContextRef.current.currentTime >= nextPlayTimeRef.current - 0.05) {
        setIsSpeaking(false);
        isPlayingRef.current = false;
        nextPlayTimeRef.current = 0;
      }
    }, remainingMs);
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
      nextPlayTimeRef.current = 0;
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
        scheduleAudioChunk(event.data);
      }
    };

    wsRef.current = ws;
  }, [wsUrl, options, scheduleAudioChunk]);

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
        // Echo Gating: Mute outgoing mic packets while assistant is speaking to prevent false interruption
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
    setIsSpeaking(false);
    isPlayingRef.current = false;
    nextPlayTimeRef.current = 0;
    if (speakingTimeoutRef.current) {
      window.clearTimeout(speakingTimeoutRef.current);
    }
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