export type UserRole = 'admin' | 'user';

export interface User {
  id: string;
  username: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  date_joined: string;
  last_login: string | null;
}

export interface AuthResponse {
  success: boolean;
  data: {
    access: string;
    refresh: string;
    user: User;
  };
}

export type AlertStatus = 'overdue' | 'critical' | 'warning' | 'upcoming' | 'ok';

export interface CalibrationRecord {
  id: string;
  instrument: string;
  calibrated_on: string;
  calibration_due_date: string;
  report_file_url: string | null;
  notes: string;
  days_until_due: number;
  alert_status: AlertStatus;
  created_by: User | null;
  created_at: string;
}

export type InstrumentStatus = 'active' | 'inactive' | 'under_maintenance' | 'decommissioned';

export interface Instrument {
  id: string;
  name: string;
  serial_number: string;
  location: string;
  department: string;
  description: string;
  status: InstrumentStatus;
  is_deleted: boolean;
  calibration_records: CalibrationRecord[];
  latest_calibration: CalibrationRecord | null;
  created_by: User | null;
  created_at: string;
  updated_at: string;
}

export interface AlertRecipient {
  id: string;
  name: string;
  email: string;
  designation: string;
  active: boolean;
  added_by: string | null;
  created_at: string;
  updated_at: string;
}

export type TriggerType = '90_days' | '30_days' | '20_days';
export type NotificationStatus = 'SUCCESS' | 'FAILED';

export interface NotificationLog {
  id: string;
  instrument: string;
  instrument_name: string;
  instrument_serial_number: string;
  calibration_record: string;
  calibration_due_date: string;
  trigger_type: TriggerType;
  recipient_email: string;
  status: NotificationStatus;
  error_message: string;
  sent_at: string;
  year: number;
}

export interface PaginatedResponse<T> {
  count: number;
  total_pages: number;
  current_page: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    status_code: number;
    detail: any;
  };
}
