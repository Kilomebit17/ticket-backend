import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  JoinTable,
  OneToMany,
} from 'typeorm';
import { Family } from './family.entity';
import { FamilyInvite } from './family-invite.entity';
import { Task } from './task.entity';

export enum Sex {
  MAN = 'man',
  WOMAN = 'woman',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  telegramId: string;

  @Column()
  firstName: string;

  @Column({ type: 'varchar', nullable: true })
  lastName: string | null;

  @Column({ type: 'varchar', nullable: true })
  username: string | null;

  @Column()
  name: string;

  @Column({
    type: 'enum',
    enum: Sex,
  })
  sex: Sex;

  @Column({ type: 'int', default: 0 })
  balance: number;

  @Column({ type: 'text', nullable: true })
  bio: string | null;

  @Column({ type: 'text', nullable: true })
  photoUrl: string | null;

  @ManyToMany(() => Family, (family) => family.members)
  @JoinTable({
    name: 'family_members',
    joinColumn: { name: 'userId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'familyId', referencedColumnName: 'id' },
  })
  families: Family[];

  @OneToMany(() => FamilyInvite, (invite) => invite.fromUser)
  sentInvites: FamilyInvite[];

  @OneToMany(() => FamilyInvite, (invite) => invite.toUser)
  receivedInvites: FamilyInvite[];

  @OneToMany(() => Task, (task) => task.creator)
  createdTasks: Task[];

  @OneToMany(() => Task, (task) => task.solver)
  solvedTasks: Task[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

