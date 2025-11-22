import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FamilyController } from './family.controller';
import { FamilyService } from './family.service';
import { Family, FamilySchema } from '../entities/family.entity';
import { FamilyInvite, FamilyInviteSchema } from '../entities/family-invite.entity';
import { User, UserSchema } from '../entities/user.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Family.name, schema: FamilySchema },
      { name: FamilyInvite.name, schema: FamilyInviteSchema },
      { name: User.name, schema: UserSchema },
    ]),
    AuthModule,
  ],
  controllers: [FamilyController],
  providers: [FamilyService],
  exports: [FamilyService],
})
export class FamilyModule {}

