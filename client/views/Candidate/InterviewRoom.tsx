
import React, { useState, useRef, useEffect } from 'react';
import { 
  Mic, 
  CheckCircle2, 
  Loader2, 
  Video, 
  VideoOff, 
  MicOff, 
  Bot, 
  Volume2, 
  Square,
  LogOut,
  Fingerprint,
  ShieldCheck,
  MessageSquare,
  Bell,
  X,
  AudioLines,
  AudioWaveform as WaveformIcon,
  ArrowRight,
  Save,
  Loader,
  Sun,
  Moon,
  Maximize2,
  AlertCircle,
  Monitor,
  Check,
  ShieldAlert
} from 'lucide-react';
import { Job, InterviewSession, Language, Question, ChatMessage, Answer } from '../../types';
import { geminiService, encodeAudio, decodeAudio, decodeAudioData } from '../../services/geminiService';
import * as publicService from '../../services/publicService';
import { UI_STRINGS } from '../../translations';

interface InterviewRoomProps {
  job: Job;
  session: InterviewSession;
  initialLanguage: Language;
  messages: ChatMessage[];
  onComplete: (session: InterviewSession) => void | Promise<void>;
  onTranscriptUpdate?: (transcript: string) => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

const InterviewRoom: React.FC<InterviewRoomProps> = ({ job, session, initialLanguage, messages, onComplete, onTranscriptUpdate, theme, toggleTheme }) => {
  const strings = UI_STRINGS[initialLanguage];
  const tc = strings.candidate;

  // Consent state: if job requires recording, must get consent first
  const [consentGiven, setConsentGiven] = useState(!job.recordingEnabled);
  const [consentDeclined, setConsentDeclined] = useState(false);

  const [phase, setPhase] = useState<'Preparation' | 'Greeting' | 'Questioning' | 'Closing'>('Preparation');
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [subtitleText, setSubtitleText] = useState('');
  const [activeSpeaker, setActiveSpeaker] = useState<'AI' | 'Candidate' | null>(null);
  const [showMessages, setShowMessages] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [isRequestingScreen, setIsRequestingScreen] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const screenRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const sessionRef = useRef<any | null>(null); // resolved live session (safe to call directly)
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const answersRef = useRef<Answer[]>([]);
  const turnTranscriptRef = useRef('');
  const lastAiQuestionRef = useRef('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  // S3 multipart upload tracking (replaces in-memory chunk accumulation)
  const s3UploadIdRef = useRef<string | null>(null);
  const s3KeyRef = useRef<string | null>(null);
  const partNumberRef = useRef(1);
  const partsRef = useRef<{ PartNumber: number; ETag: string }[]>([]);
  const uploadQueueRef = useRef<Promise<void>>(Promise.resolve());
  // Buffer to accumulate chunks until we hit S3's 5MB minimum part size
  const chunkBufferRef = useRef<Blob[]>([]);
  const chunkBufferSizeRef = useRef(0);
  // Stored so handleEndInterview can flush after mediaRecorderRef is nulled
  const flushBufferRef = useRef<(() => void) | null>(null);
  const recordingDestRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const userMicSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const activeSpeakerRef = useRef<'AI' | 'Candidate' | null>(null);

  const screenStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    startMedia();
    return () => {
      stopMedia();
      cleanupSession();
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  useEffect(() => {
    screenStreamRef.current = screenStream;
  }, [screenStream]);

  useEffect(() => {
    setUnreadCount(messages.filter(m => !m.isRead).length);
  }, [messages]);

  // Warn before leaving while the interview is active
  useEffect(() => {
    if (phase !== 'Questioning') return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [phase]);

  const cleanupSession = () => {
    if (sessionRef.current) {
      try { sessionRef.current.close(); } catch (_) {}
      sessionRef.current = null;
    } else if (sessionPromiseRef.current) {
      sessionPromiseRef.current.then(session => { try { session.close(); } catch (_) {} });
    }
    sessionPromiseRef.current = null;
    sourcesRef.current.forEach(s => s.stop());
    sourcesRef.current.clear();
    setIsLiveActive(false);
    // Abort any in-progress S3 multipart upload
    if (s3UploadIdRef.current) {
      publicService.abortRecording(session.id).catch(() => {});
      s3UploadIdRef.current = null;
      s3KeyRef.current = null;
    }
    flushBufferRef.current = null;
  };

  const stopRecording = (): Promise<void> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
        if (userMicSourceRef.current && recordingDestRef.current) {
          try { userMicSourceRef.current.disconnect(recordingDestRef.current); } catch (_) {}
          userMicSourceRef.current = null;
          recordingDestRef.current = null;
        }
        resolve();
        return;
      }
      mediaRecorderRef.current.onstop = () => {
        mediaRecorderRef.current = null;
        if (userMicSourceRef.current && recordingDestRef.current) {
          try { userMicSourceRef.current.disconnect(recordingDestRef.current); } catch (_) {}
          userMicSourceRef.current = null;
          recordingDestRef.current = null;
        }
        resolve();
      };
      mediaRecorderRef.current.stop();
    });
  };

