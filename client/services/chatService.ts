import { requestAuth } from "./authService";
import type { ChatMessage } from "../types";

export interface ApiChatMessage {
  id: string;
  applicationId: string;
  text: string;
  senderName: string;
  timestamp: string;
  isRead: boolean;
}

function mapApiMessageToMessage(api: ApiChatMessage): ChatMessage {
  return {
    id: api.id,
    applicationId: api.applicationId,
    text: api.text,
    senderName: api.senderName,
    timestamp: api.timestamp,
    isRead: api.isRead,
  };
}

export async function getChat(applicationId?: string): Promise<ChatMessage[]> {
  const query = applicationId ? `?applicationId=${applicationId}` : "";
  const res = await requestAuth<ApiChatMessage[]>(`/chat${query}`);
  return (res.data ?? []).map(mapApiMessageToMessage);
}

export async function sendMessage(applicationId: string, text: string): Promise<ChatMessage> {
  const res = await requestAuth<ApiChatMessage>(`/chat/${applicationId}`, {
    method: "POST",
    body: { text },
  });
  if (!res.data) throw new Error("No message returned");
  return mapApiMessageToMessage(res.data);
}
