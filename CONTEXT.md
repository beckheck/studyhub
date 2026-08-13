# StudyHub

A local-first, private study portal for Gen Z students. The app tracks courses, tasks, exams, study sessions, and wellness. It runs as a browser extension or web app. All data stays on-device.

## Core Data

**Item**: A single tracked thing in the planner. One of Task, Exam, Event, or Timetable. The discriminated union that forms the data model.
_Avoid_: Entry, Record, Event (collides with the subtype)

**Task**: A piece of coursework with a due date and priority. The user marks a Task done or not-done.
_Avoid_: Assignment, Homework, Todo

**Exam**: A graded assessment with a start time and a weight from 0 to 100 percent. The user marks an Exam taken or not-taken.
_Avoid_: Test, Quiz

**Grade**: A numeric score on a 1 to 7 scale recorded against an Exam. The app combines the Grade with the Exam's weight to compute a weighted average for a Course. Deleting an Exam deletes its Grades.
_Avoid_: Score, Result, Mark

**Event**: A calendar entry with a start and end time. An Event may span a full day and may recur.
_Avoid_: Appointment, CalendarItem

**Timetable**: A recurring weekly class slot. A Timetable targets a weekday and a time block. The time block covers a lecture, tutorial, workshop, or lab. A Timetable specifies a pattern, not concrete dates.
_Avoid_: Class, Schedule (schedule is the rendered view, not the entry)

**File Attachment**: A user-uploaded file embedded in a note or linked to a course syllabus. The app stores the file on-device as base64. The app tracks the file by id and garbage-collects it when no note or syllabus references it.
_Avoid_: Upload, Attachment (alone)

**Note**: An ambiguous term in this app. Three concepts carry freeform text. `Item.notes` on any Item holds an Item note, which syncs to the Google Calendar description. `CourseRecord.content` holds a Course Record, a dated per-course journal entry. `StudySession.note` holds a Session note, a post-session reflection. Use the specific term when the referent matters.
_Avoid_: Note (alone, when the referent is unclear)

## Academic

**Course**: A course the student takes. A Course has an emoji, syllabus, links, and contacts.
_Avoid_: Class, Module

**Course Record**: A dated per-course journal entry. A Course Record has an optional mood and freeform content. A Course Record differs from an Item. It tracks day-to-day course activity, not graded work or scheduled events. The course manager renders Course Records on their own calendar. Each Course Record has one Course Record Kind.
_Avoid_: Course Note (too narrow, excludes non-note kinds), Course Log

**Course Record Kind**: The fixed category of a Course Record. One of note, attendance, homework, lecture, lab, other. Three names overlap with existing domain terms and require care. `homework` here means a homework log entry, not a Task. Avoid "Homework" for Task. `lecture` and `lab` here mean a record of attending that session, not the Timetable activity type that defines a recurring weekly slot.
_Avoid_: Record Type, Entry Type

**DegreeCourse**: A course in a degree plan. A DegreeCourse has an acronym, credits, prerequisites, and a completed flag. A DegreeCourse represents a planned course. A Course represents a course the student takes. The two differ.
_Avoid_: PlannedCourse, Course (when in the degree-plan context)

**Semester**: A numbered term in a Degree Plan that holds its planned DegreeCourses. A Degree Plan orders Semesters by `number`, not by date. A Semester differs from Semester Dates, which mark the real-world calendar boundaries.
_Avoid_: Term, Period

**Degree Plan**: A structured map of semesters and their planned courses toward a degree.
_Avoid_: Curriculum, Academic Plan

**Semester Dates**: The real-world academic calendar boundaries. Semester Dates include first and second semester start and end, the finals window, recess week, and winter break. The app stores Semester Dates as date strings, separate from the Degree Plan. Semester Dates drive the auto-generated Semester Auto-Events on the planner.
_Avoid_: Academic Calendar (collides with the rendered calendar view), Term Dates

**Study Session**: A record of time spent studying. The focus timer captures a Study Session, with technique used, duration, and mood before and after. Focus Timer Settings govern the timer's behavior: audio, notifications, site blocking, countdown. The app stores Focus Timer Settings on-device in `store.focusTimer` and syncs them across contexts.
_Avoid_: Focus Session, Pomodoro, Timer Session

**Study Session Task**: A lightweight checklist item inside a Study Session. A Study Session Task has a title and a done flag. The user creates these during a session to track sub-steps. A Study Session Task differs from an Item and from a Task. It stays within its session and does not appear on the planner.
_Avoid_: Session Todo, Checklist Item

**Focus Timer Settings**: The on-device configuration that governs the focus timer's behavior. Focus Timer Settings include audio toggles and volume, notifications, countdown visibility, and the site-blocking strategy with its list of sites. The site-blocking strategy uses blacklist, whitelist, or disabled. The app stores Focus Timer Settings in `store.focusTimer` and syncs them across contexts. Focus Timer Settings differ from the Study Session outcome.
_Avoid_: Timer Preferences, Pomodoro Settings

## Activities

**Project**: A student activity outside coursework. A Project covers an organization, club, research team, competition, startup, or other endeavor. A Project Type subtypes a Project.
_Avoid_: Activity, Endeavor, Involvement

**Project Type**: The subtype of a Project. One of organization, club, research, politics, competition, startup, other. A Project Type determines the icon and label shown in the Projects tab. The enum stays fixed. The user cannot extend it.
_Avoid_: Category, Project Category

## Wellness

**Wellness**: The cluster of self-care tracking. Wellness covers water intake, mood, and gratitude. The app bundles these under one tab and one state object.
_Avoid_: Self-Care, Mind & Body, Daily Check-In

## Application

**Container Mode**: How the app renders. One of popup, sidepanel, newtab, tab, overlay, or web. A Container Mode determines available dimensions and behavior.
_Avoid_: Mode (alone), Surface, Context (collides with React)

**Google Calendar Sync**: A mechanism that pushes a dated Item to a Google Calendar Event so both stay consistent. A dated Item covers an Event, Task, or Exam. A Timetable never syncs because it defines a pattern, not concrete dates. The reverse direction, a Google Calendar Event into the app, is an Import.
_Avoid_: Export (for the automatic push), Google Sync

**Item write**: The single flow through which an Item change persists. When the changed field has a Google counterpart, the flow propagates the change to Google Calendar Sync and stamps the returned event id onto the Item. Every Item mutation surface crosses this flow. Item mutation surfaces include the dialog, planner drag, planner notes, and completion toggles.
_Avoid_: Save Service, Item Handler

## Calendar

**Occurrence**: A concrete dated appearance of an item on the calendar. A one-off Task or Exam has one Occurrence. A recurring Event has one Occurrence per matching date in its recurrence range. A Timetable has one Occurrence per matching weekday in a date range.
_Avoid_: Instance (collides with class/component instance), View

**Semester Auto-Event**: An Event the app generates from Semester Dates. A Semester Auto-Event marks the first or last day of classes, the finals window, recess week, or winter break. The app tags these Events with `semester-auto-event` so it can rebuild the set on change without touching user-created Events. The user does not create these directly.
_Avoid_: Semester Marker, Calendar Holiday

**Weekly Goal**: A short-term goal the user sets in the planner week view. A Weekly Goal has a title and a completion toggle. Completing all goals triggers confetti, then clears the list. A Weekly Goal differs from an Item and from a Task. It stays in the week view and does not sync to Google Calendar.
_Avoid_: Weekly Task, Weekly Target
