import {
  DataFilter,
  DataFilterNodeGroup,
  DataFilterNode,
  ToSqlOptions,
  DataType,
  Operator,
  DataFilterLogic,
  DataFilterNodeOrGroup,
  ResolvedToSqlOptions,
} from './types'

type ValueStore = {
  /**
   * List of values that have been added to the store.
   */
  values: any[]
  /**
   * Adds a new value to the store.
   *
   * @returns The numbered parameter string for the value added, E.g. `$1`, `$2`, etc.
   */
  addValue: (newValue: any) => string
}

type ValueStoreOptions = {
  /**
   * @default 1
   */
  startIndex?: number
}

const createValueStore = (options?: ValueStoreOptions): ValueStore => {
  let i = (options?.startIndex ?? 1) - 1

  let valueStore: ValueStore
  return valueStore = {
    values: [],
    addValue: newValue => {
      valueStore.values.push(newValue)
      i += 1
      return `$${i}`
    },
  }
}

const createBlankString = (length: number): string => {
  let s = ''
  for (let i = 0; i < length; i += 1)
    s += ' '
  return s
}

const quoteValue = (v: string | number | boolean): string => `'${v}'`

const isNodeGroup = (n: DataFilterNodeGroup | DataFilterNode): n is DataFilterNodeGroup => (
  (n as DataFilterNodeGroup)?.nodes != null
)

const inferDataType = (value: any): DataType => {
  const _typeof = typeof value

  if (_typeof === 'number')
    return DataType.NUMERIC

  if (_typeof === 'string')
    return DataType.STRING

  if (_typeof === 'boolean')
    return DataType.BOOLEAN

  if (Array.isArray(value) && value[0] != null)
    return inferDataType(value[0])

  return DataType.OTHER
}

const createNodeOpVal = (node: DataFilterNode, useParameters: boolean, valueStore: ValueStore): string => {
  const type = node.dataType ?? inferDataType(node.val)

  // Special handling for null value, which means that we must do "is null" or "is not null".
  if (node.val === null)
    return node.op === Operator.EQUALS ? 'is null' : 'is not null'

  const shouldQuoteValue = type === DataType.STRING || type === DataType.EPOCH

  let valStr: string = null
  if (node.op === Operator.BETWEEN) {
    valStr = useParameters
      // E.g. $1 and $2
      ? `${valueStore.addValue(node.val[0])} and ${valueStore.addValue(node.val[1])}`
      : shouldQuoteValue
        // E.g. 'a' and 'b', between '01-01-2020' and '02-01-2020'
        ? `${quoteValue(node.val[0])} and ${quoteValue(node.val[1])}`
        // E.g. between 1 and 5
        : `${node.val[0]} and ${node.val[1]}`
  }
  else if (node.op === Operator.IN) {
    valStr = useParameters
      // E.g. ($1, $2, $3)
      ? `(${node.val.map(valueStore.addValue).join(', ')})`
      : shouldQuoteValue
        // E.g. ('a', 'b', 'c')
        ? `(${node.val.map(quoteValue).join(', ')})`
        // E.g. (1, 2, 3)
        : `(${node.val.join(', ')})`
  }
  else {
    valStr = useParameters
      // E.g. $1
      ? valueStore.addValue(node.val)
      : shouldQuoteValue
        // E.g. 'a'
        ? quoteValue(node.val)
        // E.g. 1
        : node.val.toString()
  }

  return `${node.op} ${valStr}`
}

/**
 * Converts the data filter node to sql, E.g. "user.id between 1 and 5".
 */
const nodeToSql = (node: DataFilterNode, options: ResolvedToSqlOptions, valueStore: ValueStore, fieldPrefix?: string): string => {
  const transformerResult = options.transformer?.(node, fieldPrefix)
  const left = transformerResult?.left ?? `${fieldPrefix ?? ''}${node.field}`

  const opVal = createNodeOpVal(node, options.useParameters, valueStore)

  return `${left} ${opVal}`
}

