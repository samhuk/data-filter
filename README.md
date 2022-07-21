# data-filter

A package for creating data filters, with conversion to an SQL WHERE clause.

## Usage

`npm i @samhuk/data-filter`

Simple, single-node filter
```typescript
import { createDataFilter } from '@samhuk/data-filter'
import { Operator, DataFilterLogic } from '@samhuk/data-filter/types'

const df1 = createDataFilter({
  field: 'username',
  op: Operator.EQUALS,
  val: 'bob',
})
console.log(df1.toSql()) // (username = 'bob')
```

Complex, nested filter:

```typescript
import { createDataFilter } from '@samhuk/data-filter'
import { Operator, DataFilterLogic } from '@samhuk/data-filter/types'

const df2 = createDataFilter({
  logic: DataFilterLogic.AND,
  nodes: [
    { field: 'id', op: Operator.IN, val: [1, 2, 3] },
    {
      logic: DataFilterLogic.OR,
      nodes: [
        { field: 'email_v1', op: Operator.NOT_EQUALS, val: null },
        { field: 'email_v2', op: Operator.NOT_EQUALS, val: null },
      ],
    },
    { field: 'date_deleted', op: Operator.NOT_EQUALS, val: 'null' },
  ],
})
console.log(df2.toSql({ indentation: 2 }))
```

Merging filters (using `df1` and `df2` from above):

```typescript
import { joinDataFilters } from '@samhuk/data-filter'
df1.addAnd({ field: 'bar', op: Operator.NOT_EQUALS, val: 'b' })
df1.addOr(df2.value)
const df3 = joinDataFilters(DataFilterLogic.AND, df1, df2)
```

Use strings instead of Typescript Enums:

```typescript
import { createDataFilter } from '@samhuk/data-filter'

const df1 = createDataFilter({
  field: 'username', op: '=', val: 'bob',
})
df1.addAnd({ field: 'id', op: 'between', val: [1, 5] })
```

See the JSDocs for more information on the available operators and other options.

## Development

`npm i`

`npm start` - Start a hot reloading tsc build.

`npm run check` - Run linting, unit tests, and tsc build.