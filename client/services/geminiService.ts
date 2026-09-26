
import { GoogleGenAI, Modality } from "@google/genai";
import { Question, InterviewType, Evaluation, Language, InterviewCategory, Answer, ResumeAnalysis, ExperienceLevel } from "../types";
import { requestAuth } from "./authService";
import * as publicService from "./publicService";

// Audio Utilities for Live API
export function encodeAudio(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function decodeAudio(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  // Ensure we handle potential alignment issues and byte length
  const buffer_to_use = data.buffer.byteLength % 2 === 0 
    ? data.buffer 
    : data.buffer.slice(0, data.buffer.byteLength - 1);
    
  const dataInt16 = new Int16Array(buffer_to_use);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export const geminiService = {
  async generateQuestions(
    role: string, 
    skills: string[], 
    type: InterviewType,
    category: InterviewCategory,
    level: ExperienceLevel,
    description: string,
    language: Language = Language.RU
  ): Promise<Question[]> {
    const res = await requestAuth<Question[]>("/jobs/generate-questions", {
      method: "POST",
      body: { role, skills, type, category, level, description, language },
    });
    return res.data ?? [];
  },

  async analyzeResume(fileBase64: string, mimeType: string, jobTitle: string, requiredSkills: string[]): Promise<ResumeAnalysis> {
    return publicService.analyzeResume(fileBase64, mimeType, jobTitle, requiredSkills);
  },

  async connectLiveInterview(callbacks: any, sessionId: string, _voiceName: string = 'Puck') {
    const { token, model } = await publicService.createLiveToken(sessionId);
    const ai = new GoogleGenAI({
      apiKey: token,
      httpOptions: { apiVersion: 'v1alpha' },
    });
    // When using an ephemeral token with `lockAdditionalFields: []`, ALL config
    // is already locked server-side inside the token's liveConnectConstraints.
    // Sending config again in the setup message to BidiGenerateContentConstrained
    // causes the server to reject and immediately close the connection.
    // The model must still be passed (required field), but config must be omitted.
    return ai.live.connect({
      model,
      callbacks,
    });
  },

  async translateUI(content: any, _targetLanguage: Language): Promise<any> {
    return content;
  },

  async evaluateInterview(
    _jobTitle: string,
    _answers: { questionText: string, answerText: string, questionId: string }[]
  ): Promise<{ evaluation: Evaluation, gradedAnswers: Answer[] }> {
    throw new Error("Client-side Gemini evaluation is disabled; use the backend session completion endpoint.");
  }
};
