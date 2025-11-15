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
    
    // Priority 1: Check for Railway PostgreSQL variables (PGHOST, PGUSER, etc.)
    const pgHost = this.configService.get<string>('PGHOST');
    const pgUser = this.configService.get<string>('PGUSER');
    const pgPassword = this.configService.get<string>('PGPASSWORD');
    const pgDatabase = this.configService.get<string>('PGDATABASE');
    const pgPort = this.configService.get<number>('PGPORT', 5432);
    
    if (pgHost && pgUser && pgPassword && pgDatabase) {
      return {
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
    }
    
    // Priority 2: Check if DATABASE_URL is provided (Railway, Heroku, etc.)
    // Skip if it contains template variables that aren't resolved
    const databaseUrl = this.configService.get<string>('DATABASE_URL') || 
                        this.configService.get<string>('POSTGRES_URL') ||
                        this.configService.get<string>('DATABASE_PUBLIC_URL');
    
    if (databaseUrl && !databaseUrl.includes('${{')) {
      try {
        // Parse DATABASE_URL: postgresql://user:password@host:port/database
        const url = new URL(databaseUrl);
        
        return {
          type: 'postgres',
          host: url.hostname,
          port: parseInt(url.port, 10) || 5432,
          username: url.username,
          password: url.password,
          database: url.pathname.slice(1), // Remove leading '/'
          entities: [User, Family, FamilyInvite, Task],
          synchronize: !isProduction,
          logging: !isProduction,
          ssl: isProduction ? { rejectUnauthorized: false } : false,
        };
      } catch (error) {
        console.error('Failed to parse DATABASE_URL:', error);
        // Fall through to individual variables
      }
    }

    // Priority 3: Fall back to individual environment variables (for local development)
    return {
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
  }
}

