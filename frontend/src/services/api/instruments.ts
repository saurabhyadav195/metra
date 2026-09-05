/**
 * METRA Frontend — services/api/instruments.ts
 * Typed API functions for instrument CRUD operations.
 */

import type {
  CreateInstrumentInput,
  Instrument,
  InstrumentListResponse,
  UpdateInstrumentInput,
} from "@/types/instrument";
import { apiDelete, apiGet, apiPatch, apiPost } from "./client";

export interface ListInstrumentsParams {
  search?: string;
  status?: string;
  instrument_type?: string;
}

export function listInstruments(
  params: ListInstrumentsParams = {}
): Promise<InstrumentListResponse> {
  const qs = new URLSearchParams();
  if (params.search) qs.set("search", params.search);
  if (params.status) qs.set("status", params.status);
  if (params.instrument_type) qs.set("instrument_type", params.instrument_type);
  const query = qs.toString() ? `?${qs.toString()}` : "";
  return apiGet<InstrumentListResponse>(`/api/instruments${query}`);
}

export function getInstrument(id: string): Promise<Instrument> {
  return apiGet<Instrument>(`/api/instruments/${id}`);
}

export function createInstrument(
  input: CreateInstrumentInput
): Promise<Instrument> {
  return apiPost<Instrument>("/api/instruments", input);
}

export function updateInstrument(
  id: string,
  input: UpdateInstrumentInput
): Promise<Instrument> {
  return apiPatch<Instrument>(`/api/instruments/${id}`, input);
}

export function deleteInstrument(id: string): Promise<void> {
  return apiDelete(`/api/instruments/${id}`);
}
