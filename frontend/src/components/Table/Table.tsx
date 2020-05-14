/* eslint-disable @typescript-eslint/no-unused-vars */
import React from 'react';
import cn from 'classnames';

import { attachStaticFields } from 'utils/object';
import { filterChildrenByComponent } from 'utils/react';

import { useStyles } from './Table.style';

interface IColumnProps {
  children?: React.ReactNode;
}

interface IHeadProps {
  className?: string;
  align?: 'left' | 'center' | 'right';
  colSpan?: number;
  children: React.ReactNode | string;
}

interface ICellProps<T> {
  className?: string;
  align?: 'left' | 'center' | 'right';
  colSpan?: number;
  prop?: keyof T;
  children?: ({ index, data }: { index: number; data: T }) => React.ReactNode;
}

interface ITableProps<T> {
  className?: string;
  children?: React.ReactNode;
  data: T[];
  /** default: separated */
  variant?: 'separated' | 'compact';
  onClick?(): void;
}

function TableComponent<T>(props: ITableProps<T>) {
  const classes = useStyles();
  const { children, className, data, variant = 'separated' } = props;

  interface IAggregatedColumn {
    headProps?: IHeadProps;
    cellProps?: ICellProps<T>;
  }

  const columns: IAggregatedColumn[] = filterChildrenByComponent<IColumnProps>(
    children,
    Column,
  ).map(column => ({
    headProps: (filterChildrenByComponent(column.props.children, Head)[0] || {}).props,
    cellProps: (filterChildrenByComponent(column.props.children, Cell)[0] || {}).props,
  }));

  const needToRenderHead = columns.some(column => column.headProps);

  return (
    <table className={cn(classes.root, classes[variant], className)}>
      {needToRenderHead && (
        <thead>
          <tr>
            {columns.map(({ headProps }, index) =>
              headProps ? (
                <td key={index} align={headProps.align}>
                  {headProps.children}
                </td>
              ) : (
                <td key={index} />
              ),
            )}
          </tr>
        </thead>
      )}
      <tbody>
        {data.map((dataRow, index) => (
          <tr key={index} className={cn(props.className, { [classes.clickable]: !!props.onClick })}>
            {columns.map(({ cellProps }, cellIndex) =>
              cellProps ? (
                <td key={cellIndex} align={cellProps.align}>
                  {cellProps.prop
                    ? dataRow[cellProps.prop]
                    : cellProps.children && cellProps.children({ index, data: dataRow })}
                </td>
              ) : (
                <td key={cellIndex} />
              ),
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Column(_props: IColumnProps) {
  return <noscript />;
}

function Head(_props: IHeadProps) {
  return <noscript />;
}

function Cell<T>(_props: ICellProps<T>) {
  return <noscript />;
}

export type MakeTableType<T> = React.FunctionComponent<ITableProps<T>> & {
  Column: React.FunctionComponent<IColumnProps>;
  Head: React.FunctionComponent<IHeadProps>;
  Cell: React.FunctionComponent<ICellProps<T>>;
};

export const Table = attachStaticFields(TableComponent, { Column, Head, Cell });
