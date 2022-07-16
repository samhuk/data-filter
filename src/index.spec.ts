import { createDataFilter } from '.'
import { DataFilterLogic, Operator } from './types'

describe('createDataFilter', () => {
  const fn = createDataFilter

  describe('toSql', () => {
    test('unhappy paths', () => {
      const dataFilter = fn(null)
      expect(dataFilter.toSql()).toBeNull()
      expect(dataFilter.toJson()).toBe('null')
    })

    test('test 1', () => {
      const dataFilter = fn({
        initialFilter: {
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
        },
      })

      // eslint-disable-next-line quotes
      expect(dataFilter.toSql()).toBe(`(user.id = 1 and (user.name in ('john', 'joe', 'bob') or user.email like '%email.com') and user.date_deleted is not null)`)
    })
  })
})
