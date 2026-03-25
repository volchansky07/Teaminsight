'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import api from '@/services/api';
import KanbanColumn from '@/components/KanbanColumn';
import AppHeader from '@/components/AppHeader';
import ContributionLeaderboard from '@/components/ContributionLeaderboard';
import InlineNotice from '@/components/InlineNotice';
import ProjectTeamSection from '@/components/ProjectTeamSection';
import EditTaskModal from '@/components/EditTaskModal';
import TaskReportsPanel from '@/components/TaskReportsPanel';
import { useRouter } from 'next/navigation';
import TaskReportSubmitModal from '@/components/TaskReportSubmitModal';
import ConfirmActionModal from '@/components/ConfirmActionModal';
import TaskReportReviewModal from '@/components/TaskReportReviewModal';
import TaskReportModal from '@/components/TaskReportModal';


interface Task {
  id: string;
  title: string;
  description?: string | null;
  dueDate?: string | null;
  completedAt?: string | null;
  isArchived?: boolean;
  archivedAt?: string | null;
  archiveReason?: 'MANUAL' | 'AUTO' | null;
  requiresReport?: boolean;
  reportType?: 'TEXT' | 'LINK' | 'FILE' | 'IMAGE' | null;
  latestReportStatus?: 'SUBMITTED' | 'APPROVED' | 'REJECTED' | null;
  status: {
    id: string;
    name: string;
  };
  assignee?: {
    id: string;
    fullName: string;
  } | null;
  priority?: {
    id: string;
    name: string;
    weight?: number;
  } | null;
  complexity?: {
    id: string;
    name: string;
    pointsValue?: number;
  } | null;
}

interface Project {
  id: string;
  name: string;
  description?: string | null;
}

interface DashboardData {
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
}

interface StatusItem {
  id: string;
  name: string;
}

interface PriorityItem {
  id: string;
  name: string;
}

interface ComplexityItem {
  id: string;
  name: string;
}

interface ProjectMemberItem {
  userId: string;
  fullName: string;
  email?: string;
  roleInProject: string;
}

interface OrganizationUserItem {
  id: string;
  fullName: string;
  email: string;
  role?: {
    name: string;
  } | null;
}

interface ContributionItem {
  employeeId: string;
  fullName: string;
  roleInProject: string;
  completedTasks: number;
  inProgressTasks: number;
  todoTasks: number;
  totalAssignedTasks: number;
  completedComplexityPoints: number;
  completedPriorityScore: number;
  onTimeCompletedTasks: number;
  overdueTasks: number;
  onTimeRate: number;
  contributionScore: number;
}

interface TaskReportItem {
  id: string;
  taskId: string;
  content?: string | null;
  fileUrl?: string | null;
  originalFileName?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
  reportType: 'TEXT' | 'LINK' | 'FILE' | 'IMAGE';
  status: 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  managerComment?: string | null;
  createdAt: string;
  reviewedAt?: string | null;
  author?: {
    id: string;
    fullName: string;
    email?: string;
  } | null;
  task?: {
    id: string;
    title: string;
  } | null;
  reviewedBy?: {
    id: string;
    fullName: string;
  } | null;
}

interface NoticeState {
  type: 'success' | 'error';
  message: string;
}

