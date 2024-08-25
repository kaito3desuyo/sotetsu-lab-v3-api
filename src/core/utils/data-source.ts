import { DataSourceConfig } from '../configs/database.config';
import { DataSource } from 'typeorm';

export const AppDataSource = new DataSource(DataSourceConfig);
