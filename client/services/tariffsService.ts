import { request, requestAuth } from "./authService";
import type { Tariff } from "../types";

export async function getActiveTariffs(): Promise<Tariff[]> {
  const res = await request<Tariff[]>("/tariffs/active");
  return res.data || [];
}

export async function getAllTariffs(): Promise<Tariff[]> {
  const res = await requestAuth<Tariff[]>("/tariffs");
  return res.data || [];
}

export interface CreateTariffPayload {
  name: string;
  description?: string;
  price: number;
  interviews: number;
}

export async function createTariff(payload: CreateTariffPayload): Promise<Tariff> {
  const res = await requestAuth<Tariff>("/tariffs", {
    method: "POST",
    body: payload,
  });
  if (!res.data) throw new Error("No tariff returned");
  return res.data;
}

export interface UpdateTariffPayload {
  name?: string;
  description?: string;
  price?: number;
  interviews?: number;
  isActive?: boolean;
}

export async function updateTariff(id: string, payload: UpdateTariffPayload): Promise<Tariff> {
  const res = await requestAuth<Tariff>(`/tariffs/${id}`, {
    method: "PATCH",
    body: payload,
  });
  if (!res.data) throw new Error("No tariff returned");
  return res.data;
}

export async function deleteTariff(id: string): Promise<void> {
  await requestAuth(`/tariffs/${id}`, {
    method: "DELETE",
  });
}
