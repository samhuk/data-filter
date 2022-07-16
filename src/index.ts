import {
  DataFilterOptions,
  DataFilter,
  DataFilterNodeGroup,
  DataFilterNode,
  ToSqlOptions,
  DataType,
  Operator,
  DataFilterLogic,
  DataFilterNodeOrGroup,
} from './types'

const LOGIC_TO_STRING = {
  [DataFilterLogic.AND]: 'and',
  [DataFilterLogic.OR]: 'or',
}

const OP_TO_STRING = {
  [Operator.EQUALS]: '=',
  [Operator.NOT_EQUALS]: '!=',
  [Operator.LESS_THAN]: '<',
  [Operator.GREATER_THAN]: '>',
  [Operator.GREATER_THAN_OR_EQUAL]: '>',
  [Operator.LESS_THAN_OR_EQUAL]: '>',
  [Operator.LIKE]: 'like',
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

  if (node.val === null)
    return node.op === Operator.EQUALS ? 'is null' : 'is not null'

  if (node.op === Operator.BETWEEN) {
    return type === DataType.STRING
      ? `between ${quoteValue(node.val[0])} and ${quoteValue(node.val[1])}`
      : `between ${node.val[0]} and ${node.val[1]}`
  }
  if (node.op === Operator.IN) {
    return type === DataType.STRING
      ? `in (${node.val.map(quoteValue).join(', ')})`
      : `in (${node.val.join(', ')})`
  }

  const val = type === DataType.STRING
    ? quoteValue(node.val)
    : node.val.toString()
  const op = OP_TO_STRING[node.op]
  return `${op} ${val}`
}

/**
 * Converts the data filter node to sql, i.e. "user.id between 1 and 5".
 */
const nodeToSql = (node: DataFilterNode, fieldPrefix?: string, options?: ToSqlOptions): string => {
  const transformerResult = options?.transformer?.(node, fieldPrefix)
  const left = transformerResult?.left ?? `${fieldPrefix ?? ''}${node.field}`

  const opVal = createNodeOpVal(node)

  return `${left} ${opVal}`
}

const groupToSql = (nodeGroup: DataFilterNodeGroup, options?: ToSqlOptions): string => (
  nodeGroup != null
    ? `(${nodeGroup.nodes
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      .map(n => nodeOrGroupToSql(n, nodeGroup.fieldPrefix, options))
      .join(` ${LOGIC_TO_STRING[nodeGroup.logic]} `)})`
    : null
)

const nodeOrGroupToSql = (nodeOrGroup: DataFilterNodeOrGroup, fieldPrefix?: string, options?: ToSqlOptions): string => (
  nodeOrGroup != null
    ? isNodeGroup(nodeOrGroup)
      ? groupToSql(nodeOrGroup, options)
      : nodeToSql(nodeOrGroup, fieldPrefix, options)
    : null
)

export const createDataFilter = (options: DataFilterOptions): DataFilter => {
  let component: DataFilter

  return component = {
    value: options?.initialFilter ?? null,
    addAnd: newNode => component.value = {
      logic: DataFilterLogic.AND,
      nodes: [component.value, newNode],
    },
    addOr: newNode => component.value = {
      logic: DataFilterLogic.OR,
      nodes: [component.value, newNode],
    },
    toSql: _options => nodeOrGroupToSql(component.value, isNodeGroup(component.value) ? component.value.fieldPrefix : null, _options),
    toJson: () => JSON.stringify(component.value),
    updateFilter: newFilter => component.value = newFilter,
  }
}
