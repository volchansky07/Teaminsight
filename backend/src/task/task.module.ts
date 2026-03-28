import { Module } from '@nestjs/common';
import { TaskService } from './task.service';
import { TaskController } from './task.controller';
import { NotificationModule } from '../notification/notification.module';

@Module({
  providers: [TaskService],
  controllers: [TaskController],
  imports: [NotificationModule],
})
export class TaskModule {}
