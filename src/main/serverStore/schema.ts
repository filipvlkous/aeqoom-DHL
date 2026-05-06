import { pgTable, varchar, integer, smallint, timestamp } from 'drizzle-orm/pg-core';

export const barcodeMask = pgTable('barcode_mask', {
  id: varchar('id', { length: 36 }).primaryKey(),
  barcode_type: varchar('barcode_type', { length: 20 }).notNull(),
  barcode_mask: varchar('barcode_mask', { length: 200 }).notNull(),
  descr: varchar('descr', { length: 500 }),
});

export const partSummary = pgTable('part_summary', {
  id: varchar('id', { length: 36 }).primaryKey(),
  created: timestamp('created', { precision: 6 }).notNull(),
  user_id: varchar('user_id', { length: 50 }),
  lpn: varchar('lpn', { length: 50 }).notNull(),
  ean: varchar('ean', { length: 50 }).notNull(),
  sn_count: integer('sn_count').notNull(),
  status: varchar('status', { length: 500 }),
});

export const scans = pgTable('scans', {
  id: varchar('id', { length: 36 }).primaryKey(),
  created: timestamp('created', { precision: 6 }).notNull(),
  part_summary_id: varchar('part_summary_id', { length: 36 }).notNull(),
  user_id: varchar('user_id', { length: 50 }),
  barcode_type: varchar('barcode_type', { length: 20 }).notNull(),
  barcode_value: varchar('barcode_value', { length: 50 }).notNull(),
});

export const setup = pgTable('setup', {
  id: varchar('id', { length: 36 }).primaryKey(),
  height_from: integer('height_from').notNull(),
  height_to: integer('height_to').notNull(),
  run_mode: smallint('run_mode').default(0),
  host_port_test: varchar('host_port_test', { length: 200 }),
  host_port_prod: varchar('host_port_prod', { length: 200 }),
  wms_api_username: varchar('wms_api_username', { length: 50 }),
  wms_api_password_test: varchar('wms_api_password_test', { length: 50 }),
  wms_api_password_prod: varchar('wms_api_password_prod', { length: 50 }),
  uri_auth: varchar('uri_auth', { length: 200 }),
  uri_user_validation: varchar('uri_user_validation', { length: 200 }),
  uri_part_summary: varchar('uri_part_summary', { length: 200 }),
  uri_scans: varchar('uri_scans', { length: 200 }),
  demo_ean: varchar('demo_ean', { length: 50 }),
  demo_sn_count: integer('demo_sn_count'),
  scan_duration_s: integer('scan_duration_s'),
});

export const setupCamera = pgTable('setup_camera', {
  id: varchar('id', { length: 36 }).primaryKey(),
  workplace_id: varchar('workplace_id', { length: 50 }).notNull(),
  camera_id: varchar('camera_id', { length: 50 }).notNull(),
  master_camera_ip: varchar('master_camera_ip', { length: 50 }),
  camera_port: integer('camera_port'),
});
