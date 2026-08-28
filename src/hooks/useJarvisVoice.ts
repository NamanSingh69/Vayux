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
  const activeSourcesCountRef = useRef<number>(0);

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
   * Pipelined Web Audio Scheduling with accurate Active Source Tracking
   * Schedules incoming 24kHz PCM chunks on hardware clock and guarantees
   * clean state transition when playback concludes.
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
    const startTime = nextPlayTimeRef.current > now ? nextPlayTimeRef.current : (now + 0.035);
    source.start(startTime);
    nextPlayTimeRef.current = startTime + audioBuffer.duration;

    activeSourcesCountRef.current += 1;
    setIsSpeaking(true);
    isPlayingRef.current = true;

    source.onended = () => {
      activeSourcesCountRef.current = Math.max(0, activeSourcesCountRef.current - 1);
      if (activeSourcesCountRef.current === 0) {
        setIsSpeaking(false);
        isPlayingRef.current = false;
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
      activeSourcesCountRef.current = 0;
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
          if (msg.type === 'turn_complete') {
            // If all audio sources have already completed playback, un-mute immediately
            if (activeSourcesCountRef.current === 0) {
              setIsSpeaking(false);
              isPlayingRef.current = false;
              nextPlayTimeRef.current = 0;
            }
          }
          if (msg.type === 'interrupted') {
            activeSourcesCountRef.current = 0;
            setIsSpeaking(false);
            isPlayingRef.current = false;
            nextPlayTimeRef.current = 0;
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
        // Echo Gating: Mute outgoing mic chunks while assistant is speaking to prevent false barge-in
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
    activeSourcesCountRef.current = 0;
    nextPlayTimeRef.current = 0;
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