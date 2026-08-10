# StudyHub

A local-first, private study portal for Gen Z students. Tracks courses, assignments, exams, study sessions, and wellness — runs as a browser extension or web app, all data stays on-device.

## Core Data

**Item**:
A single tracked thing in the planner — one of Task, Exam, Event, or Timetable. The discriminated union at the heart of the data model.
_Avoid_: Entry, Record, Event (collides with the subtype)

**Task**:
A piece of coursework with a due date and priority; trackable as done or not-done.
_Avoid_: Assignment, Homework, Todo

**Exam**:
A graded assessment with a start time and weight (0–100%); trackable as taken or not-taken.
_Avoid_: Test, Quiz

**Event**:
A calendar entry with a start/end time, possibly all-day, possibly recurring.
_Avoid_: Appointment, CalendarItem

**Timetable**:
A recurring weekly class slot tied to a weekday and time block (lecture, tutorial, workshop, or lab). Defined by pattern, not by concrete dates.
_Avoid_: Class, Schedule (schedule is the rendered view, not the entry)

**File Attachment**:
A user-uploaded file embedded in a note or linked to a course syllabus, stored on-device as base64. Tracked by id and garbage-collected when no note or syllabus references it.
_Avoid_: Upload, Attachment (alone)

## Academic

**Course**:
A course the student is currently taking, with emoji, syllabus, links, and contacts.
_Avoid_: Class, Module

**DegreeCourse**:
A course in a degree plan, with acronym, credits, prerequisites, and a completed flag. Not the same as a Course — a DegreeCourse is planned, a Course is taken.
_Avoid_: PlannedCourse, Course (when in the degree-plan context)

**Degree Plan**:
A structured map of semesters and their planned courses toward a degree.
_Avoid_: Curriculum, Academic Plan

**Study Session**:
A record of time spent studying — captured by the focus timer, with technique used, duration, and mood before/after. The timer is the tool; the session is the outcome. The timer's behavior (audio, notifications, site blocking, countdown) is governed by Focus Timer Settings, stored on-device in `store.focusTimer` and synced across contexts.
_Avoid_: Focus Session, Pomodoro, Timer Session

## Activities

**Project**:
A student activity outside coursework — an organization, club, research team, competition, startup, or other endeavor. Subtyped by ProjectType.
_Avoid_: Activity, Endeavor, Involvement

## Wellness

**Wellness**:
The cluster of self-care tracking: water intake, mood, and gratitude. Bundled under one tab and one state object.
_Avoid_: Self-Care, Mind & Body, Daily Check-In

## Application

**Container Mode**:
How the app is rendered — popup, sidepanel, newtab, tab, overlay, or web. Determines available dimensions and behavior.
_Avoid_: Mode (alone), Surface, Context (collides with React)

**Google Calendar Sync**:
A mechanism that pushes a dated Item (Event, Task, or Exam) to a Google Calendar Event so the two stay in step. A Timetable never syncs because it defines a pattern, not concrete dates. The reverse direction, a Google Calendar Event into the app, is an Import.
_Avoid_: Export (for the automatic push), Google Sync

## Calendar

**Occurrence**:
A concrete dated appearance of an item on the calendar. A one-off Task or Exam has one occurrence. A recurring Event has one occurrence per matching date in its recurrence range. A Timetable has one occurrence per matching weekday in a date range.
_Avoid_: Instance (collides with class/component instance), View
