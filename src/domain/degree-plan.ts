import { uid } from '@/lib/utils'
import type { DegreeCourse, Semester } from '@/types'

export type CourseStatus = 'completed' | 'available' | 'blocked'

type ReadonlySemester = Omit<Semester, 'courses'> & { readonly courses: readonly DegreeCourse[] }

export function checkPrerequisites(course: DegreeCourse, completedCourses: readonly string[]): boolean {
  if (!course.prerequisites) return true

  const prereqAcronyms = course.prerequisites.split(',').map(p => p.trim())
  return prereqAcronyms.every(prereq => completedCourses.includes(prereq))
}

export function getCourseStatus(course: DegreeCourse, completedCourses: readonly string[]): CourseStatus {
  if (completedCourses.includes(course.acronym)) return 'completed'
  if (checkPrerequisites(course, completedCourses)) return 'available'
  return 'blocked'
}

export function getTotalCredits(semesters: readonly ReadonlySemester[]): number {
  return semesters.reduce((total, semester) => {
    return (
      total +
      semester.courses.reduce((semesterTotal, course) => {
        return semesterTotal + parseInt(course.credits || '0')
      }, 0)
    )
  }, 0)
}

export function getCompletedCredits(
  semesters: readonly ReadonlySemester[],
  completedCourses: readonly string[],
): number {
  return semesters.reduce((total, semester) => {
    return (
      total +
      semester.courses.reduce((semesterTotal, course) => {
        const isCompleted = completedCourses.includes(course.acronym)
        return semesterTotal + (isCompleted ? parseInt(course.credits || '0') : 0)
      }, 0)
    )
  }, 0)
}

export function computeSemestersWithCourse(
  semesters: readonly ReadonlySemester[],
  semesterNumber: number,
  courseData: Omit<DegreeCourse, 'id' | 'completed'>,
): Semester[] {
  return semesters.map(sem =>
    sem.number === semesterNumber
      ? {
          ...sem,
          courses: [
            ...sem.courses,
            {
              id: uid(),
              ...courseData,
              completed: false,
            },
          ],
        }
      : { ...sem, courses: [...sem.courses] },
  )
}

export function computeCompletedCourses(completedCourses: readonly string[], courseAcronym: string): string[] {
  if (completedCourses.includes(courseAcronym)) {
    return completedCourses.filter(c => c !== courseAcronym)
  }
  return [...completedCourses, courseAcronym]
}

export function computeSemestersWithNewSemester(semesters: readonly ReadonlySemester[]): Semester[] {
  const newSemesterNumber = semesters.length + 1
  return [
    ...semesters.map(sem => ({ ...sem, courses: [...sem.courses] })),
    {
      id: uid(),
      number: newSemesterNumber,
      courses: [],
    },
  ]
}