  const startMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
          channelCount: 1,
        } 
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      console.error("Media permission denied", err);
      alert("Microphone and Camera access is required for the interview. Please enable them in your browser settings.");
    }
  };

  const stopMedia = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  const handleStartScreenShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      setScreenStream(stream);
      setIsRequestingScreen(false);
      if (screenRef.current) screenRef.current.srcObject = stream;
    } catch (err) {
      console.error("Screen share denied", err);
      setIsRequestingScreen(false);
    }
  };

  const speakText = (text: string) => {
    if (!window.speechSynthesis) return;
    // Stop any current speech
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    // Use job's source language for TTS
    const ttsLang = job.sourceLanguage ?? initialLanguage;
    if (ttsLang === Language.UZ) utterance.lang = 'uz-UZ';
    else if (ttsLang === Language.RU) utterance.lang = 'ru-RU';
    else utterance.lang = 'en-US';
    
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  };

  const initLiveSession = async () => {
    if (!streamRef.current) return;
    
    // Input audio must be 16kHz (Live API spec). Output playback is 24kHz.
    // Use separate contexts: input capture at 16kHz, output playback at 24kHz.
    const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    await inputAudioContext.resume();
    await outputAudioContext.resume();
    
    // audioContextRef is used for output playback throughout the component
    audioContextRef.current = outputAudioContext;

    sessionPromiseRef.current = geminiService.connectLiveInterview({
      onopen: () => {
        console.log("Gemini Live: Connection opened");
        setIsLiveActive(true);
        const stream = streamRef.current;
        if (stream && typeof MediaRecorder !== 'undefined' && outputAudioContext && job.recordingEnabled) {
          try {
            const recordingDest = outputAudioContext.createMediaStreamDestination();
            recordingDestRef.current = recordingDest;
            const userMicSource = outputAudioContext.createMediaStreamSource(stream);
            userMicSourceRef.current = userMicSource;
            userMicSource.connect(recordingDest);
            const videoTracks = stream.getVideoTracks();
            const mixedAudioTracks = recordingDest.stream.getAudioTracks();
            const combinedStream = new MediaStream([...videoTracks, ...mixedAudioTracks]);
            const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus') ? 'video/webm;codecs=vp9,opus' : 'video/webm';
            const recorder = new MediaRecorder(combinedStream, { mimeType: mime, videoBitsPerSecond: 2500000, audioBitsPerSecond: 128000 });

            // Reset upload tracking
            s3UploadIdRef.current = null;
            s3KeyRef.current = null;
            partNumberRef.current = 1;
            partsRef.current = [];
            uploadQueueRef.current = Promise.resolve();
            chunkBufferRef.current = [];
            chunkBufferSizeRef.current = 0;

            // S3 requires all non-last parts to be ≥ 5MB.
            // We buffer incoming MediaRecorder chunks until we have ≥ 5MB,
            // then flush as a single part. The final flush (last part) may be < 5MB.
            const MIN_PART_SIZE = 5 * 1024 * 1024;

            const flushBuffer = () => {
              if (chunkBufferRef.current.length === 0) return;
              const blobs = chunkBufferRef.current.splice(0);
              chunkBufferSizeRef.current = 0;
              const partNumber = partNumberRef.current++;
              uploadQueueRef.current = uploadQueueRef.current.then(async () => {
                try {
                  if (!s3UploadIdRef.current) {
                    const { uploadId, key } = await publicService.initiateRecording(session.id);
                    s3UploadIdRef.current = uploadId;
                    s3KeyRef.current = key;
                  }
                  const combined = new Blob(blobs);
                  const buffer = await combined.arrayBuffer();
                  const { ETag } = await publicService.uploadRecordingChunk(session.id, partNumber, buffer);
                  partsRef.current.push({ PartNumber: partNumber, ETag });
                } catch (err) {
                  console.warn('Recording chunk upload failed', err);
                }
              });
            };

            recorder.ondataavailable = (e) => {
              if (e.data.size === 0) return;
              chunkBufferRef.current.push(e.data);
              chunkBufferSizeRef.current += e.data.size;
              // Flush once we have enough for a valid S3 non-last part
              if (chunkBufferSizeRef.current >= MIN_PART_SIZE) {
                flushBuffer();
              }
            };

            // Store in ref so handleEndInterview can flush after mediaRecorder is stopped/nulled
            flushBufferRef.current = flushBuffer;

            // 30-second timeslices — MediaRecorder fires ondataavailable every 30s.
            recorder.start(30000);
            mediaRecorderRef.current = recorder;
          } catch (err) {
            console.warn('MediaRecorder start failed', err);
          }
        }
        // Input capture uses 16kHz context (Live API requires 16kHz PCM input)
        const source = inputAudioContext.createMediaStreamSource(streamRef.current!);
        const processor = inputAudioContext.createScriptProcessor(4096, 1, 1);
        
        processor.onaudioprocess = (e: any) => {
          const input = e.inputBuffer.getChannelData(0);
          let sum = 0;
          for(let i=0; i<input.length; i++) sum += input[i]*input[i];
          const level = Math.sqrt(sum/input.length);
          setAudioLevel(level);

          const int16 = new Int16Array(input.length);
          for (let i = 0; i < input.length; i++) int16[i] = input[i] * 32768;
          
          if (sessionRef.current) {
            try {
              sessionRef.current.sendRealtimeInput({ 
                audio: { 
                  data: encodeAudio(new Uint8Array(int16.buffer)), 
                  mimeType: 'audio/pcm;rate=16000' 
                } 
              });
            } catch (err) {
              // WebSocket may have closed between audio frames — ignore silently
            }
          }
        };
        source.connect(processor);
        processor.connect(inputAudioContext.destination);

      },
      onmessage: async (msg: any) => {
        if (msg.serverContent?.interrupted) {
          sourcesRef.current.forEach(s => s.stop());
          sourcesRef.current.clear();
          nextStartTimeRef.current = 0;
          return;
        }

        const audioPart = msg.serverContent?.modelTurn?.parts?.find((p: any) => p.inlineData?.data);
        const audio = audioPart?.inlineData?.data;
        if (audio && audioContextRef.current) {
          try {
            // Browser policies often suspend AudioContext until a resume() is called inside a handler
            if (audioContextRef.current.state === 'suspended') {
              await audioContextRef.current.resume();
            }

            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, audioContextRef.current.currentTime);
            const buffer = await decodeAudioData(decodeAudio(audio), audioContextRef.current, 24000, 1);
            const source = audioContextRef.current.createBufferSource();
            source.buffer = buffer;
            source.connect(audioContextRef.current.destination);
            if (recordingDestRef.current) source.connect(recordingDestRef.current);
            source.addEventListener('ended', () => {
              sourcesRef.current.delete(source);
            });
            source.start(nextStartTimeRef.current);
            nextStartTimeRef.current += buffer.duration;
            sourcesRef.current.add(source);
          } catch (err) {
            console.error("AI Audio Playback Error:", err);
          }
        }

        // Transcription and Text handling
        const transcription = msg.serverContent?.outputTranscription?.text || "";
        const modelText = msg.serverContent?.modelTurn?.parts?.find((p: any) => p.text)?.text || "";
        const aiText = transcription || modelText;

        if (aiText && !audio) {
          console.log("Gemini Live: Audio missing, falling back to SpeechSynthesis", aiText);
          speakText(aiText);
        }
        if (transcription.toLowerCase().includes("share your screen") || 
            transcription.toLowerCase().includes("ekraningizni ulashing") ||
            transcription.toLowerCase().includes("поделитесь экраном")) {
          setIsRequestingScreen(true);
        }

        if (msg.serverContent?.inputTranscription) {
          const text = msg.serverContent.inputTranscription.text;
          setSubtitleText(text);
          setActiveSpeaker('Candidate');
          activeSpeakerRef.current = 'Candidate';
          turnTranscriptRef.current = text;
          // Q&A: AI savoliga nomzod javobini saqlash (savol bo'lmasa ham javobni saqlash – baholash uchun)
          if (text?.trim()) {
            const questionText = lastAiQuestionRef.current?.trim() || 'General response / candidate spoke';
            const qa: Answer = {
              questionId: `q${answersRef.current.length}`,
              questionText,
              text,
              timestamp: new Date().toISOString(),
            };
            answersRef.current = [...answersRef.current, qa];
            lastAiQuestionRef.current = '';
          }
        }

        // Extract text from modelTurn parts if available
        const aiTextChunks = msg.serverContent?.modelTurn?.parts?.filter((p: any) => p.text).map((p: any) => p.text).join('') || '';
        const finalAiText = msg.serverContent?.outputTranscription?.text || aiTextChunks;

        if (finalAiText) {
          const delay = Math.max(0, (nextStartTimeRef.current - audioContextRef.current.currentTime) * 1000);
          
          setTimeout(() => {
            setSubtitleText(prev => {
              if (activeSpeakerRef.current === 'AI') {
                return prev + finalAiText;
              }
              return finalAiText;
            });
            setActiveSpeaker('AI');
            activeSpeakerRef.current = 'AI';
            if (finalAiText.trim()) {
               lastAiQuestionRef.current = (activeSpeakerRef.current === 'AI' ? lastAiQuestionRef.current : '') + finalAiText;
            }
          }, delay);
        }
      },
      onerror: (err: any) => {
        console.error("Gemini Live Error:", err);
        alert("Intervyu xizmatida xatolik yuz berdi. Iltimos, sahifani yangilab qaytadan urinib ko'ring.");
      },
      onclose: (event: any) => {
        console.log("Gemini Live: Connection closed", event?.code, event?.reason);
        sessionRef.current = null;
        setIsLiveActive(false);
      }
    }, session.id, 'Puck');

    // Populate sessionRef once the promise resolves (after SDK finishes onopen),
    // then send the initial trigger message. onaudioprocess guards with
    // `if (sessionRef.current)`, so dropped frames during this window are harmless.
    const triggerMsgs = {
      [Language.UZ]: "Assalomu alaykum! Iltimos, o'zingizni tanishtiring va intervyuni boshlang. Nomzod bilan o'zbek tilida gaplashing.",
      [Language.RU]: "Здравствуйте! Пожалуйста, представьтесь и начните интервью. Говорите с кандидатом на русском языке.",
      [Language.EN]: "Hello! Please introduce yourself and start the interview as the recruiter. Speak with the candidate in English."
    };
    sessionPromiseRef.current.then(resolved => {
      sessionRef.current = resolved;
      try {
        resolved.sendClientContent({
          turns: [{ role: 'user', parts: [{ text: triggerMsgs[job.sourceLanguage] || triggerMsgs[Language.EN] }] }],
          turnComplete: true
        });
      } catch (err) {
        console.warn("Gemini Live: failed to send trigger message", err);
      }
    }).catch(() => {});
  };

  const handleEndInterview = async () => {
    if (isFinishing) return;
    setIsFinishing(true);
    await stopRecording();
    if (job.recordingEnabled) {
      // Flush remaining buffer as the final (last) S3 part — may be < 5MB, which S3 allows for last part.
      // Use flushBufferRef (not mediaRecorderRef which is nulled by stopRecording).
      if (flushBufferRef.current && chunkBufferRef.current.length > 0 && chunkBufferSizeRef.current > 0) {
        flushBufferRef.current();
      }
      flushBufferRef.current = null;
      // Wait for all queued uploads (including the final flush above which lazily
      // calls initiateRecording and sets s3UploadIdRef), THEN check if we have a
      // valid multipart upload to complete. Checking before the await would miss
      // short recordings where s3UploadIdRef is set inside the async queue.
      try {
        await uploadQueueRef.current;
        if (s3UploadIdRef.current && partsRef.current.length > 0) {
          await publicService.completeRecording(session.id, partsRef.current);
        }
      } catch (err) {
        console.warn('Recording complete failed', err);
      }
    }
    // Clear refs so cleanupSession does not abort the (now completed) upload
    s3UploadIdRef.current = null;
    s3KeyRef.current = null;
    cleanupSession();
    stopMedia();
    setTimeout(async () => {
      setIsFinishing(false);
      const finalSession = {
        ...session,
        status: 'Completed' as const,
        answers: [...answersRef.current]
      };
      await onComplete(finalSession);
    }, 1500);
  };

  const handleFinalFinish = async () => {
    const finalSession = {
      ...session,
      status: 'Completed' as const,
      answers: [...answersRef.current]
    };
    await onComplete(finalSession);
  };

  return (
    <div className="relative flex flex-col min-h-screen overflow-hidden text-white transition-colors duration-500 bg-slate-950 lg:flex-row">
      {/* Recording Consent Modal — hard gate, must agree before interview starts */}
      {job.recordingEnabled && !consentGiven && !consentDeclined && (
        <div className="fixed inset-0 z-[110] bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-6">
          <div className="bg-slate-900 border border-amber-500/30 p-8 rounded-[2.5rem] max-w-lg w-full space-y-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-center w-16 h-16 mx-auto text-amber-400 bg-amber-500/10 shadow-xl rounded-2xl">
              <ShieldAlert size={32} />
            </div>
            <div className="space-y-3 text-center">
              <h3 className="text-2xl font-black text-white">{tc.consentTitle}</h3>
              <p className="text-sm leading-relaxed text-slate-300">{tc.consentBody}</p>
            </div>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => setConsentGiven(true)}
                className="w-full py-4 font-black bg-indigo-600 rounded-2xl hover:bg-indigo-700 transition-all text-white flex items-center justify-center gap-2"
              >
                <Check size={18} /> {tc.consentAgree}
              </button>
              <button
                onClick={() => setConsentDeclined(true)}
                className="w-full py-3 font-bold text-sm bg-slate-800 text-slate-400 rounded-2xl hover:bg-slate-700 transition-all"
              >
                {tc.consentDecline}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Consent declined state */}
      {consentDeclined && (
        <div className="fixed inset-0 z-[110] bg-slate-950 flex flex-col items-center justify-center p-8 text-center space-y-6">
          <ShieldAlert size={64} className="text-amber-400" />
          <p className="text-xl font-black text-white">{tc.consentDeclinedMsg}</p>
        </div>
      )}

      {/* Heavy-duty saving overlay */}
      {isFinishing && (
        <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-xl flex flex-col items-center justify-center space-y-6">
           <Loader className="text-indigo-500 animate-spin" size={64} />
           <div className="px-6 text-center">
             <p className="mb-2 text-xl font-black tracking-tighter uppercase md:text-2xl">Finalizing Dossier</p>
             <p className="max-w-xs mx-auto text-sm text-slate-500">We are synchronizing all transcripts and AI analysis for HR review.</p>
           </div>
        </div>
      )}

      {/* Screen Share Request Modal */}
      {isRequestingScreen && (
        <div className="fixed inset-0 z-[80] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-slate-900 border border-indigo-500/30 p-8 rounded-[2.5rem] max-w-md w-full space-y-6 text-center shadow-2xl animate-in zoom-in-95">
             <div className="flex items-center justify-center w-16 h-16 mx-auto text-white bg-indigo-600 shadow-xl rounded-2xl">
               <Monitor size={32} />
             </div>
             <div className="space-y-2">
               <h3 className="text-2xl font-black">Screen Share Required</h3>
               <p className="text-sm text-slate-400">This question requires a practical demonstration. Please share your screen to proceed.</p>
             </div>
             <div className="flex gap-3">
               <button onClick={() => setIsRequestingScreen(false)} className="flex-1 py-4 font-bold bg-slate-800 rounded-2xl hover:bg-slate-700">Later</button>
               <button onClick={handleStartScreenShare} className="flex-1 py-4 font-black bg-indigo-600 shadow-lg rounded-2xl shadow-indigo-100 hover:bg-indigo-700">Share Now</button>
             </div>
          </div>
        </div>
      )}

      {/* HR Channel Overlay */}
      {showMessages && (
        <div className="fixed inset-0 lg:inset-y-0 lg:right-0 lg:left-auto lg:w-96 bg-slate-900 z-[70] flex flex-col animate-in slide-in-from-right duration-500">
           <div className="flex items-center justify-between p-6 border-b md:p-8 border-slate-800 bg-slate-900/50 backdrop-blur-xl">
              <h3 className="flex items-center gap-3 text-xl font-black">
                <MessageSquare className="text-indigo-400" />
                HR Channel
              </h3>
              <button onClick={() => setShowMessages(false)} className="p-2 transition-all hover:bg-slate-800 rounded-xl"><X size={24}/></button>
           </div>
           <div className="flex-1 p-4 space-y-4 overflow-y-auto md:p-6 md:space-y-6 custom-scrollbar">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full px-6 text-center text-slate-500">
                  <MessageSquare size={48} className="mb-4 opacity-20" />
                  <p className="text-sm font-bold tracking-widest uppercase">No messages from HR</p>
                </div>
              ) : (
                messages.map((m) => (
                  <div key={m.id} className="bg-white/5 border border-white/10 p-5 md:p-6 rounded-[2rem] md:rounded-[2.5rem] rounded-tr-none hover:border-indigo-500/30 transition-all group">
                    <p className="text-sm font-medium leading-relaxed text-slate-200">"{m.text}"</p>
                    <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center text-[9px] font-black text-slate-500 uppercase tracking-widest">
                        <span>{m.senderName}</span>
                        <span>{new Date(m.timestamp).toLocaleTimeString()}</span>
                    </div>
                  </div>
                ))
              )}
           </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="relative flex flex-col flex-1 min-h-0 p-4 space-y-4 overflow-hidden md:p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-4 bg-slate-900/50 px-4 md:px-6 py-2.5 md:py-3 rounded-2xl border border-slate-800 backdrop-blur-md">
             <div className="relative">
               <div className={`w-2 h-2 md:w-3 md:h-3 rounded-full ${isLiveActive ? 'bg-red-500 animate-pulse' : 'bg-slate-600'}`} />
               {isLiveActive && <div className="absolute inset-0 bg-red-500 rounded-full opacity-75 animate-ping" />}
             </div>
             <span className="text-[10px] md:text-xs font-black uppercase tracking-widest text-slate-400 truncate max-w-[150px] md:max-w-none">{job.title}</span>
          </div>
          
          <div className="flex items-center gap-2 md:gap-3">
            <button 
              onClick={toggleTheme}
              className="p-3 transition-all border md:p-4 bg-slate-900 rounded-2xl border-slate-800 hover:bg-slate-800 text-slate-300"
            >
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <button onClick={() => setShowMessages(!showMessages)} className="relative p-3 transition-all border md:p-4 bg-slate-900 rounded-2xl border-slate-800 hover:bg-slate-800">
               <MessageSquare size={18} className="text-slate-300" />
               {unreadCount > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 md:w-5 md:h-5 bg-indigo-600 rounded-full text-[9px] md:text-[10px] flex items-center justify-center font-black animate-in zoom-in border-2 border-slate-900">{unreadCount}</span>}
            </button>
          </div>
        </div>

        <div className="flex-1 bg-slate-900 rounded-[2rem] md:rounded-[3.5rem] overflow-hidden relative shadow-2xl border border-slate-800 group flex flex-col min-h-0">
          <div className="relative flex-1 min-h-0 w-full">
            <video ref={videoRef} autoPlay muted className="w-full h-full object-cover scale-x-[-1] transition-transform duration-700 outline-none" />
            {screenStream && (
              <div className="absolute min-w-[100px] w-1/4 md:w-1/5 overflow-hidden bg-black border border-indigo-500/70 shadow-2xl top-3 right-3 aspect-video rounded-xl animate-in fade-in zoom-in">
                <video ref={screenRef} autoPlay className="object-contain w-full h-full" />
              </div>
            )}
          </div>
          
          <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-3 p-3 md:p-8 md:gap-5">
             {isLiveActive && (
               <div className="flex items-center h-8 gap-1 mb-1 md:h-12 md:mb-2">
                 {[...Array(16)].map((_, i) => (
                    <div 
                      key={i} 
                      className="w-1 md:w-1.5 bg-indigo-500 rounded-full transition-all duration-75 shadow-lg"
                      style={{ height: `${Math.max(20, audioLevel * (Math.random() * 250 + 150))}%` }}
                    />
                 ))}
               </div>
             )}

             {subtitleText && (
                <div className="bg-slate-950/95 backdrop-blur-3xl p-4 md:p-8 rounded-2xl md:rounded-[2.5rem] max-w-5xl w-full text-center shadow-2xl border border-white/10 animate-in slide-in-from-bottom-8">
                  <div className="flex flex-col items-center gap-2 md:gap-3">
                    <span className={`text-[8px] md:text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${
                      activeSpeaker === 'AI' ? 'bg-indigo-600 border-indigo-400' : 'bg-emerald-600 border-emerald-400'
                    }`}>
                      {activeSpeaker === 'AI' ? 'AI Recruiter Speaking' : 'Capturing Candidate Speech'}
                    </span>
                    <p className="text-base font-black leading-tight text-white md:text-2xl line-clamp-3">
                      {subtitleText}
                    </p>
                  </div>
                </div>
             )}
          </div>
          
          {!isLiveActive && phase === 'Greeting' && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm">
               <div className="flex items-center gap-2 px-6 border shadow-2xl md:gap-3 md:py-4 bg-slate-900 rounded-2xl md:rounded-3xl border-slate-800 animate-pulse">
                  <ShieldCheck className="text-indigo-400" />
                  <span className="text-[10px] md:text-sm font-black uppercase tracking-widest">Awaiting Activation</span>
               </div>
            </div>
          )}
        </div>
      </div>

      <div className="w-full lg:w-[420px] xl:w-[480px] bg-slate-900 border-t lg:border-t-0 lg:border-l border-slate-800 flex flex-col shrink-0 min-h-[280px] lg:min-h-0">
        {phase === 'Preparation' ? (
           <div className="flex flex-col flex-1 p-6 space-y-6 overflow-y-auto sm:p-10 md:p-14 md:space-y-10 custom-scrollbar">
             <div className="space-y-4 text-center">
               <div className="flex items-center justify-center w-20 h-20 mx-auto mb-6 text-white bg-indigo-600 shadow-xl rounded-3xl">
                 <Bot size={40} />
               </div>
               <h2 className="text-3xl font-black leading-none tracking-tight">Adaptive AI <br/><span className="text-indigo-500">Recruiter</span></h2>
               <p className="text-sm font-medium text-slate-400">Ready to start the {job.experienceLevel} level assessment.</p>
             </div>

             <div className="space-y-4">
               <div className="flex gap-4 p-5 border bg-slate-800/50 rounded-2xl border-slate-700">
                 <div className="flex items-center justify-center w-8 h-8 text-indigo-400 shrink-0 bg-indigo-500/10 rounded-xl">
                    <ShieldCheck size={16} />
                 </div>
                 <div className="space-y-0.5">
                   <p className="text-xs font-black tracking-wider uppercase">Assessment Active</p>
                   <p className="text-[10px] text-slate-500 leading-relaxed">Session is recorded for evaluation. Settle in a quiet, well-lit space.</p>
                 </div>
               </div>
             </div>

             <button 
               onClick={() => { if (consentGiven) { setPhase('Questioning'); initLiveSession(); } }}
               disabled={!consentGiven}
               className="w-full py-4 md:py-6 bg-indigo-600 rounded-2xl font-black text-lg md:text-xl hover:bg-indigo-700 shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3 mt-4 disabled:opacity-40 disabled:cursor-not-allowed"
             >
               Begin Interview <ArrowRight size={24} />
             </button>
           </div>
        ) : phase === 'Questioning' ? (
          <div className="flex flex-col flex-1 p-4 space-y-4 md:p-10 md:space-y-8">
            <div className="flex items-center justify-between">
               <div className="flex items-center gap-2 md:gap-3">
                 <AudioLines className="text-indigo-400" size={18} />
                 <h3 className="text-[10px] md:text-xs font-black uppercase tracking-widest text-slate-400">Adaptive Dialogue</h3>
               </div>
               <div className="flex items-center gap-2">
                 <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                 <span className="text-[8px] md:text-[10px] font-black text-emerald-500 uppercase tracking-widest">Live</span>
               </div>
            </div>
            
            <div className="flex-1 pr-2 space-y-4 overflow-y-auto md:space-y-6 custom-scrollbar">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-4 md:space-y-8 py-10 md:py-20 border-2 border-dashed border-slate-800 rounded-[2rem] md:rounded-[3rem]">
                  <Bot size={32} className="opacity-20" />
                  <div className="px-6 text-center">
                    <p className="font-black uppercase text-[8px] md:text-[10px] tracking-widest mb-2">Protocol Active</p>
                    <p className="italic text-[10px] md:text-xs leading-relaxed">AI is evaluating depth and logic.</p>
                  </div>
                </div>
              ) : (
                messages.map(m => (
                  <div key={m.id} className="p-6 md:p-8 bg-indigo-600/5 rounded-[2rem] md:rounded-[2.5rem] border border-indigo-600/10 animate-in slide-in-from-right duration-500 hover:border-indigo-600/40 transition-all">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                      <span className="text-[8px] md:text-[9px] font-black text-indigo-400 uppercase tracking-widest">Update</span>
                    </div>
                    <p className="text-xs font-bold leading-relaxed md:text-sm text-slate-200">"{m.text}"</p>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 md:p-8 bg-slate-800/50 rounded-2xl md:rounded-[2.5rem] border border-slate-700 space-y-4 md:space-y-6 shadow-inner">
              <div className="flex justify-between items-center text-[8px] md:text-[10px] font-black uppercase tracking-widest">
                <span className="text-slate-500">Audio Feedback</span>
                <span className="text-emerald-500">Responsive</span>
              </div>
              <div className="flex h-3 gap-1 md:h-4">
                {[...Array(24)].map((_, i) => (
                  <div key={i} className={`flex-1 rounded-full transition-all duration-300 ${i < audioLevel * 80 ? 'bg-indigo-500' : 'bg-slate-700'}`} />
                ))}
              </div>
            </div>

            <button 
              disabled={isFinishing}
              onClick={handleEndInterview} 
              className="w-full py-4 md:py-6 bg-slate-800/80 text-slate-400 hover:text-white hover:bg-red-600 rounded-2xl md:rounded-[2.5rem] font-black text-[10px] md:text-xs uppercase tracking-[0.2em] transition-all disabled:opacity-50 active:scale-95 border border-slate-700"
            >
              {isFinishing ? <Loader className="mx-auto animate-spin" size={18} /> : 'End Session'}
            </button>
          </div>
        ) : (
          <div className="flex flex-col justify-center flex-1 p-6 space-y-8 overflow-y-auto text-center md:p-12 md:space-y-10">
            <div className="relative w-32 h-32 mx-auto md:w-40 md:h-40">
               <div className="absolute inset-0 bg-emerald-500/10 rounded-[2.5rem] md:rounded-[3.5rem] animate-pulse border border-emerald-500/20" />
               <div className="relative w-full h-full bg-emerald-500/10 rounded-[2.5rem] md:rounded-[3.5rem] flex items-center justify-center border border-emerald-500/40 shadow-xl">
                 <CheckCircle2 size={56} className="md:size-20 text-emerald-500" />
               </div>
            </div>
            <div className="space-y-4 md:space-y-6">
              <h2 className="text-3xl font-black leading-tight tracking-tighter md:text-5xl">Dossier <br/><span className="text-emerald-500">Finalized</span></h2>
              <p className="px-4 text-sm font-medium leading-relaxed text-slate-400 md:text-lg md:px-6">
                Your performance metrics have been sent to the HR panel.
              </p>
              <p className="text-xs font-bold tracking-widest uppercase text-amber-400/90">
                Important: Click &quot;Complete Interview&quot; below to save your answers and receive AI evaluation.
              </p>
            </div>
            <button 
              onClick={handleFinalFinish} 
              className="w-full py-5 md:py-7 bg-indigo-600 rounded-2xl font-black text-lg md:text-xl hover:bg-indigo-700 transition-all shadow-xl active:scale-95 flex items-center justify-center gap-3 group"
            >
              Complete Interview <ArrowRight className="transition-transform group-hover:translate-x-2" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default InterviewRoom;
