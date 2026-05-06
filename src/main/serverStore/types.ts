export interface HostEntry {
  id: string;
  name: string;
  host: string;
  port: string;
  auto: boolean;
}

export interface BarcodeMask {
  id: string;
  barcode_type: string;
  barcode_mask: string;
  descr: string | null;
}

export interface PartSummary {
  id: string;
  created: Date;
  user_id: string | null;
  lpn: string;
  ean: string;
  sn_count: number;
  status: string | null;
}

export interface Scan {
  id: string;
  created: Date;
  part_summary_id: string;
  user_id: string | null;
  barcode_type: string;
  barcode_value: string;
}

export interface Setup {
  id: string;
  height_from: number;
  height_to: number;
  run_mode: number | null;
  host_port_test: string | null;
  host_port_prod: string | null;
  wms_api_username: string | null;
  wms_api_password_test: string | null;
  wms_api_password_prod: string | null;
  uri_auth: string | null;
  uri_user_validation: string | null;
  uri_part_summary: string | null;
  uri_scans: string | null;
  demo_ean: string | null;
  demo_sn_count: number | null;
  scan_duration_s: number | null;
}

export interface SetupCamera {
  id: string;
  workplace_id: string;
  camera_id: string;
  master_camera_ip: string | null;
  camera_port: number | null;
}

export interface AppConfig {
  selectedWorkplace: string;
  authToken: string;
  appMode: string;
}