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

  @Get('projects/:projectId/monthly/team')
  getMonthlyTeamSummary(@Param('projectId') projectId: string, @Req() req) {
    return this.analyticsService.getMonthlyTeamSummary(projectId, req.user.sub);
  }

  @Get('projects/:projectId/monthly/personal')
  getMonthlyPersonalSummary(@Param('projectId') projectId: string, @Req() req) {
    return this.analyticsService.getMonthlyPersonalSummary(projectId, req.user.sub);
  }
}
