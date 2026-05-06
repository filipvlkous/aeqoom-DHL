import log from 'electron-log';
import { Pool } from 'pg';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import * as schema from '../schema';
import { BarcodeMask, PartSummary, Scan, Setup, SetupCamera } from '../types';

type DB = NodePgDatabase<typeof schema>;

class DatabaseService {
  private static instance: DatabaseService;
  private db: DB | null = null;
  private pool: Pool | null = null;
  private readyPromise: Promise<void> | null = null;

  private constructor() {}

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  public async init(): Promise<void> {
    this.readyPromise = (async () => {
      this.pool = new Pool({
        host: 'localhost',
        user: 'admin',
        password: 'admin',
        database: 'postgres',
        port: 5432,
      });
      this.db = drizzle(this.pool, { schema });
      log.info('PostgreSQL database connected and ready.');
    })();
    await this.readyPromise;
  }

  private async ensureReady(): Promise<void> {
    if (this.readyPromise) await this.readyPromise;
    if (!this.db)
      throw new Error('Database not initialized. Call init() first.');
  }

  private getDb(): DB {
    if (!this.db) {
      throw new Error('Database not initialized. Call init() first.');
    }
    return this.db;
  }

  // ── Barcode Masks ───────────────────────────────────────────

  public async getBarcodeMasks(): Promise<BarcodeMask[]> {
    await this.ensureReady();
    return this.getDb().select().from(schema.barcodeMask) as Promise<
      BarcodeMask[]
    >;
  }

  public async getBarcodeMaskById(id: string): Promise<BarcodeMask | null> {
    await this.ensureReady();
    const rows = await this.getDb()
      .select()
      .from(schema.barcodeMask)
      .where(eq(schema.barcodeMask.id, id));
    return (rows[0] as BarcodeMask) ?? null;
  }

  public async addBarcodeMask(mask: BarcodeMask): Promise<void> {
    await this.ensureReady();
    await this.getDb()
      .insert(schema.barcodeMask)
      .values(mask)
      .onConflictDoUpdate({
        target: schema.barcodeMask.id,
        set: {
          barcode_type: mask.barcode_type,
          barcode_mask: mask.barcode_mask,
          descr: mask.descr,
        },
      });
  }

