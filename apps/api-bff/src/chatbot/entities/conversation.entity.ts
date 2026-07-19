import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

@Entity('conversations')
export class Conversation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  sessionId!: string; 

  @Column()
  userId!: string;      

  @Column('text')
  userMessage!: string;  

  @Column('text')
  assistantResponse!: string; 

  @CreateDateColumn()
  createdAt!: Date;
}