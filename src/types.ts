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
  /**
   * The LHS of the SQL expression for this node. E.g. the "user.id" in "user.id = 1".
   */
  field: TFieldNames
  /**
   * Optional forced data-type for the node. If this is omitted, then a default will
   * be infered from the Javascript type of `val`.
   */
  dataType?: DataType
} & TypeDependantBaseIntersection<Operator, {
  [K in Operator]: {
    /**
     * The RHS of the SQL expression for this node. E.g. the "1" in "user.id = 1".
     */
    val: OperatorToValueType[K]
  }
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
export type ToSqlOptions<TUseParameters extends boolean = boolean> = {
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
  /**
   * Determines whether filter values are inline, e.g. `'abc'`, `1`, `true`, or represented
   * as numbered parameters, e.g. `$1`, `$2`.
   *
   * If `true`, the result of `toSql()` will be a result object containing information
   * about the sql and parameters. If `false`, the result will instead be a string - the sql.
   *
   * @default true
   */
  useParameters?: TUseParameters
} & (TUseParameters extends true
  ? {
    /**
     * Determines the starting index used for numbered parameters (i.e. `$1`).
     *
     * @default 1
     */
    parameterStartIndex?: number
  }
  : { })

/**
 * ToSqlOptions but with defaults provided.
 */
export type ResolvedToSqlOptions<TUseParameters extends boolean = boolean> =
  Pick<ToSqlOptions, 'transformer'> & Required<Omit<ToSqlOptions<TUseParameters>, 'transformer'>>

export type ToSqlResult<TUseParameters extends boolean> =
  TUseParameters extends true
    ? { sql: string, values: any[] }
    : string

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
  toSql: <TOptions extends ToSqlOptions>(options?: TOptions) => ToSqlResult<
    TOptions extends { useParameters: boolean } ? TOptions['useParameters'] : true
  >
  /**
   * Returns the current filter value JSON stringified.
   */
  toJson: () => string
}