  public async removeBarcodeMask(id: string): Promise<boolean> {
    await this.ensureReady();
    const result = await this.getDb()
      .delete(schema.barcodeMask)
      .where(eq(schema.barcodeMask.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  public async clearBarcodeMasks(): Promise<void> {
    await this.ensureReady();
    await this.getDb().delete(schema.barcodeMask);
  }

  // ── Part Summary ────────────────────────────────────────────

  public async getPartSummaries(): Promise<PartSummary[]> {
    await this.ensureReady();
    return this.getDb().select().from(schema.partSummary) as Promise<
      PartSummary[]
    >;
  }

  public async getPartSummaryById(id: string): Promise<PartSummary | null> {
    await this.ensureReady();
    const rows = await this.getDb()
      .select()
      .from(schema.partSummary)
      .where(eq(schema.partSummary.id, id));
    return (rows[0] as PartSummary) ?? null;
  }

  public async addPartSummary(part: PartSummary): Promise<string> {
    await this.ensureReady();
    const result = await this.getDb()
      .insert(schema.partSummary)
      .values(part)
      .onConflictDoUpdate({
        target: schema.partSummary.id,
        set: {
          created: part.created,
          user_id: part.user_id,
          lpn: part.lpn,
          ean: part.ean,
          sn_count: part.sn_count,
          status: part.status,
        },
      })
      .returning({ id: schema.partSummary.id });

    return result[0].id;
  }

  public async removePartSummary(id: string): Promise<boolean> {
    await this.ensureReady();
    const result = await this.getDb()
      .delete(schema.partSummary)
      .where(eq(schema.partSummary.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  public async clearPartSummaries(): Promise<void> {
    await this.ensureReady();
    await this.getDb().delete(schema.partSummary);
  }

  // ── Scans ───────────────────────────────────────────────────

  public async getScans(): Promise<Scan[]> {
    await this.ensureReady();
    return this.getDb().select().from(schema.scans) as Promise<Scan[]>;
  }

  public async getScansByPartSummaryId(partSummaryId: string): Promise<Scan[]> {
    await this.ensureReady();
    const rows = await this.getDb()
      .select()
      .from(schema.scans)
      .where(eq(schema.scans.part_summary_id, partSummaryId));
    return rows as Scan[];
  }

  public async getScanById(id: string): Promise<Scan | null> {
    await this.ensureReady();
    const rows = await this.getDb()
      .select()
      .from(schema.scans)
      .where(eq(schema.scans.id, id));
    return (rows[0] as Scan) ?? null;
  }

  public async addScan(scan: Scan): Promise<void> {
    await this.ensureReady();
    await this.getDb()
      .insert(schema.scans)
      .values(scan)
      .onConflictDoUpdate({
        target: schema.scans.id,
        set: {
          created: scan.created,
          part_summary_id: scan.part_summary_id,
          user_id: scan.user_id,
          barcode_type: scan.barcode_type,
          barcode_value: scan.barcode_value,
        },
      });
  }

  public async removeScan(id: string): Promise<boolean> {
    await this.ensureReady();
    const result = await this.getDb()
      .delete(schema.scans)
      .where(eq(schema.scans.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  public async clearScans(): Promise<void> {
    await this.ensureReady();
    await this.getDb().delete(schema.scans);
  }

  // ── Setup ────────────────────────────────────────────────────

  public async getSetup(): Promise<Setup | null> {
    await this.ensureReady();
    const rows = await this.getDb().select().from(schema.setup);
    return (rows[0] as Setup) ?? null;
  }

  public async upsertSetup(s: Setup): Promise<void> {
    await this.ensureReady();
    await this.getDb()
      .insert(schema.setup)
      .values(s)
      .onConflictDoUpdate({
        target: schema.setup.id,
        set: {
          height_from: s.height_from,
          height_to: s.height_to,
          run_mode: s.run_mode,
          host_port_test: s.host_port_test,
          host_port_prod: s.host_port_prod,
          wms_api_username: s.wms_api_username,
          wms_api_password_test: s.wms_api_password_test,
          wms_api_password_prod: s.wms_api_password_prod,
          uri_auth: s.uri_auth,
          uri_user_validation: s.uri_user_validation,
          uri_part_summary: s.uri_part_summary,
          uri_scans: s.uri_scans,
          demo_ean: s.demo_ean,
          demo_sn_count: s.demo_sn_count,
          scan_duration_s: s.scan_duration_s,
        },
      });
  }

  // ── Setup Camera ─────────────────────────────────────────────

  public async getSetupCameras(workplaceId: string): Promise<SetupCamera[]> {
    await this.ensureReady();
    return this.getDb()
      .select()
      .from(schema.setupCamera)
      .where(eq(schema.setupCamera.workplace_id, workplaceId)) as Promise<
      SetupCamera[]
    >;
  }

  public async getSetupCameraById(id: string): Promise<SetupCamera | null> {
    await this.ensureReady();
    const rows = await this.getDb()
      .select()
      .from(schema.setupCamera)
      .where(eq(schema.setupCamera.id, id));
    return (rows[0] as SetupCamera) ?? null;
  }

  public async addSetupCamera(camera: SetupCamera): Promise<void> {
    await this.ensureReady();
    await this.getDb()
      .insert(schema.setupCamera)
      .values(camera)
      .onConflictDoUpdate({
        target: schema.setupCamera.id,
        set: {
          workplace_id: camera.workplace_id,
          camera_id: camera.camera_id,
          master_camera_ip: camera.master_camera_ip,
          camera_port: camera.camera_port,
        },
      });
  }

  public async removeSetupCamera(id: string): Promise<boolean> {
    await this.ensureReady();
    const result = await this.getDb()
      .delete(schema.setupCamera)
      .where(eq(schema.setupCamera.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // ── Lifecycle ───────────────────────────────────────────────

  public async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      this.db = null;
      log.info('PostgreSQL database connection closed.');
    }
  }
}

export const databaseService = DatabaseService.getInstance();
