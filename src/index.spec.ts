import { createDataFilter } from '.'
import { DataFilterLogic, DataFilterNodeOrGroup, Operator } from './types'

const COMPLEX_FILTER: DataFilterNodeOrGroup = {
  logic: DataFilterLogic.AND,
  nodes: [
    { field: 'user.id', op: Operator.EQUALS, val: 1 },
    {
      logic: DataFilterLogic.OR,
      nodes: [
        { field: 'user.name', op: Operator.IN, val: ['john', 'joe', 'bob'] },
        { field: 'user.email', op: Operator.LIKE, val: '%email.com' },
      ],
    },
    { field: 'user.date_deleted', op: Operator.NOT_EQUALS, val: null },
  ],
}

describe('createDataFilter', () => {
  const fn = createDataFilter

  describe('field types', () => {
    test('test 1', () => {
      type FieldNames = 'id'|'uuid'|'name'|'email'|'dateDeleted'
      const filter1: DataFilterNodeOrGroup<FieldNames> = {
        field: 'id',
        op: Operator.BETWEEN,
        val: [1, 5],
      }
      const filter2: DataFilterNodeOrGroup<FieldNames> = {
        // @ts-expect-error
        field: 'notAField',
        // @ts-expect-error
        op: Operator.BETWEEN,
        val: [1, 5],
      }
      const dataFilter = fn(filter1)
      dataFilter.addAnd(filter2)

      expect(dataFilter).toBeDefined() // Dummy assertion
    })
  })

  describe('toSql', () => {
    describe('useParameters = false', () => {
      test('unhappy paths', () => {
        const dataFilter = fn(null)
        expect(dataFilter.toSql({ useParameters: false })).toBeNull()
        expect(dataFilter.toJson()).toBe('null')
      })

      test('complex filter', () => {
        const dataFilter = fn(COMPLEX_FILTER)

        const result = dataFilter.toSql({ useParameters: false })
        // eslint-disable-next-line quotes
        expect(result).toBe(`(user.id = 1 and (user.name in ('john', 'joe', 'bob') or user.email like '%email.com') and user.date_deleted is not null)`)
      })

      test('indentation', () => {
        const dataFilter = fn(COMPLEX_FILTER)

        const result = dataFilter.toSql({ indentation: 2, useParameters: false })
        expect(result).toBe(`(
  user.id = 1
  and (
    user.name in ('john', 'joe', 'bob')
    or user.email like '%email.com'
  )
  and user.date_deleted is not null
)`)
      })
    })

    describe('useParameters = true', () => {
      test('unhappy paths', () => {
        const dataFilter = fn(null)
        expect(dataFilter.toSql({ useParameters: true })).toEqual({ sql: null, values: [] })
        expect(dataFilter.toJson()).toBe('null')
      })

      test('complex filter', () => {
        const dataFilter = fn(COMPLEX_FILTER)

        const result = dataFilter.toSql({ useParameters: true })
        expect(result.sql).toBe('(user.id = $1 and (user.name in ($2, $3, $4) or user.email like $5) and user.date_deleted is not null)')
        expect(result.values).toEqual([1, 'john', 'joe', 'bob', '%email.com'])
      })

      test('complex filter - non-default starting index', () => {
        const dataFilter = fn(COMPLEX_FILTER)

        const result = dataFilter.toSql({ useParameters: true, parameterStartIndex: 5 })
        expect(result.sql).toBe('(user.id = $5 and (user.name in ($6, $7, $8) or user.email like $9) and user.date_deleted is not null)')
        expect(result.values).toEqual([1, 'john', 'joe', 'bob', '%email.com'])
      })

      test('indentation', () => {
        const dataFilter = fn(COMPLEX_FILTER)

        const result = dataFilter.toSql({ indentation: 2, useParameters: true })
        expect(result.sql).toBe(`(
  user.id = $1
  and (
    user.name in ($2, $3, $4)
    or user.email like $5
  )
  and user.date_deleted is not null
)`)
        expect(result.values).toEqual([1, 'john', 'joe', 'bob', '%email.com'])
      })
    })
  })

  test('addOr', () => {
    const dataFilter = fn({ field: 'foo', op: Operator.EQUALS, val: 'a' })

    dataFilter.addOr({ field: 'bar', op: Operator.NOT_EQUALS, val: 'b' })

    expect(dataFilter.value).toEqual({
      logic: DataFilterLogic.OR,
      nodes: [
        { field: 'foo', op: Operator.EQUALS, val: 'a' },
        { field: 'bar', op: Operator.NOT_EQUALS, val: 'b' },
      ],
    })
  })

  test('addAnd', () => {
    const dataFilter = fn({ field: 'foo', op: Operator.EQUALS, val: 'a' })

    dataFilter.addAnd({ field: 'bar', op: Operator.NOT_EQUALS, val: 'b' })

    expect(dataFilter.value).toEqual({
      logic: DataFilterLogic.AND,
      nodes: [
        { field: 'foo', op: Operator.EQUALS, val: 'a' },
        { field: 'bar', op: Operator.NOT_EQUALS, val: 'b' },
      ],
    })
  })
})
