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
    test('unhappy paths', () => {
      const dataFilter = fn(null)
      expect(dataFilter.toSql()).toBeNull()
      expect(dataFilter.toJson()).toBe('null')
    })

    test('complex filter', () => {
      const dataFilter = fn(COMPLEX_FILTER)

      const result = dataFilter.toSql()
      // eslint-disable-next-line quotes
      expect(result).toBe(`(user.id = 1 and (user.name in ('john', 'joe', 'bob') or user.email like '%email.com') and user.date_deleted is not null)`)
    })

    test('indentation', () => {
      const dataFilter = fn(COMPLEX_FILTER)

      const result = dataFilter.toSql({ indentation: 2 })
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
