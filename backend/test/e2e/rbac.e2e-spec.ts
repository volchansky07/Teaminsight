import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';

describe('RBAC E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let adminToken: string;
  let memberToken: string;

  let organizationId: string;
  let projectId: string;

  let statusId: string;
  let priorityId: string;
  let complexityId: string;

  beforeAll(async () => {
    process.env.JWT_ACCESS_SECRET =
      process.env.JWT_ACCESS_SECRET || 'super_access_secret';
    process.env.JWT_REFRESH_SECRET =
      process.env.JWT_REFRESH_SECRET || 'super_refresh_secret';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);

    // ---- seed checks ----
    // ---- ensure roles exist ----
    const adminRole =
      (await prisma.role.findFirst({ where: { name: 'admin' } })) ||
      (await prisma.role.create({
        data: { name: 'admin', description: 'System administrator' },
      }));

    const memberRole =
      (await prisma.role.findFirst({ where: { name: 'member' } })) ||
      (await prisma.role.create({
        data: { name: 'member', description: 'Project member' },
      }));

    // ---- ensure organization exists ----
    const organization =
      (await prisma.organization.findFirst()) ||
      (await prisma.organization.create({
        data: { name: 'E2E Organization' },
      }));

    // ---- ensure task dictionaries exist ----
    const status =
      (await prisma.taskStatus.findFirst()) ||
      (await prisma.taskStatus.create({
        data: { name: 'Todo', isFinal: false },
      }));

    const priority =
      (await prisma.taskPriority.findFirst()) ||
      (await prisma.taskPriority.create({
        data: { name: 'Medium', weight: 1 },
      }));

    const complexity =
      (await prisma.taskComplexity.findFirst()) ||
      (await prisma.taskComplexity.create({
        data: { name: 'M', pointsValue: 3 },
      }));

    statusId = status.id;
    priorityId = priority.id;
    complexityId = complexity.id;

    // ---- upsert users ----
    const adminPasswordHash = await bcrypt.hash('Admin123!', 10);
    const memberPasswordHash = await bcrypt.hash('Member123!', 10);

    await prisma.user.upsert({
      where: { email: 'admin@test.com' },
      update: {
        passwordHash: adminPasswordHash,
        roleId: adminRole.id,
        organizationId: organization.id,
        isActive: true,
      },
      create: {
        fullName: 'E2E Admin',
        email: 'admin@test.com',
        passwordHash: adminPasswordHash,
        roleId: adminRole.id,
        organizationId: organization.id,
        isActive: true,
      },
    });

    await prisma.user.upsert({
      where: { email: 'member@test.com' },
      update: {
        passwordHash: memberPasswordHash,
        roleId: memberRole.id,
        organizationId: organization.id,
        isActive: true,
      },
      create: {
        fullName: 'E2E Member',
        email: 'member@test.com',
        passwordHash: memberPasswordHash,
        roleId: memberRole.id,
        organizationId: organization.id,
        isActive: true,
      },
    });

    // ---- take orgId from DB (100% exists) ----
    const adminUser = await prisma.user.findUnique({
      where: { email: 'admin@test.com' },
    });
    if (!adminUser) throw new Error('admin@test.com not found after upsert');

    organizationId = adminUser.organizationId;

    // ---- login admin ----
    const adminRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@test.com', password: 'Admin123!' });

    expect([200, 201]).toContain(adminRes.status);
    adminToken = adminRes.body.accessToken;

    // ---- login member ----
    const memberRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'member@test.com', password: 'Member123!' });

    expect([200, 201]).toContain(memberRes.status);
    memberToken = memberRes.body.accessToken;
  });

  it('Admin can create project', async () => {
    const res = await request(app.getHttpServer())
      .post('/projects')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        organizationId,
        name: 'E2E Project',
        description: 'Created in E2E',
      });

    // если упадёт — сразу увидишь тело
    if (res.status !== 201) {
      // eslint-disable-next-line no-console
      console.log('CREATE PROJECT STATUS:', res.status);
      // eslint-disable-next-line no-console
      console.log('CREATE PROJECT BODY:', res.body);
    }

    expect(res.status).toBe(201);
    projectId = res.body.id;
  });

  it('Member cannot create task', async () => {
    const res = await request(app.getHttpServer())
      .post('/tasks')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        projectId,
        statusId,
        priorityId,
        complexityId,
        title: 'Should Fail',
      });

    // если упадёт — сразу увидишь тело
    if (res.status !== 403) {
      // eslint-disable-next-line no-console
      console.log('CREATE TASK STATUS:', res.status);
      // eslint-disable-next-line no-console
      console.log('CREATE TASK BODY:', res.body);
    }

    expect(res.status).toBe(403);
  });

  afterAll(async () => {
    // подчистим только тестовые сущности
    await prisma.projectMember.deleteMany({
      where: { user: { email: { in: ['admin@test.com', 'member@test.com'] } } },
    });

    await prisma.project.deleteMany({
      where: { name: 'E2E Project' },
    });

    await prisma.user.deleteMany({
      where: { email: { in: ['admin@test.com', 'member@test.com'] } },
    });

    await app.close();
  });
});
