import { ElectronHandler } from '../main/preload';

declare global {
  // eslint-disable-next-line no-unused-vars
  interface Window {
    electron: ElectronHandler;
    dbAPI: {
      // Setup Cameras
      getSetupCameras: () => Promise<
        {
          id: string;
          workplace_id: string;
          camera_id: string;
          master_camera_ip: string | null;
          camera_port: number | null;
        }[]
      >;
      addSetupCamera: (camera: {
        id: string;
        workplace_id: string;
        camera_id: string;
        master_camera_ip: string | null;
        camera_port: number | null;
      }) => Promise<void>;
      removeCamera: (id: string) => Promise<void>;

      // Setup
      getSetup: () => Promise<{
        id: string;
        height_from: number;
        height_to: number;
        scan_duration_s: number | null;
        [key: string]: any;
      } | null>;
      upsertSetup: (s: object) => Promise<void>;

      // Barcode Masks
      getBarcodeMasks: () => Promise<
        {
          id: string;
          barcode_type: string;
          barcode_mask: string;
          descr: string | null;
        }[]
      >;
      getBarcodeMask: (id: string) => Promise<{
        id: string;
        barcode_type: string;
        barcode_mask: string;
        descr: string | null;
      } | null>;
      addBarcodeMask: (mask: {
        id: string;
        barcode_type: string;
        barcode_mask: string;
        descr: string | null;
      }) => Promise<void>;
      removeBarcodeMask: (id: string) => Promise<boolean>;
      clearBarcodeMasks: () => Promise<void>;
    };
    workplaceStore: {
      getSelectedWorkplace: () => Promise<string>;
      setSelectedWorkplace: (workplaceId: string) => Promise<void>;
    };
  }
}

export {};