export default function DashboardPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [contributions, setContributions] = useState<ContributionItem[]>([]);
  const [members, setMembers] = useState<ProjectMemberItem[]>([]);
  const [organizationUsers, setOrganizationUsers] = useState<
    OrganizationUserItem[]
  >([]);
  const [reports, setReports] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);

  const [authToken, setAuthToken] = useState('');

  const [currentUserId, setCurrentUserId] = useState<string>('');

  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);

  const [statuses, setStatuses] = useState<StatusItem[]>([]);
  const [priorities, setPriorities] = useState<PriorityItem[]>([]);
  const [complexities, setComplexities] = useState<ComplexityItem[]>([]);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [statusId, setStatusId] = useState('');
  const [priorityId, setPriorityId] = useState('');
  const [complexityId, setComplexityId] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [requiresReport, setRequiresReport] = useState(false);
  const [reportType, setReportType] = useState<
    'TEXT' | 'LINK' | 'FILE' | 'IMAGE' | ''
  >('');

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('');

  const router = useRouter();

  const [reviewModalTask, setReviewModalTask] = useState<any | null>(null);
  const [reviewModalReport, setReviewModalReport] = useState<any | null>(null);

  const [reportModalTask, setReportModalTask] = useState<any | null>(null);

  const handleOpenReportModal = (task: any) => {
    setReportModalTask(task);
  };

  const [notice, setNotice] = useState<NoticeState | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [archivingTask, setArchivingTask] = useState<Task | null>(null);
  const [archiving, setArchiving] = useState(false);

  const [hideTaskModalTask, setHideTaskModalTask] = useState<Task | null>(null);
  const [hideTaskLoading, setHideTaskLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token') || '';
    setAuthToken(token);

    if (!token) {
      setCurrentUserId('');
      return;
    }

    const payload = parseJwt(token);
    setCurrentUserId(payload?.sub ?? '');
  }, []);

  useEffect(() => {
    const syncToken = () => {
      const newToken = localStorage.getItem('token') || '';

      if (newToken !== authToken) {
        resetDashboardState();
        setAuthToken(newToken);

        const payload = parseJwt(newToken);
        setCurrentUserId(payload?.sub ?? '');
      }
    };

    window.addEventListener('focus', syncToken);
    window.addEventListener('storage', syncToken);

    return () => {
      window.removeEventListener('focus', syncToken);
      window.removeEventListener('storage', syncToken);
    };
  }, [authToken]);

  const loadData = async () => {
  try {
    const [
      projectRes,
      tasksRes,
      dashboardRes,
      contributionsRes,
      membersRes,
      usersRes,
    ] = await Promise.all([
      api.get(`/projects/${projectId}`),
      api.get(`/tasks/project/${projectId}`),
      api.get(`/projects/${projectId}/dashboard`),
      api.get(`/projects/${projectId}/contributions`),
      api.get(`/projects/${projectId}/members`),
      api.get('/users'),
    ]);

    const loadedTasks = tasksRes.data ?? [];

    let loadedReports: TaskReportItem[] = [];

    if (loadedTasks.length > 0) {
      const reportsResponses = await Promise.all(
        loadedTasks.map((task: Task) =>
          api.get(`/task-reports/task/${task.id}`).catch(() => ({ data: [] })),
        ),
      );

      loadedReports = reportsResponses.flatMap((res) => res.data ?? []);
    }

    if (loadedTasks.length > 0) {
      const reportResponses = await Promise.all(
        loadedTasks.map((task: any) =>
          api.get(`/task-reports/task/${task.id}`).catch(() => ({ data: [] })),
        ),
      );

      loadedReports = reportResponses.flatMap((res) => res.data ?? []);
    }

    setReports(loadedReports);

    const enrichedTasks = loadedTasks.map((task: Task) => {
      const taskReports = loadedReports
        .filter((report) => report.taskId === task.id)
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );

      const latestReport = taskReports[0];

      return {
        ...task,
        latestReportStatus: latestReport?.status ?? null,
      };
    });

    setProject(projectRes.data);
    setTasks(enrichedTasks);
    setDashboard(dashboardRes.data);
    setContributions(contributionsRes.data);
    setMembers(membersRes.data);
    setOrganizationUsers(usersRes.data);
    setReports(loadedReports);
  } catch (error: any) {
    console.error('Ошибка загрузки панели проекта:', error);

    const status = error?.response?.status;

    setNotice({
      type: 'error',
      message:
        status === 401
          ? 'Сессия истекла или требуется повторный вход в систему.'
          : 'Не удалось загрузить данные проекта.',
    });
  } finally {
    setLoading(false);
  }
};

  const loadDictionaries = async () => {
  try {
    const [statusRes, priorityRes, complexityRes] = await Promise.all([
      api.get('/tasks/statuses'),
      api.get('/tasks/priorities'),
      api.get('/tasks/complexities'),
    ]);

    const loadedStatuses = statusRes.data ?? [];
    const loadedPriorities = priorityRes.data ?? [];
    const loadedComplexities = complexityRes.data ?? [];

    setStatuses(loadedStatuses);
    setPriorities(loadedPriorities);
    setComplexities(loadedComplexities);

    if (loadedStatuses.length > 0 && !statusId) {
      const todoStatus =
        loadedStatuses.find((s: StatusItem) => s.name === 'Todo') ??
        loadedStatuses[0];
      setStatusId(todoStatus.id);
    }

    if (loadedPriorities.length > 0 && !priorityId) {
      setPriorityId(loadedPriorities[0].id);
    }

    if (loadedComplexities.length > 0 && !complexityId) {
      setComplexityId(loadedComplexities[0].id);
    }
  } catch (error: any) {
    console.error('Ошибка загрузки справочников задач:', error);

    const status = error?.response?.status;

    setNotice({
      type: 'error',
      message:
        status === 401
          ? 'Сессия истекла. Выполните вход повторно.'
          : 'Не удалось загрузить справочники задач.',
    });
  }
};

  useEffect(() => {
    if (!projectId || !currentUserId) return;

    loadData();
    loadDictionaries();
  }, [projectId, currentUserId]);

  const currentProjectMember = useMemo(() => {
    return members.find((member) => member.userId === currentUserId) ?? null;
  }, [members, currentUserId]);

  const currentProjectRole = currentProjectMember?.roleInProject ?? null;
  const isManagerView =
    currentProjectRole === 'OWNER' || currentProjectRole === 'MANAGER';
  const isMemberView = currentProjectRole === 'MEMBER';

  const projectManager = useMemo(() => {
    return (
      members.find((m) => m.roleInProject === 'OWNER') ||
      members.find((m) => m.roleInProject === 'MANAGER') ||
      null
    );
  }, [members]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setAssigneeId('');
    setDueDate('');
    setRequiresReport(false);
    setReportType('');

    const todoStatus = statuses.find((s) => s.name === 'Todo') ?? statuses[0];
    setStatusId(todoStatus?.id ?? '');
    setPriorityId(priorities[0]?.id ?? '');
    setComplexityId(complexities[0]?.id ?? '');
  };

  const resetDashboardState = () => {
    setProject(null);
    setTasks([]);
    setDashboard(null);
    setContributions([]);
    setMembers([]);
    setOrganizationUsers([]);
    setReports([]);
    setNotice(null);
    setEditingTask(null);
    setArchivingTask(null);
  };

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedMemberId('');
    setSelectedStatusFilter('');
  };

  const latestReportsByTaskId = useMemo(() => {
    const map: Record<string, any> = {};

    reports.forEach((report: any) => {
      const taskId = report.task?.id || report.taskId;
      if (!taskId) return;

      const existing = map[taskId];

      if (!existing) {
        map[taskId] = report;
        return;
      }

      const existingDate = new Date(existing.createdAt).getTime();
      const currentDate = new Date(report.createdAt).getTime();

      if (currentDate > existingDate) {
        map[taskId] = report;
      }
    });

    return map;
  }, [reports]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotice(null);

    if (!title.trim()) {
      setNotice({
        type: 'error',
        message: 'Введите название задачи.',
      });
      return;
    }

    if (!description.trim()) {
      setNotice({
        type: 'error',
        message: 'Введите описание задачи.',
      });
      return;
    }

    if (!statusId) {
      setNotice({
        type: 'error',
        message: 'Выберите статус задачи.',
      });
      return;
    }

    if (!priorityId) {
      setNotice({
        type: 'error',
        message: 'Выберите приоритет задачи.',
      });
      return;
    }

    if (!complexityId) {
      setNotice({
        type: 'error',
        message: 'Выберите сложность задачи.',
      });
      return;
    }

    if (!assigneeId) {
      setNotice({
        type: 'error',
        message: 'Выберите исполнителя.',
      });
      return;
    }

    if (!dueDate) {
      setNotice({
        type: 'error',
        message: 'Укажите дедлайн задачи.',
      });
      return;
    }

    if (requiresReport && !reportType) {
      setNotice({
        type: 'error',
        message: 'Выберите формат отчёта.',
      });
      return;
    }

    try {
      setCreating(true);

      await api.post('/tasks', {
        projectId,
        title: title.trim(),
        description: description.trim(),
        statusId,
        priorityId,
        complexityId,
        assigneeId,
        dueDate,
        requiresReport,
        reportType: requiresReport ? reportType : undefined,
      });

      await loadData();
      resetForm();
      setShowForm(false);

      setNotice({
        type: 'success',
        message: 'Задача успешно создана.',
      });
    } catch (error) {
      console.error('Ошибка создания задачи:', error);
      setNotice({
        type: 'error',
        message: 'Не удалось создать задачу.',
      });
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateTask = async (
    taskId: string,
    payload: {
      title: string;
      description?: string;
      statusId: string;
      priorityId: string;
      complexityId: string;
      assigneeId?: string;
      dueDate?: string;
      requiresReport: boolean;
      reportType?: 'TEXT' | 'LINK' | 'FILE' | 'IMAGE';
    },
  ) => {
    setNotice(null);

    try {
      await api.patch(`/tasks/${taskId}`, payload);

      await loadData();

      setNotice({
        type: 'success',
        message: 'Задача успешно обновлена.',
      });
    } catch (error) {
      console.error('Ошибка редактирования задачи:', error);
      setNotice({
        type: 'error',
        message: 'Не удалось обновить задачу.',
      });
      throw error;
    }
  };

  const handleStartTask = async (taskId: string) => {
  setNotice(null);

  try {
    await api.patch(`/tasks/${taskId}/start`);
    await loadData();

    setNotice({
      type: 'success',
      message: 'Задача переведена в статус «В работе».',
    });
  } catch (error: any) {
    const serverMessage = error?.response?.data?.message;

    setNotice({
      type: 'error',
      message:
        typeof serverMessage === 'string'
          ? serverMessage
          : 'Не удалось взять задачу в работу.',
    });
  }
};

  const handleArchiveTask = async (taskId: string) => {
  setNotice(null);

  try {
    setArchiving(true);

    await api.patch(`/tasks/${taskId}/archive`);

    await loadData();

    setNotice({
      type: 'success',
      message: 'Задача отправлена в архив.',
    });
  } catch (error) {
    console.error('Ошибка архивации задачи:', error);
    setNotice({
      type: 'error',
      message: 'Не удалось архивировать задачу.',
    });
  } finally {
    setArchiving(false);
    setArchivingTask(null);
  }
};
  
  const handleDeleteTaskDirect = (task: Task) => {
    setHideTaskModalTask(task);
  };

  const confirmHideTask = async () => {
      if (!hideTaskModalTask) return;

  try {
    setHideTaskLoading(true);

    await api.patch(`/tasks/${hideTaskModalTask.id}/archive`);
    await loadData();

    setNotice({
      type: 'success',
      message: 'Задача скрыта и перемещена в архив.',
    });

    setHideTaskModalTask(null);
  } catch (error: any) {
    console.error('Ошибка скрытия задачи:', error);

    const serverMessage = error?.response?.data?.message;

    setNotice({
      type: 'error',
      message:
        typeof serverMessage === 'string'
          ? serverMessage
          : 'Не удалось скрыть задачу.',
    });
  } finally {
    setHideTaskLoading(false);
  }
};

  const handleStatusChange = async (taskId: string, newStatusId: string) => {
  setNotice(null);

  const task = tasks.find((item) => item.id === taskId);
  const targetStatus = statuses.find((item) => item.id === newStatusId);

  if (!task || !targetStatus) {
    setNotice({
      type: 'error',
      message: 'Не удалось определить задачу или целевой статус.',
    });
    return;
  }

  const isTryingToComplete = targetStatus.name === 'Done';

  if (
    isMemberView &&
    isTryingToComplete &&
    task.requiresReport &&
    task.latestReportStatus !== 'APPROVED'
  ) {
    const message =
      task.latestReportStatus === 'SUBMITTED'
        ? 'Отчёт уже отправлен, но ещё не принят руководителем. Перевод в статус «Выполнено» пока недоступен.'
        : task.latestReportStatus === 'REJECTED'
        ? 'Последний отчёт был отклонён. Исправьте его и отправьте повторно.'
        : 'Сначала прикрепите отчёт по задаче и отправьте его на проверку руководителю.';

    setNotice({
      type: 'error',
      message,
    });
    return;
  }

  try {
    await api.patch(`/tasks/${taskId}`, {
      statusId: newStatusId,
    });

    await loadData();

    setNotice({
      type: 'success',
      message: 'Статус задачи обновлён.',
    });
  } catch (error: any) {
    const serverMessage = error?.response?.data?.message;

    let message = 'Не удалось обновить статус задачи.';

    if (typeof serverMessage === 'string') {
      if (
        serverMessage.includes('Task cannot be marked as completed until the report is approved')
      ) {
        message =
          'Нельзя перевести задачу в статус «Выполнено», пока отчёт не будет подтверждён руководителем.';
      } else if (
        serverMessage.includes('Members can update only their assigned tasks')
      ) {
        message = 'Вы можете изменять статус только своих задач.';
      } else if (serverMessage.includes('Access denied')) {
        message = 'У вас нет доступа к изменению этой задачи.';
      } else {
        message = serverMessage;
      }
    }

    setNotice({
      type: 'error',
      message,
    });
  }
};

  const handleAddMember = async (userId: string, roleInProject: string) => {
    await api.post(`/projects/${projectId}/members`, {
      userId,
      roleInProject,
    });

    await loadData();
  };

  const handleRemoveMember = async (userId: string) => {
    await api.delete(`/projects/${projectId}/members/${userId}`);
    await loadData();
  };

  const handleSubmitReport = async ({
    taskId,
    reportType,
    content,
    file,
  }: {
    taskId: string;
    reportType: 'TEXT' | 'LINK' | 'FILE' | 'IMAGE';
    content?: string;
    file?: File | null;
  }) => {
    setNotice(null);

    try {
      if (reportType === 'FILE' || reportType === 'IMAGE') {
        if (!file) {
          throw new Error(
            reportType === 'IMAGE'
              ? 'Не выбрано изображение для отправки.'
              : 'Не выбран файл для отправки.',
          );
        }

        const formData = new FormData();
        formData.append('taskId', taskId);
        formData.append('reportType', reportType);
        formData.append('file', file);

        await api.post('/task-reports/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      } else {
        await api.post('/task-reports', {
          taskId,
          reportType,
          content: content?.trim() || '',
        });
      }

      await loadData();
      setReportModalTask(null);

      setNotice({
        type: 'success',
        message: 'Отчёт успешно отправлен на проверку.',
      });
    } catch (error: any) {
      console.error('Ошибка отправки отчёта:', error);

      const serverMessage = error?.response?.data?.message;

      setNotice({
        type: 'error',
        message:
          typeof serverMessage === 'string'
            ? serverMessage
            : 'Не удалось отправить отчёт.',
      });

      throw error;
    }
  };

  const handleOpenReportsPage = () => {
    router.push(`/projects/${projectId}/reports`);
  };

  const handleSubmitFileReport = async (formData: FormData) => {
    setNotice(null);

    try {
      await api.post('/task-reports/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      await loadData();

      setNotice({
        type: 'success',
        message: 'Файл успешно отправлен на проверку.',
      });
    } catch (error) {
    console.error('Ошибка отправки файла:', error);
    setNotice({
      type: 'error',
      message: 'Не удалось отправить файл.',
    });
    throw error;
  }

  };

  const handleApproveReport = async (
    reportId: string,
    payload: { managerComment?: string },
  ) => {
    setNotice(null);

    try {
      await api.patch(`/task-reports/${reportId}/approve`, payload);
      await loadData();

      setNotice({
        type: 'success',
        message: 'Отчёт успешно принят.',
      });
    } catch (error) {
      console.error('Ошибка принятия отчёта:', error);
      setNotice({
        type: 'error',
        message: 'Не удалось принять отчёт.',
      });
      throw error;
    }
  };

  const handleRejectReport = async (
    reportId: string,
    payload: { managerComment: string },
  ) => {
    setNotice(null);

    try {
      await api.patch(`/task-reports/${reportId}/reject`, payload);
      await loadData();

      setNotice({
        type: 'success',
        message: 'Отчёт отклонён.',
      });
    } catch (error) {
      console.error('Ошибка отклонения отчёта:', error);
      setNotice({
        type: 'error',
        message: 'Не удалось отклонить отчёт.',
      });
      throw error;
    }
  };

  const handleOpenReviewModal = (task: any) => {
    const latestReport = latestReportsByTaskId?.[task.id] ?? null;

    if (!latestReport) {
      setNotice({
        type: 'error',
        message: 'Для этой задачи отчёт пока недоступен.',
      });
      return;
    }

    setReviewModalTask(task);
    setReviewModalReport(latestReport);
  };

  const handleCloseReviewModal = () => {
    setReviewModalTask(null);
    setReviewModalReport(null);
  };

  const visibleTasks = useMemo(() => {
    const baseTasks = isMemberView
      ? tasks.filter((task) => task.assignee?.id === currentUserId)
      : tasks;

    return baseTasks.filter((task) => {
      const q = searchTerm.trim().toLowerCase();

      const matchesSearch =
        !q ||
        task.title.toLowerCase().includes(q) ||
        (task.description?.toLowerCase().includes(q) ?? false) ||
        (task.assignee?.fullName.toLowerCase().includes(q) ?? false);

      const matchesMember =
        isMemberView
          ? true
          : !selectedMemberId || task.assignee?.id === selectedMemberId;

      const matchesStatus =
        !selectedStatusFilter || task.status.name === selectedStatusFilter;

      return matchesSearch && matchesMember && matchesStatus;
    });
  }, [
    tasks,
    searchTerm,
    selectedMemberId,
    selectedStatusFilter,
    isMemberView,
    currentUserId,
  ]);

  const todoTasks = visibleTasks.filter((task) => task.status.name === 'Todo');
  const inProgressTasks = visibleTasks.filter(
    (task) => task.status.name === 'In Progress',
  );
  const doneTasks = visibleTasks.filter((task) => task.status.name === 'Done');

  const myMetrics = useMemo(() => {
    const myTasks = tasks.filter((task) => task.assignee?.id === currentUserId);
    const myDone = myTasks.filter((task) => task.status.name === 'Done').length;
    const myOverdue = myTasks.filter((task) => isTaskOverdue(task)).length;
    const myRate =
      myTasks.length === 0 ? 0 : Math.round((myDone / myTasks.length) * 100);

    return {
      totalTasks: myTasks.length,
      completedTasks: myDone,
      overdueTasks: myOverdue,
      completionRate: myRate,
    };
  }, [tasks, currentUserId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white">
        <AppHeader projectId={projectId} />
        <div className="max-w-[1600px] mx-auto px-8 py-10">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <AppHeader projectId={projectId} 
      projectRole={currentProjectRole}
      />

      <main className="max-w-[1600px] mx-auto px-8 py-10 space-y-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-neutral-500 text-sm uppercase tracking-[0.2em] mb-3">
              {isMemberView ? 'МОИ ПРОЕКТЫ' : 'Рабочее пространство проекта'}
            </p>

            <h1 className="text-5xl font-bold tracking-tight">
              {project?.name ?? 'Панель проекта'}
            </h1>

            <p className="text-neutral-400 mt-3 text-lg max-w-3xl">
              {project?.description?.trim()
                ? project.description
                : 'Назначайте задачи, отслеживайте статусы и общий прогресс выполнения проекта.'}
            </p>

            {isMemberView && (
              <div className="mt-4 flex flex-wrap gap-3 text-sm">
                <span className="px-3 py-1.5 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-300">
                  Руководитель проекта:{' '}
                  <span className="text-white">
                    {projectManager?.fullName ?? 'Не указан'}
                  </span>
                </span>

                <span className="px-3 py-1.5 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-300">
                  Моя роль:{' '}
                  <span className="text-white">
                    {translateRoleName(currentProjectRole ?? '')}
                  </span>
                </span>
              </div>
            )}
          </div>

          {isManagerView && (
            <button
              onClick={() => {
                if (!showForm) resetForm();
                setShowForm((prev) => !prev);
                setNotice(null);
              }}
              className="bg-white text-black px-5 py-3 rounded-2xl font-medium hover:bg-neutral-200 transition"
            >
              {showForm ? 'Закрыть' : '+ Добавить задачу'}
            </button>
          )}
        </div>

        {notice && <InlineNotice type={notice.type} message={notice.message} />}

        {isManagerView && showForm && (
          <form
            onSubmit={handleCreateTask}
            className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 md:p-8 space-y-5"
          >
            <div>
              <h2 className="text-2xl font-semibold">Создание задачи</h2>
              <p className="text-neutral-400 mt-2 text-sm">
                Все поля обязательны для заполнения.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2">
                <label className="block text-sm text-neutral-400 mb-2">
                  Название *
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Введите название задачи"
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-2xl px-4 py-3 outline-none focus:border-white"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm text-neutral-400 mb-2">
                  Описание *
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Описание задачи"
                  rows={4}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-2xl px-4 py-3 outline-none focus:border-white resize-none"
                />
              </div>

              <div>
                <label className="block text-sm text-neutral-400 mb-2">
                  Статус *
                </label>
                <select
                  value={statusId}
                  onChange={(e) => setStatusId(e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-2xl px-4 py-3 outline-none focus:border-white"
                >
                  {statuses.map((status) => (
                    <option key={status.id} value={status.id}>
                      {translateStatusName(status.name)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-neutral-400 mb-2">
                  Приоритет *
                </label>
                <select
                  value={priorityId}
                  onChange={(e) => setPriorityId(e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-2xl px-4 py-3 outline-none focus:border-white"
                >
                  {priorities.map((priority) => (
                    <option key={priority.id} value={priority.id}>
                      {translatePriorityName(priority.name)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-neutral-400 mb-2">
                  Сложность *
                </label>
                <select
                  value={complexityId}
                  onChange={(e) => setComplexityId(e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-2xl px-4 py-3 outline-none focus:border-white"
                >
                  {complexities.map((complexity) => (
                    <option key={complexity.id} value={complexity.id}>
                      {translateComplexityName(complexity.name)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-neutral-400 mb-2">
                  Исполнитель *
                </label>
                <select
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-2xl px-4 py-3 outline-none focus:border-white"
                >
                  <option value="">Выберите исполнителя</option>
                  {members.map((member) => (
                    <option key={member.userId} value={member.userId}>
                      {member.fullName} ({translateRoleName(member.roleInProject)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-neutral-400 mb-2">
                  Дедлайн *
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-2xl px-4 py-3 outline-none focus:border-white"
                />
              </div>

              <div>
                <label className="block text-sm text-neutral-400 mb-2">
                  Требуется отчёт *
                </label>
                <select
                  value={requiresReport ? 'yes' : 'no'}
                  onChange={(e) => {
                    const enabled = e.target.value === 'yes';
                    setRequiresReport(enabled);
                    if (!enabled) {
                      setReportType('');
                    }
                  }}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-2xl px-4 py-3 outline-none focus:border-white"
                >
                  <option value="no">Нет</option>
                  <option value="yes">Да</option>
                </select>
              </div>

              {requiresReport && (
                <div>
                  <label className="block text-sm text-neutral-400 mb-2">
                    Формат отчёта *
                  </label>
                  <select
                    value={reportType}
                    onChange={(e) =>
                      setReportType(
                        e.target.value as 'TEXT' | 'LINK' | 'FILE' | 'IMAGE',
                      )
                    }
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-2xl px-4 py-3 outline-none focus:border-white"
                  >
                    <option value="">Выберите формат отчёта</option>
                    <option value="TEXT">Текстовый</option>
                    <option value="LINK">Ссылка</option>
                    <option value="FILE">Файл</option>
                    <option value="IMAGE">Изображение</option>
                  </select>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={creating}
                className="bg-white text-black px-5 py-3 rounded-2xl font-medium hover:bg-neutral-200 transition disabled:opacity-60"
              >
                {creating ? 'Создание...' : 'Создать задачу'}
              </button>

              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setShowForm(false);
                  setNotice(null);
                }}
                className="bg-neutral-800 text-white px-5 py-3 rounded-2xl font-medium hover:bg-neutral-700 transition"
              >
                Отмена
              </button>
            </div>
          </form>
        )}

        {isManagerView ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <MetricCard title="Назначено задач" value={dashboard?.totalTasks ?? 0} />
            <MetricCard
              title="Выполнено"
              value={dashboard?.completedTasks ?? 0}
            />
            <MetricCard
              title="Процент выполнения"
              value={`${dashboard?.completionRate ?? 0}%`}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <MetricCard title="Мои задачи" value={myMetrics.totalTasks} />
            <MetricCard title="Выполнено" value={myMetrics.completedTasks} />
            <MetricCard title="Просрочено" value={myMetrics.overdueTasks} />
            <MetricCard
              title="Мой прогресс"
              value={`${myMetrics.completionRate}%`}
            />
          </div>
        )}

       

        

        <section className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 md:p-8 space-y-5">
          <div>
            <p className="text-neutral-500 text-sm uppercase tracking-[0.2em] mb-3">
              {isMemberView ? 'МОИ ЗАДАЧИ' : 'ФИЛЬТРЫ И ПОИСК'}
            </p>
            <h2 className="text-2xl font-semibold">
              {isMemberView ? 'Мои задачи по проекту' : 'Поиск и фильтрация задач'}
            </h2>
            <p className="text-neutral-400 mt-2 text-sm">
              {isMemberView
                ? 'Здесь отображаются только назначенные вам задачи.'
                : 'Быстро находите задачи по названию, исполнителю и статусу.'}
            </p>
          </div>

          <div
            className={`grid grid-cols-1 ${
              isMemberView ? 'md:grid-cols-2' : 'md:grid-cols-4'
            } gap-4`}
          >
            <div className={isMemberView ? 'md:col-span-1' : 'md:col-span-2'}>
              <label className="block text-sm text-neutral-400 mb-2">
                Поиск
              </label>
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={
                  isMemberView
                    ? 'Введите название или описание задачи'
                    : 'Введите название задачи, описание или исполнителя'
                }
                className="w-full bg-neutral-800 border border-neutral-700 rounded-2xl px-4 py-3 outline-none focus:border-white"
              />
            </div>

            {!isMemberView && (
              <div>
                <label className="block text-sm text-neutral-400 mb-2">
                  Исполнитель
                </label>
                <select
                  value={selectedMemberId}
                  onChange={(e) => setSelectedMemberId(e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-2xl px-4 py-3 outline-none focus:border-white"
                >
                  <option value="">Все исполнители</option>
                  {members.map((member) => (
                    <option key={member.userId} value={member.userId}>
                      {member.fullName}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm text-neutral-400 mb-2">
                Статус
              </label>
              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-2xl px-4 py-3 outline-none focus:border-white"
              >
                <option value="">Все статусы</option>
                {statuses.map((status) => (
                  <option key={status.id} value={status.name}>
                    {translateStatusName(status.name)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="text-sm text-neutral-400">
              Найдено задач:{' '}
              <span className="text-white font-medium">
                {visibleTasks.length}
              </span>
            </div>

            <button
              type="button"
              onClick={resetFilters}
              className="bg-neutral-800 text-white px-4 py-2.5 rounded-2xl font-medium hover:bg-neutral-700 transition"
            >
              Сбросить фильтры
            </button>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <KanbanColumn
            title="К выполнению"
            tasks={todoTasks}
            statuses={statuses}
            onStatusChange={handleStatusChange}
            onEditTask={isManagerView ? setEditingTask : undefined}
            onArchiveTask={isManagerView ? setArchivingTask : undefined}
            onStartTask={handleStartTask}
            isMemberView={isMemberView}
            onOpenReportsPage={handleOpenReportsPage}
            currentUserId={currentUserId}
            onOpenReviewModal={handleOpenReviewModal}
            onDeleteTask={isManagerView ? handleDeleteTaskDirect : undefined}
          />
          <KanbanColumn
            title="В работе"
            tasks={inProgressTasks}
            statuses={statuses}
            onStatusChange={handleStatusChange}
            onEditTask={isManagerView ? setEditingTask : undefined}
            onDeleteTask={isManagerView ? handleDeleteTaskDirect : undefined}
            isMemberView={isMemberView}
            currentUserId={currentUserId}
            onOpenReportsPage={handleOpenReportsPage}
            onOpenReportModal={handleOpenReportModal}
            onOpenReviewModal={handleOpenReviewModal}
            onArchiveTask={handleArchiveTask}
          />
          <KanbanColumn
            title="Выполнено"
            tasks={doneTasks}
            statuses={statuses}
            onStatusChange={handleStatusChange}
            onEditTask={isManagerView ? setEditingTask : undefined}
            onArchiveTask={isManagerView ? setArchivingTask : undefined}
            isMemberView={isMemberView}
            onOpenReportsPage={handleOpenReportsPage}
            currentUserId={currentUserId}
            onOpenReviewModal={handleOpenReviewModal}
            onDeleteTask={isManagerView ? handleDeleteTaskDirect : undefined}
          />
        </div>
      </main>

      {archivingTask && (
        <div className="fixed inset-0 z-[95] bg-black/70 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl p-6 space-y-5">
            <div>
              <p className="text-neutral-500 text-sm uppercase tracking-[0.2em] mb-3">
                АРХИВАЦИЯ ЗАДАЧИ
              </p>
              <h2 className="text-2xl font-bold tracking-tight">
                Архивировать задачу?
              </h2>
              <p className="text-neutral-400 mt-3">
                Вы собираетесь архивировать задачу{' '}
                <span className="text-white font-medium">
                  «{archivingTask.title}»
                </span>
                . После этого она переместится в архив. 
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleArchiveTask(archivingTask.id)}
                disabled={archiving}
                className="bg-red-600 text-white px-5 py-3 rounded-2xl font-medium hover:bg-red-500 transition disabled:opacity-60"
              >
                {archiving ? 'Архивация...' : 'Архивировать'}
              </button>

              <button
                type="button"
                onClick={() => setArchivingTask(null)}
                className="bg-neutral-800 text-white px-5 py-3 rounded-2xl font-medium hover:bg-neutral-700 transition"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      <EditTaskModal
        open={!!editingTask}
        task={editingTask}
        statuses={statuses}
        priorities={priorities}
        complexities={complexities}
        members={members}
        onClose={() => setEditingTask(null)}
        onSave={handleUpdateTask}
      />

      <TaskReportSubmitModal
        isOpen={!!reviewModalTask}
        task={reviewModalTask}
        reportType={reviewModalTask?.requiresReport ? reviewModalTask.reportType : undefined}
        onClose={handleCloseReviewModal}
        onApprove={handleApproveReport}
        onReject={handleRejectReport}
      />

      <ConfirmActionModal
        isOpen={!!hideTaskModalTask}
        title="Скрыть задачу"
        description={
          hideTaskModalTask
            ? `Задача «${hideTaskModalTask.title}» будет убрана из активной доски и перемещена в архив.`
            : ''
          }
          confirmText="Скрыть"
          confirmVariant="danger"
          loading={hideTaskLoading}
          onClose={() => setHideTaskModalTask(null)}
          onConfirm={confirmHideTask}
      />

      <TaskReportReviewModal
        isOpen={!!reviewModalTask && !!reviewModalReport}
        task={reviewModalTask}
        report={reviewModalReport}
        onClose={handleCloseReviewModal}
        onApprove={handleApproveReport}
        onReject={handleRejectReport}
      />
      <TaskReportModal
        isOpen={!!reportModalTask}
        task={reportModalTask}
        onClose={() => setReportModalTask(null)}
        onSubmit={handleSubmitReport}
      />
    </div>
  );
}

function MetricCard({
  title,
  value,
}: {
  title: string;
  value: string | number;
}) {
  const styles = getMetricStyles(title);

  return (
    <div className={`rounded-3xl p-8 shadow border ${styles.wrapper}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-neutral-400 text-sm mb-3">{title}</div>
          <div className="text-5xl font-bold tracking-tight">{value}</div>
        </div>

        <div className={`h-3 w-3 rounded-full mt-2 ${styles.dot}`} />
      </div>

      <div className={`mt-6 h-1.5 w-full rounded-full ${styles.lineBg}`}>
        <div className={`h-1.5 rounded-full ${styles.lineFill}`} />
      </div>
    </div>
  );
}

function getMetricStyles(title: string) {
  switch (title) {
    case 'Выполнено':
      return {
        wrapper: 'bg-neutral-900 border-emerald-900/60',
        dot: 'bg-emerald-400',
        lineBg: 'bg-emerald-950/40',
        lineFill: 'bg-emerald-400 w-2/3',
      };

    case 'Процент выполнения':
    case 'Мой прогресс':
      return {
        wrapper: 'bg-neutral-900 border-sky-900/60',
        dot: 'bg-sky-400',
        lineBg: 'bg-sky-950/40',
        lineFill: 'bg-sky-400 w-3/4',
      };

    case 'Просрочено':
      return {
        wrapper: 'bg-neutral-900 border-red-900/60',
        dot: 'bg-red-400',
        lineBg: 'bg-red-950/40',
        lineFill: 'bg-red-400 w-1/3',
      };

    case 'Всего задач':
    case 'Мои задачи':
    default:
      return {
        wrapper: 'bg-neutral-900 border-neutral-800',
        dot: 'bg-neutral-300',
        lineBg: 'bg-neutral-800',
        lineFill: 'bg-neutral-300 w-1/2',
      };
  }
}

function translateStatusName(name: string) {
  switch (name) {
    case 'Todo':
      return 'К выполнению';
    case 'In Progress':
      return 'В работе';
    case 'Done':
      return 'Выполнено';
    default:
      return name;
  }
}

function translatePriorityName(name: string) {
  switch (name.toLowerCase()) {
    case 'critical':
      return 'Критический';
    case 'high':
      return 'Высокий';
    case 'medium':
      return 'Средний';
    case 'low':
      return 'Низкий';
    default:
      return name;
  }
}

function translateComplexityName(name: string) {
  switch (name.toLowerCase()) {
    case 'very hard':
      return 'Очень тяжёлая';
    case 'hard':
      return 'Тяжёлая';
    case 'medium':
      return 'Средняя';
    case 'easy':
      return 'Лёгкая';
    case 's':
      return 'Лёгкая';
    case 'm':
      return 'Средняя';
    case 'l':
      return 'Тяжёлая';
    default:
      return name;
  }
}

function translateRoleName(role: string) {
  switch (role) {
    case 'OWNER':
      return 'Владелец';
    case 'MANAGER':
      return 'Менеджер';
    case 'MEMBER':
      return 'Сотрудник';
    default:
      return role || 'Не указана';
  }
}

function parseJwt(
  token: string,
): { sub?: string; org?: string; role?: string } | null {
  try {
    const payload = token.split('.')[1];
    const decoded = JSON.parse(atob(payload));
    return decoded;
  } catch {
    return null;
  }
}

function isTaskOverdue(task: Task) {
  if (!task.dueDate) return false;
  if (task.status.name === 'Done') return false;

  const due = new Date(task.dueDate);
  const now = new Date();

  return due.getTime() < now.getTime();
}