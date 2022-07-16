import { TypeDependantBaseIntersection } from './common/types'

/**
 * Options for the creation of a DataFilter
 */
export type DataFilterOptions<TFieldNames extends string = string> = {
  /**
   * The initial filter value for the DataFilter.
   */
  initialFilter: DataFilterNodeOrGroup<TFieldNames>
}

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
   * Prefix to prepend each `field` with of the node of this node group.
   */
  fieldPrefix?: string
  nodes: DataFilterNodeOrGroup<TFieldNames>[]
}

export type DataFilterNodeOrGroup<TFieldNames extends string = string> =
  DataFilterNodeGroup<TFieldNames> | DataFilterNode<Operator, TFieldNames>

export type NodeTransformResult = { left?: string } | null

/**
 * Options for converting the filter value to SQL.
 */
export type ToSqlOptions = {
  /**
   * Optional transformer for a node.
   */
  transformer?: (node: DataFilterNode, fieldPrefix?: string) => NodeTransformResult
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
