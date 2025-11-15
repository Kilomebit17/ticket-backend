import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions, TypeOrmOptionsFactory } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { Family } from '../entities/family.entity';
import { FamilyInvite } from '../entities/family-invite.entity';
import { Task } from '../entities/task.entity';

@Injectable()
export class DatabaseConfig implements TypeOrmOptionsFactory {
  constructor(private configService: ConfigService) {}

  createTypeOrmOptions(): TypeOrmModuleOptions {
    const isProduction = this.configService.get<string>('NODE_ENV') === 'production';
    
    // Priority 1: Use DATABASE_PUBLIC_URL (Railway public network with TCP proxy)
    // This uses domain name instead of IPv6 address, which is more reliable
    const databasePublicUrl = this.configService.get<string>('DATABASE_PUBLIC_URL');
    if (databasePublicUrl && !databasePublicUrl.includes('${{')) {
      try {
        const url = new URL(databasePublicUrl);
        const config: TypeOrmModuleOptions = {
          type: 'postgres',
          host: url.hostname,
          port: parseInt(url.port, 10) || 5432,
          username: url.username,
          password: url.password,
          database: url.pathname.slice(1),
          entities: [User, Family, FamilyInvite, Task],
          synchronize: !isProduction,
          logging: !isProduction,
          ssl: isProduction ? { rejectUnauthorized: false } : false,
        };
        console.log(`[DatabaseConfig] Using DATABASE_PUBLIC_URL: ${url.hostname}:${config.port}`);
        return config;
      } catch (error) {
        console.error('[DatabaseConfig] Failed to parse DATABASE_PUBLIC_URL:', error);
      }
    }
    
    // Priority 2: Use RAILWAY_PRIVATE_DOMAIN if available (domain name instead of IP)
    const railwayPrivateDomain = this.configService.get<string>('RAILWAY_PRIVATE_DOMAIN');
    const pgUser = this.configService.get<string>('PGUSER') || this.configService.get<string>('POSTGRES_USER');
    const pgPassword = this.configService.get<string>('PGPASSWORD') || this.configService.get<string>('POSTGRES_PASSWORD');
    const pgDatabase = this.configService.get<string>('PGDATABASE') || this.configService.get<string>('POSTGRES_DB');
    
    if (railwayPrivateDomain && pgUser && pgPassword && pgDatabase) {
      const config: TypeOrmModuleOptions = {
        type: 'postgres',
        host: railwayPrivateDomain,
        port: 5432,
        username: pgUser,
        password: pgPassword,
        database: pgDatabase,
        entities: [User, Family, FamilyInvite, Task],
        synchronize: !isProduction,
        logging: !isProduction,
        ssl: isProduction ? { rejectUnauthorized: false } : false,
      };
      console.log(`[DatabaseConfig] Using RAILWAY_PRIVATE_DOMAIN: ${railwayPrivateDomain}`);
      return config;
    }
    
    // Priority 3: Check if DATABASE_URL is provided (Railway, Heroku, etc.)
    // Skip if it contains template variables that aren't resolved
    const databaseUrl = this.configService.get<string>('DATABASE_URL') || 
                        this.configService.get<string>('POSTGRES_URL');
    
    if (databaseUrl && !databaseUrl.includes('${{')) {
      try {
        const url = new URL(databaseUrl);
        const config: TypeOrmModuleOptions = {
          type: 'postgres',
          host: url.hostname,
          port: parseInt(url.port, 10) || 5432,
          username: url.username,
          password: url.password,
          database: url.pathname.slice(1),
          entities: [User, Family, FamilyInvite, Task],
          synchronize: !isProduction,
          logging: !isProduction,
          ssl: isProduction ? { rejectUnauthorized: false } : false,
        };
        console.log(`[DatabaseConfig] Using DATABASE_URL: ${url.hostname}:${config.port}`);
        return config;
      } catch (error) {
        console.error('[DatabaseConfig] Failed to parse DATABASE_URL:', error);
      }
    }
    
    // Priority 4: Check for Railway PostgreSQL variables (PGHOST, PGUSER, etc.)
    // Only use if PGHOST is a domain name, not IPv6 address
    const pgHost = this.configService.get<string>('PGHOST');
    const pgPort = this.configService.get<number>('PGPORT', 5432);
    
    if (pgHost && pgUser && pgPassword && pgDatabase) {
      // Skip IPv6 addresses - they often don't work reliably
      if (!pgHost.includes(':')) {
        const config: TypeOrmModuleOptions = {
          type: 'postgres',
          host: pgHost,
          port: pgPort,
          username: pgUser,
          password: pgPassword,
          database: pgDatabase,
          entities: [User, Family, FamilyInvite, Task],
          synchronize: !isProduction,
          logging: !isProduction,
          ssl: isProduction ? { rejectUnauthorized: false } : false,
        };
        console.log(`[DatabaseConfig] Using PGHOST: ${pgHost}:${pgPort}`);
        return config;
      } else {
        console.warn(`[DatabaseConfig] Skipping PGHOST (IPv6 address detected): ${pgHost}`);
      }
    }

    // Priority 5: Fall back to individual environment variables (for local development)
    const config: TypeOrmModuleOptions = {
      type: 'postgres',
      host: this.configService.get<string>('DB_HOST', 'localhost'),
      port: this.configService.get<number>('DB_PORT', 5432),
      username: this.configService.get<string>('DB_USERNAME', 'postgres'),
      password: this.configService.get<string>('DB_PASSWORD', 'postgres'),
      database: this.configService.get<string>('DB_DATABASE', 'tickets_app'),
      entities: [User, Family, FamilyInvite, Task],
      synchronize: !isProduction,
      logging: !isProduction,
    };
    console.log(`[DatabaseConfig] Using fallback config: ${config.host}:${config.port}`);
    return config;
  }
}

