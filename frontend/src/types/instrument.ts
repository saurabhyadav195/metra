/**
 * METRA Frontend — types/instrument.ts
 * TypeScript types mirroring the instruments database table and API contracts.
 */

export type InstrumentStatus =
  | "registered"
  | "under_evaluation"
  | "evaluation_completed"
  | "report_generated";

export type InstrumentType =
  | "platform_scale"
  | "bench_scale"
  | "weighbridge"
  | "counter_scale"
  | "floor_scale"
  | "hopper_scale"
  | "other";

export const INSTRUMENT_TYPE_LABELS: Record<InstrumentType, string> = {
  platform_scale: "Platform Scale",
  bench_scale: "Bench Scale",
  weighbridge: "Weighbridge",
  counter_scale: "Counter Scale",
  floor_scale: "Floor Scale",
  hopper_scale: "Hopper Scale",
  other: "Other",
};

export const INSTRUMENT_STATUS_LABELS: Record<InstrumentStatus, string> = {
  registered: "Registered",
  under_evaluation: "Under Evaluation",
  evaluation_completed: "Evaluation Completed",
  report_generated: "Report Generated",
};

export const INSTRUMENT_TYPES = Object.keys(
  INSTRUMENT_TYPE_LABELS
) as InstrumentType[];

export interface Instrument {
  id: string;
  laboratory_id: string;
  created_by: string;

  // Instrument Information
  manufacturer: string;
  manufacturer_address: string | null;
  model_designation: string;
  serial_number: string;
  instrument_type: string;
  accuracy_class: string | null;

  // Metrological Parameters
  max_capacity: number | null;
  min_capacity: number | null;
  verification_scale_interval: number | null;
  actual_scale_interval: number | null;
  verification_intervals: number | null;

  // Technical Information
  load_receptor_type: string | null;
  indicating_device_type: string | null;
  software_version: string | null;
  intended_use: string | null;

  // Submission
  submission_date: string | null;
  remarks: string | null;
  status: InstrumentStatus;

  created_at: string;
  updated_at: string | null;
}

export interface CreateInstrumentInput {
  manufacturer: string;
  manufacturer_address?: string;
  model_designation: string;
  serial_number: string;
  instrument_type: InstrumentType;
  accuracy_class?: string;

  max_capacity: number;
  min_capacity?: number;
  verification_scale_interval: number;
  actual_scale_interval?: number;
  verification_intervals?: number;

  load_receptor_type?: string;
  indicating_device_type?: string;
  software_version?: string;
  intended_use?: string;

  submission_date?: string;
  remarks?: string;
}

export type UpdateInstrumentInput = Partial<CreateInstrumentInput>;

export interface InstrumentListResponse {
  instruments: Instrument[];
  total: number;
}
