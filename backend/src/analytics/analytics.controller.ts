import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

type AnalyticsPeriod = '7d' | '14d' | '30d';

@UseGuards(JwtAuthGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('projects/:projectId/personal')
  getPersonalAnalytics(
    @Param('projectId') projectId: string,
    @Query('period') period: AnalyticsPeriod = '14d',
    @Req() req,
  ) {
    return this.analyticsService.getPersonalAnalytics(
      projectId,
      req.user.sub,
      period,
    );
  }

  @Get('projects/:projectId/team')
  getTeamAnalytics(
    @Param('projectId') projectId: string,
    @Query('period') period: AnalyticsPeriod = '14d',
    @Req() req,
  ) {
    return this.analyticsService.getTeamAnalytics(
      projectId,
      req.user.sub,
      period,
    );
  }

  @Get('projects/:projectId/monthly')
  getMonthlySummary(@Param('projectId') projectId: string, @Req() req) {
    return this.analyticsService.getMonthlySummary(projectId, req.user.sub);
  }
}
