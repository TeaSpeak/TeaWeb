import * as React from "react";
import {ReactElement} from "react";

const cssStyle = require("./Table.scss");

export interface TableColumn {
    name: string;

    header: () => ReactElement | ReactElement[];
    width?: number;
    fixedWidth?: string;

    className?: string;
}

export interface TableRow<T = any> {
    columns: {[key: string]: () => ReactElement | ReactElement[]};

    className?: string;
    userData?: T;
}

export interface TableProperties {
    columns: TableColumn[];
    rows: TableRow[];

    className?: string;
    headerClassName?: string;
    bodyClassName?: string;

    bodyOverlayOnly?: boolean;
    bodyOverlay?: () => ReactElement;

    hiddenColumns?: string[];

    onHeaderContextMenu?: (event: React.MouseEvent) => void;
    onBodyContextMenu?: (event: React.MouseEvent) => void;
    onDrop?: (event: React.DragEvent) => void;
    onDragOver?: (event: React.DragEvent) => void;

    renderRow?: (row: TableRow, columns: TableColumn[], uniqueId: string) => React.ReactElement<TableRowElement>;
}

export interface TableState {
    hiddenColumns: string[];
}

export interface TableRowProperties {
    columns: TableColumn[];
    rowData: TableRow;
}

export interface TableRowState {
    hidden?: boolean;
}

export class TableRowElement extends React.Component<TableRowProperties & React.HTMLProps<HTMLDivElement>, TableRowState> {
    constructor(props) {
        super(props);

        this.state = {};
    }

    render() {
        if(this.state.hidden)
            return null;

        let totalWidth = this.props.columns.map(e => e.width | 0).reduce((a, b) => a + b, 0);
        if(totalWidth === 0)
            totalWidth = 1;

        const properties = Object.assign({}, this.props) as any;
        delete properties.rowData;
        delete properties.columns;
        properties.className = (properties.className || "") + " " + cssStyle.row;

        const children = Array.isArray(this.props.children) ? this.props.children : typeof this.props.children !== "undefined" ? [this.props.children] : [];
        return React.createElement("div", properties, ...this.props.columns.map(column => {
            const supplier = this.props.rowData.columns[column.name];
            if(column.width) {
                return (
                    <div key={"tr-" + column.name}
                         className={cssStyle.dynamicColumn + " " + (column.className || "")}
                         style={{width: (column.width * 100 / totalWidth) + "%"}}>
                        {supplier ? supplier() : undefined}
                    </div>
                );
            } else if(column.fixedWidth) {
                return (
                    <div key={"th-" + column.name}
                         className={cssStyle.fixedColumn + " " + (column.className || "")}
                         style={{width: column.fixedWidth}}>
                        {supplier ? supplier() : undefined}
                    </div>
                );
            }
        }), ...children);
    }
}

export class Table extends React.Component<TableProperties, TableState> {
    private rowIndex = 0;

    private refHeader = React.createRef<HTMLDivElement>();
    private refHiddenHeader = React.createRef<HTMLDivElement>();
    private refBody = React.createRef<HTMLDivElement>();

    private lastHeaderHeight = 20;
    private lastScrollbarWidth = 20;

    constructor(props) {
        super(props);

        this.state = {
            hiddenColumns: this.props.hiddenColumns || []
        };
    }

    render() {
        const columns = this.props.columns.filter(e => this.state.hiddenColumns.findIndex(b => e.name === b) === -1);
        let totalWidth = columns.map(e => e.width | 0).reduce((a, b) => a + b, 0);
        if(totalWidth === 0)
            totalWidth = 1;

        const rowRenderer = this.props.renderRow || ((row, columns, uniqueId) => {
            return <TableRowElement key={uniqueId} rowData={row} columns={columns} />;
        });

        let body;
        if(this.props.bodyOverlayOnly) {
            body = this.props.bodyOverlay ? this.props.bodyOverlay() : undefined;
        } else {
            body = this.props.rows.map((row: TableRow & { __rowIndex: number }) => {
                if(typeof row.__rowIndex !== "number")
                    row.__rowIndex = ++this.rowIndex;

                return rowRenderer(row, columns, "tr-" + row.__rowIndex);
            });

            if(this.props.bodyOverlay)
                body.push(this.props.bodyOverlay());
        }

        return (
            <div
                className={cssStyle.container + " " + (this.props.className || " ")}
                onDrop={e => this.props.onDrop && this.props.onDrop(e)}
                onDragOver={e => this.props.onDragOver && this.props.onDragOver(e)}>
                <div
                    ref={this.refHeader}
                    className={cssStyle.header + " " + (this.props.headerClassName || " ")}
                    style={{right: this.lastScrollbarWidth}}
                    onContextMenu={event => this.props.onHeaderContextMenu && this.props.onHeaderContextMenu(event)}
                >
                    {columns.map(column => {
                        if(column.width) {
                            return (
                                <div key={"th-" + column.name}
                                     className={cssStyle.dynamicColumn + " " + (column.className || "")}
                                     style={{width: (column.width * 100 / totalWidth) + "%"}}
                                >
                                    {column.header()}
                                </div>
                            );
                        } else if(column.fixedWidth) {
                            return (
                                <div key={"th-" + column.name}
                                     className={cssStyle.fixedColumn + " " + (column.className || "")}
                                     style={{width: column.fixedWidth}}
                                >
                                    {column.header()}
                                </div>
                            );
                        }
                    })}
                </div>
                <div
                    className={cssStyle.body + " " + (this.props.bodyClassName || " ")}
                    ref={this.refBody}
                    onContextMenu={e => this.props.onBodyContextMenu && this.props.onBodyContextMenu(e)}
                >
                    <div ref={this.refHiddenHeader} style={{height: this.lastHeaderHeight}} className={cssStyle.row} />
                    {body}
                </div>
            </div>
        );
    }

    componentDidUpdate(prevProps: Readonly<TableProperties>, prevState: Readonly<TableState>, snapshot?: any): void {
        if(!this.refHiddenHeader.current || !this.refHeader.current || !this.refBody.current)
            return;

        setTimeout(() => {
            this.lastHeaderHeight = this.refHeader.current.clientHeight;
            this.lastScrollbarWidth = this.refBody.current.parentElement.clientWidth - this.refBody.current.clientWidth;

            this.refHiddenHeader.current.style.height = this.lastHeaderHeight + "px";
            this.refHeader.current.style.right = this.lastScrollbarWidth + "px";
        }, 10);
    }
}