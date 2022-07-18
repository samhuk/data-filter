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

const createNodeOpVal = (node: DataFilterNode): string => {
  const type = node.dataType ?? inferDataType(node.val)

  // Special handling for null value, which means that we must do "is null" or "is not null".
  if (node.val === null)
    return node.op === Operator.EQUALS ? 'is null' : 'is not null'

  const shouldQuoteValue = type === DataType.STRING || type === DataType.EPOCH

  if (node.op === Operator.BETWEEN) {
    return shouldQuoteValue
      // I.e. "between 'a' and 'b'", "between '01-01-2020' and '02-01-2020'"
      ? `${node.op} ${quoteValue(node.val[0])} and ${quoteValue(node.val[1])}`
      // I.e. "between 1 and 5"
      : `${node.op} ${node.val[0]} and ${node.val[1]}`
  }
  if (node.op === Operator.IN) {
    return shouldQuoteValue
      // I.e. "in ('a', 'b', 'c')"
      ? `${node.op} (${node.val.map(quoteValue).join(', ')})`
      // I.e. "in (1, 2, 3)"
      : `${node.op} (${node.val.join(', ')})`
  }

  // I.e. ? "'a'", "'01-01-2020'" : "1"
  const val = shouldQuoteValue ? quoteValue(node.val) : node.val.toString()
  return `${node.op} ${val}`
}

/**
 * Converts the data filter node to sql, i.e. "user.id between 1 and 5".
 */
const nodeToSql = (node: DataFilterNode, options: ResolvedToSqlOptions, fieldPrefix?: string): string => {
  const transformerResult = options.transformer?.(node, fieldPrefix)
  const left = transformerResult?.left ?? `${fieldPrefix ?? ''}${node.field}`

  const opVal = createNodeOpVal(node)

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
const groupToSql = (nodeGroup: DataFilterNodeGroup, options: ResolvedToSqlOptions, depth: number): string => (
  nodeGroup != null
    ? `(${createIndentationString(depth, options.indentation)}${nodeGroup.nodes
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      .map(n => nodeOrGroupToSql(n, options, nodeGroup.fieldPrefix, depth))
      .join(createLogicString(nodeGroup.logic, depth, options.indentation))}${createIndentationString(depth - 1, options.indentation)})`
    : null
)

const nodeOrGroupToSql = (
  nodeOrGroup: DataFilterNodeOrGroup,
  options: ResolvedToSqlOptions,
  fieldPrefix?: string,
  depth: number = 0,
): string => (
  nodeOrGroup != null
    ? isNodeGroup(nodeOrGroup)
      ? groupToSql(nodeOrGroup, options, depth + 1)
      : nodeToSql(nodeOrGroup, options, fieldPrefix)
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
    toSql: _options => nodeOrGroupToSql(
      component.value,
      resolveToSqlOptions(_options),
      getFieldPrefixOfNodeOrGroup(component.value),
    ),
    toJson: () => JSON.stringify(component.value),
    updateFilter: newFilter => component.value = newFilter,
  }
}