const createIndentationString = (depth: number, indentation: number) => (
  indentation === 0 ? '' : '\n'.concat(createBlankString(depth * indentation))
)

const createLogicString = (logic: DataFilterLogic, depth: number, indentation: number) => (
  `${indentation === 0 ? ' ' : createIndentationString(depth, indentation)}${logic} `
)

/**
 * Converts the data filter node group to sql.
 */
const groupToSql = (nodeGroup: DataFilterNodeGroup, options: ResolvedToSqlOptions, depth: number, valueStore?: ValueStore): string => (
  nodeGroup != null
    ? `(${createIndentationString(depth, options.indentation)}${nodeGroup.nodes
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      .map(n => nodeOrGroupToSql(n, options, valueStore, nodeGroup.fieldPrefix, depth))
      .join(createLogicString(nodeGroup.logic, depth, options.indentation))}${createIndentationString(depth - 1, options.indentation)})`
    : null
)

const nodeOrGroupToSql = (
  nodeOrGroup: DataFilterNodeOrGroup,
  options: ResolvedToSqlOptions,
  valueStore?: ValueStore,
  fieldPrefix?: string,
  depth: number = 0,
): string => (
  nodeOrGroup != null
    ? isNodeGroup(nodeOrGroup)
      ? groupToSql(nodeOrGroup, options, depth + 1, valueStore)
      : nodeToSql(nodeOrGroup, options, valueStore, fieldPrefix)
    : null
)

const join = (
  logic: DataFilterLogic,
  ...nodeOrGroups: DataFilterNodeOrGroup[]
) => ({
  logic,
  nodes: nodeOrGroups.filter(v => v != null),
})

const union = (...nodeOrGroups: DataFilterNodeOrGroup[]) => join(DataFilterLogic.OR, ...nodeOrGroups)

const intersection = (...nodeOrGroups: DataFilterNodeOrGroup[]) => join(DataFilterLogic.AND, ...nodeOrGroups)

const resolveToSqlOptions = (options?: ToSqlOptions): ResolvedToSqlOptions => ({
  transformer: options?.transformer,
  indentation: options?.indentation ?? 0,
  useParameters: options.useParameters ?? true,
  // @ts-ignore TODO: Figure out how to do a boolean version of type discriminated union
  parameterStartIndex: options.useParameters === true ? ((options as ToSqlOptions<true>).parameterStartIndex ?? 1) : null,
})

const getFieldPrefixOfNodeOrGroup = (nodeOrGroup: DataFilterNodeOrGroup): string | null => (
  isNodeGroup(nodeOrGroup) ? nodeOrGroup.fieldPrefix : null
)

export const createDataFilter = <TFieldNames extends string>(
  initialFilter?: DataFilterNodeOrGroup<TFieldNames>,
): DataFilter<TFieldNames> => {
  let component: DataFilter

  return component = {
    value: initialFilter ?? null,
    addAnd: newNode => component.value = intersection(component.value, newNode),
    addOr: newNode => component.value = union(component.value, newNode),
    toSql: _options => {
      const resolvedOptions = resolveToSqlOptions(_options)
      const valueStore = resolvedOptions.useParameters
        ? createValueStore({ startIndex: (resolvedOptions as ResolvedToSqlOptions<true>).parameterStartIndex })
        : null
      const sql = nodeOrGroupToSql(
        component.value,
        resolvedOptions,
        valueStore,
        getFieldPrefixOfNodeOrGroup(component.value),
      )
      return (resolvedOptions.useParameters
        ? { sql, values: valueStore.values }
        : sql) as any
    },
    toJson: () => JSON.stringify(component.value),
    updateFilter: newFilter => component.value = newFilter,
  }
}

export const joinDataFilters = <TFieldNames extends string>(
  logic: DataFilterLogic,
  ...dataFilters: DataFilter<TFieldNames>[]
): DataFilter<TFieldNames> => createDataFilter<TFieldNames>({
  logic,
  nodes: dataFilters.map(v => v?.value).filter(v => v != null),
})
