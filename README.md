# data-filter

A Javascript data filter package.

## Usage

`npm i @samhuk/data-filter`

```typescript
import { createDataFilter } from '@samhuk/data-filter'
import { Operator, DataFilterLogic } from '@samhuk/data-filter/types'

// Single-node filter
const df1 = createDataFilter({
  field: 'username',
  op: Operator.EQUALS,
  val: 'bob',
})
console.log(df1.toSql()) // (username = 'bob')

// Complex filter
const df3 = createDataFilter({
  logic: DataFilterLogic.AND,
  nodes: [
    { field: 'id', op: Operator.IN, val: [1,2,3] },
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
console.log(df3.toSql())
// (id in (1,2,3) and (email_v1 is not null or email_v2 is not null) and date_deleted is not null)
```

## Development

`npm i`

`npm start` - Start a hot reloading tsc build.

`npm run check` - Run linting, unit tests, and tsc build.