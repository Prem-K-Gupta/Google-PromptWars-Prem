
import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';

interface LiveTacticianProps {
  active: boolean;
}

export const LiveTactician: React.FC<LiveTacticianProps> = ({ active }) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sessionRef = useRef<any>(null);

  const stopLive = () => {
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    setIsConnected(false);
  };

  const startLive = async () => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) return;
    
    setIsConnecting(true);
    const ai = new GoogleGenAI({ apiKey });
    
    // Decoding/Encoding helpers as per guidelines
    const decode = (base64: string) => {
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
      return bytes;
    };

    const encode = (bytes: Uint8Array) => {
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
      return btoa(binary);
    };

    async function decodeAudioData(data: Uint8Array, ctx: AudioContext) {
      const dataInt16 = new Int16Array(data.buffer);
      const buffer = ctx.createBuffer(1, dataInt16.length, 24000);
      const channelData = buffer.getChannelData(0);
      for (let i = 0; i < dataInt16.length; i++) channelData[i] = dataInt16[i] / 32768.0;
      return buffer;
    }

    let nextStartTime = 0;
    const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    audioContextRef.current = outputAudioContext;

    const sessionPromise = ai.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-12-2025',
      callbacks: {
        onopen: async () => {
          setIsConnected(true);
          setIsConnecting(false);
          
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const inputAudioContext = new AudioContext({ sampleRate: 16000 });
            const source = inputAudioContext.createMediaStreamSource(stream);
            const processor = inputAudioContext.createScriptProcessor(4096, 1, 1);
            
            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const int16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) int16[i] = inputData[i] * 32768;
              
              sessionPromise.then(session => {
                session.sendRealtimeInput({
                  media: {
                    data: encode(new Uint8Array(int16.buffer)),
                    mimeType: 'audio/pcm;rate=16000'
                  }
                });
              });
            };
            
            source.connect(processor);
            processor.connect(inputAudioContext.destination);
          } catch (err) {
            console.error("Mic access denied", err);
            stopLive();
          }
        },
        onmessage: async (message) => {
          const base64 = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
          if (base64) {
            nextStartTime = Math.max(nextStartTime, outputAudioContext.currentTime);
            const buffer = await decodeAudioData(decode(base64), outputAudioContext);
            const source = outputAudioContext.createBufferSource();
            source.buffer = buffer;
            source.connect(outputAudioContext.destination);
            source.start(nextStartTime);
            nextStartTime += buffer.duration;
          }
        },
        onclose: () => setIsConnected(false),
        onerror: () => setIsConnected(false)
      },
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } },
        systemInstruction: 'You are the Bridge Tactician for the starship Void Cadet. Provide helpful, gritty, sci-fi advice based on the user audio. Keep it brief and atmospheric.'
      }
    });
    
    sessionRef.current = await sessionPromise;
  };

  useEffect(() => {
    if (active && !isConnected && !isConnecting) startLive();
    if (!active && isConnected) stopLive();
    return () => stopLive();
  }, [active]);

  if (!active) return null;

  return (
    <div className="absolute top-24 left-6 z-20 flex items-center gap-3 bg-blue-900/40 border border-blue-500/30 p-2 rounded-lg backdrop-blur-sm">
      <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
      <span className="text-[10px] font-black uppercase tracking-tighter text-blue-200">
        {isConnecting ? 'Establishing Comms...' : isConnected ? 'Comms Active' : 'Offline'}
      </span>
      {isConnected && (
        <div className="audio-bars">
          {[1, 2, 3].map(i => <div key={i} className="audio-bar" style={{ animationDelay: `${i * 0.1}s` }} />)}
        </div>
      )}
    </div>
  );
};
