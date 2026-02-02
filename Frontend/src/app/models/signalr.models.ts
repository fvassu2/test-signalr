export interface DeviceInfo {
  deviceId: string;
  deviceName: string;
  connectedAt: Date;
}

export interface MessageData {
  id: number;
  deviceId: string;
  deviceName: string;
  message: string;
  timestamp: Date;
}

export interface DeviceStatusUpdate {
  deviceId: string;
  deviceName: string;
  status: string;
  timestamp: Date;
}

export interface Notification {
  title: string;
  message: string;
  timestamp: Date;
}
