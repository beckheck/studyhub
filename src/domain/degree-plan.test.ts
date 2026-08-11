import { describe, it, expect } from 'vite-plus/test'
import {
  checkPrerequisites,
  getCourseStatus,
  getTotalCredits,
  getCompletedCredits,
  computeSemestersWithCourse,
  computeCompletedCourses,
  computeSemestersWithNewSemester,
} from './degree-plan'
import type { DegreeCourse, Semester } from '@/types'

function makeCourse(acronym: string, credits: string, prerequisites?: string): DegreeCourse {
  return {
    id: `id-${acronym}`,
    acronym,
    name: `Course ${acronym}`,
    credits,
    prerequisites,
    completed: false,
  }
}

function makeSemester(number: number, courses: DegreeCourse[] = []): Semester {
  return { id: number, number, courses }
}

describe('checkPrerequisites', () => {
  it('returns true when the course has no prerequisites', () => {
    const course = makeCourse('CS101', '3')
    expect(checkPrerequisites(course, [])).toBe(true)
  })

  it('returns true when all prerequisites are in completedCourses', () => {
    const course = makeCourse('CS201', '3', 'CS101, MATH101')
    expect(checkPrerequisites(course, ['CS101', 'MATH101'])).toBe(true)
  })

  it('returns false when a prerequisite is missing', () => {
    const course = makeCourse('CS201', '3', 'CS101, MATH101')
    expect(checkPrerequisites(course, ['CS101'])).toBe(false)
  })

  it('trims whitespace in prerequisite lists', () => {
    const course = makeCourse('CS201', '3', 'CS101,  MATH101 ')
    expect(checkPrerequisites(course, ['CS101', 'MATH101'])).toBe(true)
  })
})

describe('getCourseStatus', () => {
  it('returns "completed" when the course acronym is in completedCourses', () => {
    const course = makeCourse('CS101', '3')
    expect(getCourseStatus(course, ['CS101'])).toBe('completed')
  })

  it('returns "available" when prerequisites are met and course is not completed', () => {
    const course = makeCourse('CS201', '3', 'CS101')
    expect(getCourseStatus(course, ['CS101'])).toBe('available')
  })

  it('returns "blocked" when prerequisites are not met', () => {
    const course = makeCourse('CS201', '3', 'CS101')
    expect(getCourseStatus(course, [])).toBe('blocked')
  })

  it('returns "available" when course has no prerequisites and is not completed', () => {
    const course = makeCourse('CS101', '3')
    expect(getCourseStatus(course, [])).toBe('available')
  })
})

describe('getTotalCredits', () => {
  it('sums credits across all semesters and courses', () => {
    const semesters = [
      makeSemester(1, [makeCourse('CS101', '3'), makeCourse('MATH101', '4')]),
      makeSemester(2, [makeCourse('CS201', '3')]),
    ]

    expect(getTotalCredits(semesters)).toBe(10)
  })

  it('returns 0 for empty semesters', () => {
    expect(getTotalCredits([])).toBe(0)
  })

  it('treats empty credit strings as 0', () => {
    const semesters = [makeSemester(1, [makeCourse('CS101', '')])]

    expect(getTotalCredits(semesters)).toBe(0)
  })
})

describe('getCompletedCredits', () => {
  it('sums credits only for completed courses', () => {
    const semesters = [
      makeSemester(1, [makeCourse('CS101', '3'), makeCourse('MATH101', '4')]),
      makeSemester(2, [makeCourse('CS201', '3')]),
    ]
    const completedCourses = ['CS101', 'CS201']

    expect(getCompletedCredits(semesters, completedCourses)).toBe(6)
  })

  it('returns 0 when no courses are completed', () => {
    const semesters = [makeSemester(1, [makeCourse('CS101', '3')])]

    expect(getCompletedCredits(semesters, [])).toBe(0)
  })
})

describe('computeSemestersWithCourse', () => {
  it('adds a course to the specified semester', () => {
    const semesters = [makeSemester(1, [makeCourse('CS101', '3')]), makeSemester(2, [])]
    const courseData = { acronym: 'CS201', name: 'Algorithms', credits: '3', prerequisites: 'CS101' }

    const result = computeSemestersWithCourse(semesters, 2, courseData)

    expect(result[1].courses).toHaveLength(1)
    expect(result[1].courses[0].acronym).toBe('CS201')
    expect(result[1].courses[0].completed).toBe(false)
    expect(result[1].courses[0].id).toBeDefined()
  })

  it('does not modify other semesters', () => {
    const semesters = [makeSemester(1, [makeCourse('CS101', '3')]), makeSemester(2, [])]
    const courseData = { acronym: 'CS201', name: 'Algorithms', credits: '3' }

    const result = computeSemestersWithCourse(semesters, 2, courseData)

    expect(result[0].courses).toEqual(semesters[0].courses)
  })

  it('does not mutate the input', () => {
    const semesters = [makeSemester(1, [])]
    const courseData = { acronym: 'CS101', name: 'Intro', credits: '3' }

    computeSemestersWithCourse(semesters, 1, courseData)

    expect(semesters[0].courses).toHaveLength(0)
  })
})

describe('computeCompletedCourses', () => {
  it('removes a course when it is already completed', () => {
    const completed = ['CS101', 'MATH101']

    const result = computeCompletedCourses(completed, 'CS101')

    expect(result).toEqual(['MATH101'])
  })

  it('adds a course when it is not completed', () => {
    const completed = ['CS101']

    const result = computeCompletedCourses(completed, 'MATH101')

    expect(result).toEqual(['CS101', 'MATH101'])
  })

  it('does not mutate the input array', () => {
    const completed = ['CS101']

    computeCompletedCourses(completed, 'MATH101')

    expect(completed).toEqual(['CS101'])
  })
})

describe('computeSemestersWithNewSemester', () => {
  it('appends a new semester with the next number and empty courses', () => {
    const semesters = [makeSemester(1, [makeCourse('CS101', '3')])]

    const result = computeSemestersWithNewSemester(semesters)

    expect(result).toHaveLength(2)
    expect(result[1].number).toBe(2)
    expect(result[1].courses).toEqual([])
    expect(result[1].id).toBeDefined()
  })

  it('does not mutate the input array', () => {
    const semesters = [makeSemester(1, [])]

    computeSemestersWithNewSemester(semesters)

    expect(semesters).toHaveLength(1)
  })
})
