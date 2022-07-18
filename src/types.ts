import { TypeDependantBaseIntersection } from './common/types'

export enum DataFilterLogic {
  AND = 'and',
  OR = 'or'
}

export enum DataType {
  /**
   * Any numeric value, e.g. integer, decimal, float, etc.
   */
  NUMERIC,
  /**
   * Any date-time value, i.e. time, date, datetime, datetime with timezone, etc.
   */
  EPOCH,
  /**
   * Any string value, i.e. fixed length, varying length, text, character, etc.
   */
  STRING,
  /**
   * Any boolean value, i.e. true/false.
   */
  BOOLEAN,
  /**
   * Any value that is not typed NUMERIC, EPOCH, STRING, or BOOLEAN.
   */
  OTHER,
}

export enum Operator {
  EQUALS = '=',
  NOT_EQUALS = '!=',
  GREATER_THAN = '>',
  GREATER_THAN_OR_EQUAL = '>=',
  LESS_THAN = '<',
  LESS_THAN_OR_EQUAL = '<=',
  LIKE = 'like',
  BETWEEN = 'between',
  IN = 'in',
}

export type OperatorToValueType = {
  [Operator.EQUALS]: string|number|boolean
  [Operator.NOT_EQUALS]: string|number|boolean
  [Operator.GREATER_THAN]: string|number
  [Operator.GREATER_THAN_OR_EQUAL]: string|number
  [Operator.LESS_THAN]: string|number
  [Operator.LESS_THAN_OR_EQUAL]: string|number
  [Operator.BETWEEN]: [string|number, string|number]
  [Operator.IN]: any[]
  [Operator.LIKE]: string
}

export type DataFilterNode<
  TOperator extends Operator = Operator,
  TFieldNames extends string = string,
> = {
  field: TFieldNames
  dataType?: DataType
} & TypeDependantBaseIntersection<Operator, {
  [K in Operator]: { val: OperatorToValueType[K] }
}, TOperator, 'op'>

export type DataFilterNodeGroup<TFieldNames extends string = string> = {
  logic: DataFilterLogic
  /**
   * Prefix to prepend each `field` with of all child nodes of this node group (recursive).
   */
  fieldPrefix?: string
  /**
   * The child nodes of this node group.
   */
  nodes: DataFilterNodeOrGroup<TFieldNames>[]
}

export type DataFilterNodeOrGroup<TFieldNames extends string = string> =
  DataFilterNodeGroup<TFieldNames> | DataFilterNode<Operator, TFieldNames>

export type NodeTransformResult = {
  /**
   * Optional transformed LHS of the SQL equality expression for a given node.
   */
  left?: string
} | null

/**
 * Options for converting the filter value to SQL.
 */
export type ToSqlOptions = {
  /**
   * Optional transformer for a node. This is useful if each node in the filter, when
   * transformed to SQL, needs to be consistently transformed. For example, if each field
   * name needs to be converted from one case to another (e.g. camel-case to snake-case).
   *
   * @default undefined // no transformer provided
   *
   * @param node The node to be transformed.
   * @param fieldPrefix The field prefix of the node.
   */
  transformer?: (node: DataFilterNode, fieldPrefix?: string) => NodeTransformResult
  /**
   * Optional indentation to apply to the output sql.
   *
   * @default 0 // all inline
   */
  indentation?: number
}

/**
 * ToSqlOptions but with defaults provided.
 */
export type ResolvedToSqlOptions = ToSqlOptions & {
  indentation: number
}

/**
 * A data filter representing a query, with support to be converted to a PostgreSQL WHERE clause.
 */
export type DataFilter<TFieldNames extends string = string> = {
  /**
   * The current filter value of the DataFilter.
   */
  value: DataFilterNodeOrGroup<TFieldNames>
  /**
   * Updates the current filter value.
   */
  updateFilter: (newFilter: DataFilterNodeOrGroup<TFieldNames>) => void
  /**
   * Adds a top-level AND filter node with the current filter value.
   */
  addAnd: (newNode: DataFilterNodeOrGroup) => void
  /**
   * Adds a top-level OR filter node with the current filter value.
   */
  addOr: (newNode: DataFilterNodeOrGroup) => void
  /**
   * Converts the current filter value to a PostgreSQL WHERE clause.
   */
  toSql: (options?: ToSqlOptions) => string
  /**
   * Returns the current filter value JSON stringified.
   */
  toJson: () => string
}
