import { DataSourceConfig } from '../configs/database.config.js';
import { DataSource } from 'typeorm';

export const AppDataSource = new DataSource(DataSourceConfig);
