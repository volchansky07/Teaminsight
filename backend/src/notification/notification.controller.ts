import { Controller, Get, Patch, Param, Req, UseGuards } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get('my')
  getMyNotifications(@Req() req) {
    return this.notificationService.getMyNotifications(req.user.sub);
  }

  @Get('my/unread-count')
  getUnreadCount(@Req() req) {
    return this.notificationService.getUnreadCount(req.user.sub);
  }

  @Patch(':id/read')
  markAsRead(@Param('id') id: string, @Req() req) {
    return this.notificationService.markAsRead(id, req.user.sub);
  }

  @Patch('read-all')
  markAllAsRead(@Req() req) {
    return this.notificationService.markAllAsRead(req.user.sub);
  }
}
