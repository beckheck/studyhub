import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useItems, useProjects } from '@/hooks/useStore';
import { ItemDialog } from '@/items/base/dialog';
import { useItemDialog } from '@/items/useItemDialog';
import { Project, ProjectIconName, ProjectType, ProjectVisualType } from '@/types';
import { motion } from 'framer-motion';
import {
  BookOpen,
  Building2,
  Edit3,
  Globe,
  Handshake,
  Lightbulb,
  Megaphone,
  Microscope,
  Plus,
  Rocket,
  Trash2,
  Users,
  Vote,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

type ProjectForm = {
  title: string;
  type: ProjectType;
  memberCount: string;
  visualType: ProjectVisualType;
  emoji: string;
  iconName: ProjectIconName;
  summary: string;
  notes: string;
  teamRolesText: string;
  resourcesText: string;
};

const PROJECT_EMOJI_OPTIONS = ['🏫', '🎓', '🧪', '🗳️', '📣', '🤝', '📚', '🚀', '🧠', '💡', '🧩', '🧭'];

const PROJECT_ICON_MAP: Record<ProjectIconName, React.ComponentType<{ className?: string }>> = {
  users: Users,
  building: Building2,
  microscope: Microscope,
  vote: Vote,
  megaphone: Megaphone,
  book: BookOpen,
  lightbulb: Lightbulb,
  rocket: Rocket,
  globe: Globe,
  handshake: Handshake,
};

const DEFAULT_PROJECT_FORM: ProjectForm = {
  title: '',
  type: 'organization',
  memberCount: '1',
  visualType: 'emoji',
  emoji: '🏫',
  iconName: 'users',
  summary: '',
  notes: '',
  teamRolesText: '',
  resourcesText: '',
};

function splitMultilineList(value: string): string[] {
  return value
    .split('\n')
    .map(entry => entry.trim())
    .filter(Boolean);
}

function splitResourceLines(value: string) {
  return value
    .split('\n')
    .map(entry => entry.trim())
    .filter(Boolean)
    .map(entry => {
      const [label, url] = entry.split('|').map(part => part.trim());
      return {
        label: label || url,
        url: url || label,
      };
    })
    .filter(resource => resource.label.length > 0 && resource.url.length > 0);
}

function formatProjectType(type: ProjectType): string {
  return type
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function ProjectVisual({ project, className }: { project: Project; className?: string }) {
  if (project.visualType === 'icon') {
    const Icon = PROJECT_ICON_MAP[project.iconName];
    return <Icon className={className} />;
  }

  return <span className={className}>{project.emoji}</span>;
}

export default function ProjectsTab() {
  const { t } = useTranslation('projects');
  const { projects, addProject, updateProject, deleteProject } = useProjects();
  const { items } = useItems();
  const itemDialog = useItemDialog();

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [projectForm, setProjectForm] = useState<ProjectForm>(DEFAULT_PROJECT_FORM);

  useEffect(() => {
    if (!projects.length) {
      setSelectedProjectId(null);
      return;
    }

    const selectedExists = selectedProjectId && projects.some(project => project.id === selectedProjectId);
    if (!selectedExists) {
      setSelectedProjectId(projects[0]?.id ?? null);
    }
  }, [projects, selectedProjectId]);

  const selectedProject = useMemo(
    () => projects.find(project => project.id === selectedProjectId) || projects[0] || null,
    [projects, selectedProjectId]
  );

  const linkedMeetings = useMemo(
    () => items.filter(item => item.type === 'event' && item.projectId === selectedProject?.id && !item.isDeleted),
    [items, selectedProject?.id]
  );

  const linkedTasks = useMemo(
    () => items.filter(item => item.type === 'task' && item.projectId === selectedProject?.id && !item.isDeleted),
    [items, selectedProject?.id]
  );

  const openCreateProjectDialog = () => {
    setEditingProjectId(null);
    setProjectForm(DEFAULT_PROJECT_FORM);
    setProjectDialogOpen(true);
  };

  const openEditProjectDialog = (project: Project) => {
    setEditingProjectId(project.id);
    setProjectForm({
      title: project.title,
      type: project.type,
      memberCount: String(project.memberCount),
      visualType: project.visualType,
      emoji: project.emoji,
      iconName: project.iconName,
      summary: project.summary,
      notes: project.notes,
      teamRolesText: project.teamRoles.join('\n'),
      resourcesText: project.resources.map(resource => `${resource.label} | ${resource.url}`).join('\n'),
    });
    setProjectDialogOpen(true);
  };

  const handleSaveProject = () => {
    const memberCount = Math.max(1, Number(projectForm.memberCount) || 1);
    const payload = {
      title: projectForm.title.trim() || t('placeholders.untitledProject'),
      type: projectForm.type,
      memberCount,
      visualType: projectForm.visualType,
      emoji: projectForm.visualType === 'emoji' ? projectForm.emoji || '🏫' : '🏫',
      iconName: projectForm.visualType === 'icon' ? projectForm.iconName : 'users',
      summary: projectForm.summary.trim(),
      notes: projectForm.notes.trim(),
      teamRoles: splitMultilineList(projectForm.teamRolesText),
      resources: splitResourceLines(projectForm.resourcesText),
    };

    if (editingProjectId) {
      updateProject(editingProjectId, payload);
      setSelectedProjectId(editingProjectId);
    } else {
      const project = addProject(payload);
      setSelectedProjectId(project.id);
    }

    setProjectDialogOpen(false);
  };

  const handleDeleteProject = (projectId: string) => {
    const project = projects.find(entry => entry.id === projectId);
    if (!project) return;

    const confirmed = window.confirm(t('confirmations.deleteProject', { title: project.title }));
    if (!confirmed) return;

    deleteProject(projectId);
    if (selectedProjectId === projectId) {
      setSelectedProjectId(projects.find(entry => entry.id !== projectId)?.id ?? null);
    }
  };

  const addLinkedMeeting = () => {
    if (!selectedProject) return;

    const today = new Date().toISOString().split('T')[0];
    itemDialog.openAddDialog(
      'event',
      {
        title: `${selectedProject.title} meeting`,
        courseId: '',
        projectId: selectedProject.id,
        startsAt: today,
        startsAtTime: '10:00',
        endsAt: today,
        endsAtTime: '11:00',
      },
      { hidden: { courseId: true, projectId: true } }
    );
  };

  const addLinkedTask = () => {
    if (!selectedProject) return;

    itemDialog.openAddDialog(
      'task',
      {
        title: `${selectedProject.title} task`,
        courseId: '',
        projectId: selectedProject.id,
        priority: 'medium',
      },
      { hidden: { courseId: true, projectId: true } }
    );
  };

  const projectTypeOptions: Array<{ value: ProjectType; label: string }> = [
    { value: 'organization', label: t('types.organization') },
    { value: 'club', label: t('types.club') },
    { value: 'research', label: t('types.research') },
    { value: 'politics', label: t('types.politics') },
    { value: 'competition', label: t('types.competition') },
    { value: 'startup', label: t('types.startup') },
    { value: 'other', label: t('types.other') },
  ];

  const iconOptions: Array<{ value: ProjectIconName; label: string }> = [
    { value: 'users', label: t('icons.users') },
    { value: 'building', label: t('icons.building') },
    { value: 'microscope', label: t('icons.microscope') },
    { value: 'vote', label: t('icons.vote') },
    { value: 'megaphone', label: t('icons.megaphone') },
    { value: 'book', label: t('icons.book') },
    { value: 'lightbulb', label: t('icons.lightbulb') },
    { value: 'rocket', label: t('icons.rocket') },
    { value: 'globe', label: t('icons.globe') },
    { value: 'handshake', label: t('icons.handshake') },
  ];

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight">{t('title')}</h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{t('subtitle')}</p>
        </div>
        <Button className="rounded-xl" onClick={openCreateProjectDialog}>
          <Plus className="w-4 h-4 mr-2" />
          {t('actions.addProject')}
        </Button>
      </motion.div>

      {!projects.length ? (
        <Card className="rounded-3xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur">
          <CardContent className="p-10 text-center space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/70 dark:bg-white/10 shadow-lg text-3xl">
              🧩
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-bold">{t('empty.title')}</h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 max-w-xl mx-auto">{t('empty.description')}</p>
            </div>
            <Button className="rounded-xl" onClick={openCreateProjectDialog}>
              <Plus className="w-4 h-4 mr-2" />
              {t('actions.addProject')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-1">
              {projects.map(project => {
                const ProjectIconOrEmoji = ProjectVisual;
                const isSelected = selectedProject?.id === project.id;
                const projectMeetingCount = items.filter(
                  item => item.type === 'event' && item.projectId === project.id && !item.isDeleted
                ).length;
                const projectTaskCount = items.filter(
                  item => item.type === 'task' && item.projectId === project.id && !item.isDeleted
                ).length;

                return (
                  <Card
                    key={project.id}
                    className={`rounded-3xl border-none shadow-xl cursor-pointer transition-all duration-200 bg-white/80 dark:bg-white/10 backdrop-blur ${
                      isSelected ? 'ring-2 ring-emerald-400/70 scale-[1.01]' : 'hover:scale-[1.01]'
                    }`}
                    onClick={() => setSelectedProjectId(project.id)}
                  >
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400/20 to-sky-400/20 text-2xl shadow-md">
                            <ProjectIconOrEmoji project={project} className="w-6 h-6" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="truncate font-semibold">{project.title}</h3>
                            <p className="text-xs text-zinc-600 dark:text-zinc-400">{formatProjectType(project.type)}</p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 rounded-full"
                            onClick={e => {
                              e.stopPropagation();
                              openEditProjectDialog(project);
                            }}
                          >
                            <Edit3 className="w-4 h-4" />
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 rounded-full text-red-500 hover:text-red-600"
                            onClick={e => {
                              e.stopPropagation();
                              handleDeleteProject(project.id);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 text-xs">
                        <span className="rounded-full bg-zinc-900/5 px-2.5 py-1 dark:bg-white/10">{t('meta.people', { count: project.memberCount })}</span>
                        <span className="rounded-full bg-zinc-900/5 px-2.5 py-1 dark:bg-white/10">{t('meta.meetings', { count: projectMeetingCount })}</span>
                        <span className="rounded-full bg-zinc-900/5 px-2.5 py-1 dark:bg-white/10">{t('meta.tasks', { count: projectTaskCount })}</span>
                      </div>

                      <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-3">
                        {project.summary || t('empty.noSummary')}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </aside>

          <main className="space-y-6">
            {selectedProject && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <Card className="rounded-3xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur">
                  <CardHeader className="flex flex-row items-start justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-400/20 to-cyan-400/20 text-3xl shadow-lg">
                        <ProjectVisual project={selectedProject} className="w-8 h-8" />
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="truncate text-3xl">{selectedProject.title}</CardTitle>
                        <CardDescription className="mt-1">{selectedProject.summary || t('empty.noSummary')}</CardDescription>
                      </div>
                    </div>
                    <Button className="rounded-xl" onClick={() => openEditProjectDialog(selectedProject)}>
                      <Edit3 className="w-4 h-4 mr-2" />
                      {t('actions.editProject')}
                    </Button>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-zinc-900/5 px-3 py-1 text-sm dark:bg-white/10">{t(`types.${selectedProject.type}`)}</span>
                    <span className="rounded-full bg-zinc-900/5 px-3 py-1 text-sm dark:bg-white/10">{t('meta.people', { count: selectedProject.memberCount })}</span>
                    {selectedProject.teamRoles.map(role => (
                      <span key={role} className="rounded-full bg-emerald-500/10 px-3 py-1 text-sm text-emerald-700 dark:text-emerald-300">
                        {role}
                      </span>
                    ))}
                  </CardContent>
                </Card>

                <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-4">
                  <Card className="rounded-3xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur">
                    <CardHeader>
                      <CardTitle>{t('columns.meetings')}</CardTitle>
                      <CardDescription>{t('columns.meetingsDescription')}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Button className="w-full rounded-xl" variant="outline" onClick={addLinkedMeeting}>
                        <Plus className="w-4 h-4 mr-2" />
                        {t('actions.addMeeting')}
                      </Button>
                      <div className="space-y-3">
                        {linkedMeetings.length ? (
                          linkedMeetings.map(meeting => (
                            <div key={meeting.id} className="rounded-2xl border border-white/20 bg-white/60 p-3 dark:bg-white/5">
                              <div className="font-medium">{meeting.title || t('empty.untitled')}</div>
                              <div className="text-xs text-zinc-600 dark:text-zinc-400">
                                {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(meeting.startsAt))}
                              </div>
                              {meeting.location && <div className="text-xs text-zinc-600 dark:text-zinc-400">{meeting.location}</div>}
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-zinc-600 dark:text-zinc-400">{t('empty.noMeetings')}</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="rounded-3xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur">
                    <CardHeader>
                      <CardTitle>{t('columns.tasks')}</CardTitle>
                      <CardDescription>{t('columns.tasksDescription')}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Button className="w-full rounded-xl" variant="outline" onClick={addLinkedTask}>
                        <Plus className="w-4 h-4 mr-2" />
                        {t('actions.addTask')}
                      </Button>
                      <div className="space-y-3">
                        {linkedTasks.length ? (
                          linkedTasks.map(task => (
                            <div key={task.id} className="rounded-2xl border border-white/20 bg-white/60 p-3 dark:bg-white/5">
                              <div className="font-medium">{task.title || t('empty.untitled')}</div>
                              <div className="text-xs text-zinc-600 dark:text-zinc-400">{t(`priorities.${task.priority}`)}</div>
                              {task.dueAt && (
                                <div className="text-xs text-zinc-600 dark:text-zinc-400">
                                  {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(task.dueAt))}
                                </div>
                              )}
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-zinc-600 dark:text-zinc-400">{t('empty.noTasks')}</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="rounded-3xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur xl:col-span-2 2xl:col-span-1">
                    <CardHeader>
                      <CardTitle>{t('columns.notes')}</CardTitle>
                      <CardDescription>{t('columns.notesDescription')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Textarea
                        value={selectedProject.notes}
                        onChange={event => updateProject(selectedProject.id, { notes: event.target.value })}
                        placeholder={t('placeholders.notes')}
                        className="min-h-56 rounded-2xl"
                      />
                    </CardContent>
                  </Card>

                  <Card className="rounded-3xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur xl:col-span-2 2xl:col-span-1">
                    <CardHeader>
                      <CardTitle>{t('columns.team')}</CardTitle>
                      <CardDescription>{t('columns.teamDescription')}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label>{t('forms.teamRoles')}</Label>
                        <Textarea
                          value={selectedProject.teamRoles.join('\n')}
                          onChange={event =>
                            updateProject(selectedProject.id, {
                              teamRoles: splitMultilineList(event.target.value),
                            })
                          }
                          placeholder={t('placeholders.teamRoles')}
                          className="min-h-28 rounded-2xl"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t('forms.resources')}</Label>
                        <Textarea
                          value={selectedProject.resources.map(resource => `${resource.label} | ${resource.url}`).join('\n')}
                          onChange={event =>
                            updateProject(selectedProject.id, {
                              resources: splitResourceLines(event.target.value),
                            })
                          }
                          placeholder={t('placeholders.resources')}
                          className="min-h-28 rounded-2xl"
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </motion.div>
            )}
          </main>
        </div>
      )}

      <Dialog open={projectDialogOpen} onOpenChange={setProjectDialogOpen}>
        <DialogContent className="max-w-3xl rounded-3xl bg-white/95 dark:bg-zinc-950/95 backdrop-blur">
          <DialogHeader>
            <DialogTitle>{editingProjectId ? t('actions.editProject') : t('actions.addProject')}</DialogTitle>
            <DialogDescription>{t('dialog.description')}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label>{t('forms.title')}</Label>
              <Input
                value={projectForm.title}
                onChange={event => setProjectForm(prev => ({ ...prev, title: event.target.value }))}
                placeholder={t('placeholders.title')}
                className="rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label>{t('forms.type')}</Label>
              <Select value={projectForm.type} onValueChange={value => setProjectForm(prev => ({ ...prev, type: value as ProjectType }))}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {projectTypeOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('forms.peopleCount')}</Label>
              <Input
                type="number"
                min={1}
                value={projectForm.memberCount}
                onChange={event => setProjectForm(prev => ({ ...prev, memberCount: event.target.value }))}
                className="rounded-xl"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>{t('forms.visualType')}</Label>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant={projectForm.visualType === 'emoji' ? 'default' : 'outline'}
                  className="rounded-xl"
                  onClick={() => setProjectForm(prev => ({ ...prev, visualType: 'emoji' }))}
                >
                  {t('forms.emoji')}
                </Button>
                <Button
                  type="button"
                  variant={projectForm.visualType === 'icon' ? 'default' : 'outline'}
                  className="rounded-xl"
                  onClick={() => setProjectForm(prev => ({ ...prev, visualType: 'icon' }))}
                >
                  {t('forms.defaultIcon')}
                </Button>
              </div>
            </div>

            {projectForm.visualType === 'emoji' ? (
              <div className="space-y-2 md:col-span-2">
                <Label>{t('forms.emoji')}</Label>
                <div className="flex flex-wrap gap-2">
                  {PROJECT_EMOJI_OPTIONS.map(emoji => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setProjectForm(prev => ({ ...prev, emoji }))}
                      className={`flex h-11 w-11 items-center justify-center rounded-xl border text-xl transition-all ${
                        projectForm.emoji === emoji
                          ? 'border-emerald-500 bg-emerald-500/10'
                          : 'border-white/20 bg-white/70 dark:bg-white/10'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                  <Input
                    value={projectForm.emoji}
                    onChange={event => setProjectForm(prev => ({ ...prev, emoji: event.target.value }))}
                    placeholder="🙂"
                    className="w-24 rounded-xl"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2 md:col-span-2">
                <Label>{t('forms.defaultIcon')}</Label>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {iconOptions.map(option => {
                    const Icon = PROJECT_ICON_MAP[option.value];
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setProjectForm(prev => ({ ...prev, iconName: option.value }))}
                        className={`flex items-center gap-3 rounded-2xl border px-3 py-2 text-left transition-all ${
                          projectForm.iconName === option.value
                            ? 'border-emerald-500 bg-emerald-500/10'
                            : 'border-white/20 bg-white/70 dark:bg-white/10'
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                        <span className="text-sm font-medium">{option.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="space-y-2 md:col-span-2">
              <Label>{t('forms.summary')}</Label>
              <Textarea
                value={projectForm.summary}
                onChange={event => setProjectForm(prev => ({ ...prev, summary: event.target.value }))}
                placeholder={t('placeholders.summary')}
                className="min-h-24 rounded-2xl"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>{t('forms.teamRoles')}</Label>
              <Textarea
                value={projectForm.teamRolesText}
                onChange={event => setProjectForm(prev => ({ ...prev, teamRolesText: event.target.value }))}
                placeholder={t('placeholders.teamRoles')}
                className="min-h-24 rounded-2xl"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>{t('forms.resources')}</Label>
              <Textarea
                value={projectForm.resourcesText}
                onChange={event => setProjectForm(prev => ({ ...prev, resourcesText: event.target.value }))}
                placeholder={t('placeholders.resources')}
                className="min-h-24 rounded-2xl"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>{t('forms.notes')}</Label>
              <Textarea
                value={projectForm.notes}
                onChange={event => setProjectForm(prev => ({ ...prev, notes: event.target.value }))}
                placeholder={t('placeholders.notes')}
                className="min-h-28 rounded-2xl"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-white/20 dark:border-white/10">
            <Button variant="outline" className="rounded-xl" onClick={() => setProjectDialogOpen(false)}>
              {t('actions.cancel')}
            </Button>
            <Button className="rounded-xl" onClick={handleSaveProject}>
              {t('actions.saveProject')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ItemDialog
        open={itemDialog.open}
        onOpenChange={itemDialog.onOpenChange}
        editingItem={itemDialog.editingItem}
        itemType={itemDialog.itemType}
        form={itemDialog.form}
        hidden={itemDialog.hidden}
        disabled={itemDialog.disabled}
        availableItemTypes={itemDialog.availableItemTypes}
        onTypeChange={itemDialog.handleChangeItemType}
        onSave={itemDialog.handleSave}
        onDelete={itemDialog.handleDelete}
      />
    </div>
  );
}