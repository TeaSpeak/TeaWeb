/// <reference path="./ModalPermissionEdit.ts" /> /* first needs the AbstractPermissionEdit */

/* Canvas Permission Editor */
namespace pe {
    namespace ui {
        export namespace scheme {
            export interface CheckBox {
                border: string;
                checkmark: string;
                checkmark_font: string;

                background_checked: string;
                background_checked_hovered: string;

                background: string;
                background_hovered: string;
            }

            export interface TextField {
                color: string;
                font: string;

                background: string;
                background_hovered: string;
            }

            export interface ColorScheme {
                permission: {
                    background: string;
                    background_selected: string;

                    name: string;
                    name_unset: string;
                    name_font: string;

                    value: TextField;
                    value_b: CheckBox;
                    granted: TextField;
                    negate: CheckBox;
                    skip: CheckBox;
                }

                group: {
                    name: string;
                    name_font: string;
                }
            }
        }

        export enum RepaintMode {
            NONE,
            REPAINT,
            REPAINT_OBJECT_FULL,
            REPAINT_FULL
        }

        export interface AxisAlignedBoundingBox {
            x: number;
            y: number;

            width: number;
            height: number;
        }

        export enum ClickEventType {
            SIGNLE,
            DOUBLE,
            CONTEXT_MENU
        }

        export interface InteractionClickEvent {
            type: ClickEventType;
            consumed: boolean;
            offset_x: number;
            offset_y: number;
        }

        export interface InteractionListener {
            region: AxisAlignedBoundingBox;
            region_weight: number;

            /**
             * @return true if a redraw is required
             */
            on_mouse_enter?: () => RepaintMode;

            /**
             * @return true if a redraw is required
             */
            on_mouse_leave?: () => RepaintMode;

            /**
             * @return true if a redraw is required
             */
            on_click?: (event: InteractionClickEvent) => RepaintMode;

            mouse_cursor?: string;

            set_full_draw?: () => any;
            disabled?: boolean;
        }

        abstract class DrawableObject {
            abstract draw(context: CanvasRenderingContext2D, full: boolean);

            private _object_full_draw = false;
            private _width: number = 0;

            set_width(value: number) {
                this._width = value;
            }

            request_full_draw() {
                this._object_full_draw = true;
            }

            pop_full_draw() {
                const result = this._object_full_draw;
                this._object_full_draw = false;
                return result;
            }

            width() {
                return this._width;
            }

            abstract height();

            private _transforms: DOMMatrix[] = [];

            protected push_transform(context: CanvasRenderingContext2D) {
                this._transforms.push(context.getTransform());
            }

            protected pop_transform(context: CanvasRenderingContext2D) {
                const transform = this._transforms.pop();
                context.setTransform(
                    transform.a,
                    transform.b,
                    transform.c,
                    transform.d,
                    transform.e,
                    transform.f
                );
            }

            protected original_x(context: CanvasRenderingContext2D, x: number) {
                return context.getTransform().e + x;
            }

            protected original_y(context: CanvasRenderingContext2D, y: number) {
                return context.getTransform().f + y;
            }

            protected colors: scheme.ColorScheme = {} as any;

            set_color_scheme(scheme: scheme.ColorScheme) {
                this.colors = scheme;
            }

            protected manager: PermissionEditor;

            set_manager(manager: PermissionEditor) {
                this.manager = manager;
            }

            abstract initialize();

            abstract finalize();
        }

        class PermissionGroup extends DrawableObject {
            public static readonly HEIGHT = parseFloat(getComputedStyle(document.documentElement).fontSize) * (3 / 2); /* 24 */
            public static readonly ARROW_SIZE = 10; /* 12 */

            group: GroupedPermissions;
            _sub_elements: PermissionGroup[] = [];
            _element_permissions: PermissionList;

            collapsed = false;
            private _listener_colaps: InteractionListener;

            constructor(group: GroupedPermissions) {
                super();

                this.group = group;

                this._element_permissions = new PermissionList(this.group.permissions);
                for (const sub of this.group.children)
                    this._sub_elements.push(new PermissionGroup(sub));
            }

            draw(context: CanvasRenderingContext2D, full: boolean) {
                const _full = this.pop_full_draw() || full;
                this.push_transform(context);
                context.translate(PermissionGroup.ARROW_SIZE + 20, PermissionGroup.HEIGHT);

                let sum_height = 0;
                /* let first draw the elements, because if the sum height is zero then we could hide ourselves */
                if (!this.collapsed) { /* draw the next groups */
                    for (const group of this._sub_elements) {
                        group.draw(context, full);

                        const height = group.height();
                        sum_height += height;
                        context.translate(0, height);
                    }

                    this._element_permissions.draw(context, full);
                    if (sum_height == 0)
                        sum_height += this._element_permissions.height();
                } else {
                    const process_group = (group: PermissionGroup) => {
                        for (const g of group._sub_elements)
                            process_group(g);
                        group._element_permissions.handle_hide();
                        if (sum_height == 0 && group._element_permissions.height() > 0) {
                            sum_height = 1;
                        }
                    };
                    process_group(this);
                }
                this.pop_transform(context);

                if (_full && sum_height > 0) {
                    const arrow_stretch = 2 / 3;
                    if (!full) {
                        context.clearRect(0, 0, this.width(), PermissionGroup.HEIGHT);
                    }
                    context.fillStyle = this.colors.group.name;

                    /* arrow */
                    {
                        const x1 = this.collapsed ? PermissionGroup.ARROW_SIZE * arrow_stretch / 2 : 0;
                        const y1 = (PermissionGroup.HEIGHT - PermissionGroup.ARROW_SIZE) / 2 + (this.collapsed ? 0 : PermissionGroup.ARROW_SIZE * arrow_stretch / 2);  /* center arrow  */

                        const x2 = this.collapsed ? x1 + PermissionGroup.ARROW_SIZE * arrow_stretch : x1 + PermissionGroup.ARROW_SIZE / 2;
                        const y2 = this.collapsed ? y1 + PermissionGroup.ARROW_SIZE / 2 : y1 + PermissionGroup.ARROW_SIZE * arrow_stretch;

                        const x3 = this.collapsed ? x1 : x1 + PermissionGroup.ARROW_SIZE;
                        const y3 = this.collapsed ? y1 + PermissionGroup.ARROW_SIZE : y1;

                        context.beginPath();
                        context.moveTo(x1, y1);

                        context.lineTo(x2, y2);
                        context.lineTo(x3, y3);

                        context.moveTo(x2, y2);
                        context.lineTo(x3, y3);
                        context.fill();

                        this._listener_colaps.region.x = this.original_x(context, 0);
                        this._listener_colaps.region.y = this.original_y(context, y1);
                    }
                    /* text */
                    {
                        context.font = this.colors.group.name_font;
                        context.textBaseline = "middle";
                        context.textAlign = "start";

                        context.fillText(this.group.group.name, PermissionGroup.ARROW_SIZE + 5, PermissionGroup.HEIGHT / 2);
                    }
                }
            }

            set_width(value: number) {
                super.set_width(value);
                for (const element of this._sub_elements)
                    element.set_width(value - PermissionGroup.ARROW_SIZE - 20);
                this._element_permissions.set_width(value - PermissionGroup.ARROW_SIZE - 20);
            }

            set_color_scheme(scheme: scheme.ColorScheme) {
                super.set_color_scheme(scheme);
                for (const child of this._sub_elements)
                    child.set_color_scheme(scheme);
                this._element_permissions.set_color_scheme(scheme);
            }

            set_manager(manager: PermissionEditor) {
                super.set_manager(manager);
                for (const child of this._sub_elements)
                    child.set_manager(manager);
                this._element_permissions.set_manager(manager);
            }

            height() {
                let result = 0;

                if (!this.collapsed) {
                    for (const element of this._sub_elements)
                        result += element.height();

                    result += this._element_permissions.height();
                } else {
                    //We've to figure out if we have permissions
                    const process_group = (group: PermissionGroup) => {
                        if (result == 0 && group._element_permissions.height() > 0) {
                            result = 1;
                        } else {
                            for (const g of group._sub_elements)
                                process_group(g);
                        }
                    };
                    process_group(this);

                    if (result > 0)
                        return PermissionGroup.HEIGHT;

                    return 0;
                }
                if (result > 0) {
                    result += PermissionGroup.HEIGHT;
                    return result;
                } else {
                    return 0;
                }
            }

            initialize() {
                for (const child of this._sub_elements)
                    child.initialize();
                this._element_permissions.initialize();


                this._listener_colaps = {
                    region: {
                        x: 0,
                        y: 0,
                        height: PermissionGroup.ARROW_SIZE,
                        width: PermissionGroup.ARROW_SIZE
                    },
                    region_weight: 10,
                    /*
                    on_mouse_enter: () => {
                        this.collapsed_hovered = true;
                        return RepaintMode.REPAINT_OBJECT_FULL;
                    },
                    on_mouse_leave: () => {
                        this.collapsed_hovered = false;
                        return RepaintMode.REPAINT_OBJECT_FULL;
                    },
                    */
                    on_click: () => {
                        this.collapsed = !this.collapsed;
                        return RepaintMode.REPAINT_FULL;
                    },
                    set_full_draw: () => this.request_full_draw(),
                    mouse_cursor: "pointer"
                };

                this.manager.intercept_manager().register_listener(this._listener_colaps);
            }

            finalize() {
                for (const child of this._sub_elements)
                    child.finalize();
                this._element_permissions.finalize();
            }

            collapse_group() {
                for (const child of this._sub_elements)
                    child.collapse_group();

                this.collapsed = true;
            }

            expend_group() {
                for (const child of this._sub_elements)
                    child.expend_group();

                this.collapsed = false;
            }
        }

        class PermissionList extends DrawableObject {
            permissions: PermissionEntry[] = [];

            constructor(permissions: PermissionInfo[]) {
                super();

                for (const permission of permissions)
                    this.permissions.push(new PermissionEntry(permission));
            }

            set_width(value: number) {
                super.set_width(value);
                for (const entry of this.permissions)
                    entry.set_width(value);
            }


            draw(context: CanvasRenderingContext2D, full: boolean) {
                this.push_transform(context);

                for (const permission of this.permissions) {
                    permission.draw(context, full);
                    context.translate(0, permission.height());
                }

                this.pop_transform(context);
            }

            height() {
                let height = 0;
                for (const permission of this.permissions)
                    height += permission.height();
                return height;
            }


            set_color_scheme(scheme: scheme.ColorScheme) {
                super.set_color_scheme(scheme);
                for (const entry of this.permissions)
                    entry.set_color_scheme(scheme);
            }

            set_manager(manager: PermissionEditor) {
                super.set_manager(manager);

                for (const entry of this.permissions)
                    entry.set_manager(manager);
            }

            initialize() {
                for (const entry of this.permissions)
                    entry.initialize();
            }

            finalize() {
                for (const entry of this.permissions)
                    entry.finalize();
            }

            handle_hide() {
                for (const entry of this.permissions)
                    entry.handle_hide();
            }
        }

        class PermissionEntry extends DrawableObject {
            public static readonly HEIGHT = PermissionGroup.HEIGHT; /* 24 */
            public static readonly HALF_HEIGHT = PermissionEntry.HEIGHT / 2;
            public static readonly CHECKBOX_HEIGHT = PermissionEntry.HEIGHT - 2;

            public static readonly COLUMN_PADDING = 2;
            public static readonly COLUMN_VALUE = 75;
            public static readonly COLUMN_GRANTED = 75;
            //public static readonly COLUMN_NEGATE = 25;
            //public static readonly COLUMN_SKIP = 25;
            public static readonly COLUMN_NEGATE = 75;
            public static readonly COLUMN_SKIP = 75;

            private _permission: PermissionInfo;

            hidden: boolean;

            granted: number = 22;
            value: number;
            flag_skip: boolean = true;
            flag_negate: boolean;

            private _prev_selected = false;
            selected: boolean;

            flag_skip_hovered = false;
            flag_negate_hovered = false;
            flag_value_hovered = false;
            flag_grant_hovered = false;

            private _listener_checkbox_skip: InteractionListener;
            private _listener_checkbox_negate: InteractionListener;
            private _listener_value: InteractionListener;
            private _listener_grant: InteractionListener;
            private _listener_general: InteractionListener;
            private _icon_image: HTMLImageElement | undefined;

            on_icon_select?: (current_id: number) => Promise<number>;
            on_context_menu?: (x: number, y: number) => any;
            on_grant_change?: () => any;
            on_change?: () => any;

            constructor(permission: PermissionInfo) {
                super();
                this._permission = permission;
            }

            set_icon_id_image(image: HTMLImageElement | undefined) {
                if (this._icon_image === image)
                    return;
                this._icon_image = image;
                if (image) {
                    image.height = 16;
                    image.width = 16;
                }
            }

            permission() {
                return this._permission;
            }

            draw(ctx: CanvasRenderingContext2D, full: boolean) {
                if (!this.pop_full_draw() && !full) { /* Note: do not change this order! */
                    /* test for update! */
                    return;
                }
                if (this.hidden) {
                    this.handle_hide();
                    return;
                }
                ctx.lineWidth = 1;

                /* debug box */
                if (false) {
                    ctx.fillStyle = "#FF0000";
                    ctx.fillRect(0, 0, this.width(), PermissionEntry.HEIGHT);
                    ctx.fillStyle = "#000000";
                    ctx.strokeRect(0, 0, this.width(), PermissionEntry.HEIGHT);
                }

                if (!full) {
                    const off = this.selected || this._prev_selected ? ctx.getTransform().e : 0;
                    ctx.clearRect(-off, 0, this.width() + off, PermissionEntry.HEIGHT);
                }

                if (this.selected)
                    ctx.fillStyle = this.colors.permission.background_selected;
                else
                    ctx.fillStyle = this.colors.permission.background;
                const off = this.selected ? ctx.getTransform().e : 0;
                ctx.fillRect(-off, 0, this.width() + off, PermissionEntry.HEIGHT);
                this._prev_selected = this.selected;

                /* permission name */
                {
                    ctx.fillStyle = typeof (this.value) !== "undefined" ? this.colors.permission.name : this.colors.permission.name_unset;
                    ctx.textBaseline = "middle";
                    ctx.textAlign = "start";
                    ctx.font = this.colors.permission.name_font;

                    ctx.fillText(this._permission.name, 0, PermissionEntry.HALF_HEIGHT);
                }

                const original_y = this.original_y(ctx, 0);
                const original_x = this.original_x(ctx, 0);
                const width = this.width();

                /* draw granted */
                let w = width - PermissionEntry.COLUMN_GRANTED;
                if (typeof (this.granted) === "number") {
                    this._listener_grant.region.x = original_x + w;
                    this._listener_grant.region.y = original_y;

                    this._draw_number_field(ctx, this.colors.permission.granted, w, 0, PermissionEntry.COLUMN_VALUE, this.granted, this.flag_grant_hovered);
                } else {
                    this._listener_grant.region.y = original_y;
                    this._listener_grant.region.x =
                        original_x
                        + width
                        - PermissionEntry.COLUMN_GRANTED;
                }

                /* draw value and the skip stuff */
                if (typeof (this.value) === "number") {
                    w -= PermissionEntry.COLUMN_SKIP + PermissionEntry.COLUMN_PADDING;
                    {
                        const x = w + (PermissionEntry.COLUMN_SKIP - PermissionEntry.CHECKBOX_HEIGHT) / 2;
                        const y = 1;

                        this._listener_checkbox_skip.region.x = original_x + x;
                        this._listener_checkbox_skip.region.y = original_y + y;

                        this._draw_checkbox_field(ctx, this.colors.permission.skip, x, y, PermissionEntry.CHECKBOX_HEIGHT, this.flag_skip, this.flag_skip_hovered);
                    }

                    w -= PermissionEntry.COLUMN_NEGATE + PermissionEntry.COLUMN_PADDING;
                    {
                        const x = w + (PermissionEntry.COLUMN_NEGATE - PermissionEntry.CHECKBOX_HEIGHT) / 2;
                        const y = 1;

                        this._listener_checkbox_negate.region.x = original_x + x;
                        this._listener_checkbox_negate.region.y = original_y + y;

                        this._draw_checkbox_field(ctx, this.colors.permission.negate, x, y, PermissionEntry.CHECKBOX_HEIGHT, this.flag_negate, this.flag_negate_hovered);
                    }

                    w -= PermissionEntry.COLUMN_VALUE + PermissionEntry.COLUMN_PADDING;
                    if (this._permission.is_boolean()) {
                        const x = w + PermissionEntry.COLUMN_VALUE - PermissionEntry.CHECKBOX_HEIGHT;
                        const y = 1;

                        this._listener_value.region.width = PermissionEntry.CHECKBOX_HEIGHT;
                        this._listener_value.region.x = original_x + x;
                        this._listener_value.region.y = original_y + y;

                        this._draw_checkbox_field(ctx, this.colors.permission.value_b, x, y, PermissionEntry.CHECKBOX_HEIGHT, this.value > 0, this.flag_value_hovered);
                    } else if (this._permission.name === "i_icon_id" && this._icon_image) {
                        this._listener_value.region.x = original_x + w;
                        this._listener_value.region.y = original_y;
                        this._listener_value.region.width = PermissionEntry.CHECKBOX_HEIGHT;

                        this._draw_icon_field(ctx, this.colors.permission.value_b, w, 0, PermissionEntry.COLUMN_VALUE, this.flag_value_hovered, this._icon_image);
                    } else {
                        this._listener_value.region.width = PermissionEntry.COLUMN_VALUE;
                        this._listener_value.region.x = original_x + w;
                        this._listener_value.region.y = original_y;

                        this._draw_number_field(ctx, this.colors.permission.value, w, 0, PermissionEntry.COLUMN_VALUE, this.value, this.flag_value_hovered);
                    }
                    this._listener_value.disabled = false;
                } else {
                    this._listener_checkbox_skip.region.y = -1e8;
                    this._listener_checkbox_negate.region.y = -1e8;

                    this._listener_value.region.y = original_y;
                    this._listener_value.region.x =
                        original_x
                        + width
                        - PermissionEntry.COLUMN_GRANTED
                        - PermissionEntry.COLUMN_NEGATE
                        - PermissionEntry.COLUMN_VALUE
                        - PermissionEntry.COLUMN_PADDING * 4;
                    this._listener_value.disabled = true;
                }

                this._listener_general.region.y = original_y;
                this._listener_general.region.x = original_x;
            }

            handle_hide() {
                /* so the listener wound get triggered */
                this._listener_value.region.x = -1e8;
                this._listener_grant.region.x = -1e8;
                this._listener_checkbox_negate.region.x = -1e8;
                this._listener_checkbox_skip.region.x = -1e8;
                this._listener_general.region.x = -1e8;
            }

            private _draw_icon_field(ctx: CanvasRenderingContext2D, scheme: scheme.CheckBox, x: number, y: number, width: number, hovered: boolean, image: HTMLImageElement) {
                const line = ctx.lineWidth;
                ctx.lineWidth = 2;
                ctx.fillStyle = scheme.border;
                ctx.strokeRect(x + 1, y + 1, PermissionEntry.HEIGHT - 2, PermissionEntry.HEIGHT - 2);
                ctx.lineWidth = line;

                ctx.fillStyle = hovered ? scheme.background_hovered : scheme.background;
                ctx.fillRect(x + 1, y + 1, PermissionEntry.HEIGHT - 2, PermissionEntry.HEIGHT - 2);

                const center_y = y + PermissionEntry.HEIGHT / 2;
                const center_x = x + PermissionEntry.HEIGHT / 2;
                ctx.drawImage(image, center_x - image.width / 2, center_y - image.height / 2);
            }

            private _draw_number_field(ctx: CanvasRenderingContext2D, scheme: scheme.TextField, x: number, y: number, width: number, value: number, hovered: boolean) {
                ctx.fillStyle = hovered ? scheme.background_hovered : scheme.background;
                ctx.fillRect(x, y, width, PermissionEntry.HEIGHT);

                ctx.fillStyle = scheme.color;
                ctx.font = scheme.font; //Math.floor(2/3 * PermissionEntry.HEIGHT) + "px Arial";
                ctx.textAlign = "start";
                ctx.fillText(value + "", x, y + PermissionEntry.HALF_HEIGHT, width);

                ctx.strokeStyle = "#6e6e6e";
                const line = ctx.lineWidth;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(x, y + PermissionEntry.HEIGHT - 2);
                ctx.lineTo(x + width, y + PermissionEntry.HEIGHT - 2);
                ctx.stroke();
                ctx.lineWidth = line;
            }

            private _draw_checkbox_field(ctx: CanvasRenderingContext2D, scheme: scheme.CheckBox, x: number, y: number, height: number, checked: boolean, hovered: boolean) {
                ctx.fillStyle = scheme.border;
                ctx.strokeRect(x, y, height, height);


                ctx.fillStyle = checked ?
                    (hovered ? scheme.background_checked_hovered : scheme.background_checked) :
                    (hovered ? scheme.background_hovered : scheme.background);
                ctx.fillRect(x + 1, y + 1, height - 2, height - 2);

                if (checked) {
                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle";
                    ctx.fillStyle = scheme.checkmark;
                    ctx.font = scheme.checkmark_font; //Math.floor((5/4) * PermissionEntry.HEIGHT) + "px Arial";
                    ctx.fillText("✓", x + height / 2, y + height / 2);
                }
            }

            height() {
                return this.hidden ? 0 : PermissionEntry.HEIGHT;
            }

            set_width(value: number) {
                super.set_width(value);
                this._listener_general.region.width = value;
            }

            initialize() {
                this._listener_checkbox_skip = {
                    region: {
                        x: -1e8,
                        y: -1e8,
                        height: PermissionEntry.CHECKBOX_HEIGHT,
                        width: PermissionEntry.CHECKBOX_HEIGHT
                    },
                    region_weight: 10,
                    on_mouse_enter: () => {
                        this.flag_skip_hovered = true;
                        return RepaintMode.REPAINT_OBJECT_FULL;
                    },
                    on_mouse_leave: () => {
                        this.flag_skip_hovered = false;
                        return RepaintMode.REPAINT_OBJECT_FULL;
                    },
                    on_click: () => {
                        this.flag_skip = !this.flag_skip;
                        if (this.on_change)
                            this.on_change();
                        return RepaintMode.REPAINT_OBJECT_FULL;
                    },
                    set_full_draw: () => this.request_full_draw(),
                    mouse_cursor: "pointer"
                };
                this._listener_checkbox_negate = {
                    region: {
                        x: -1e8,
                        y: -1e8,
                        height: PermissionEntry.CHECKBOX_HEIGHT,
                        width: PermissionEntry.CHECKBOX_HEIGHT
                    },
                    region_weight: 10,
                    on_mouse_enter: () => {
                        this.flag_negate_hovered = true;
                        return RepaintMode.REPAINT_OBJECT_FULL;
                    },
                    on_mouse_leave: () => {
                        this.flag_negate_hovered = false;
                        return RepaintMode.REPAINT_OBJECT_FULL;
                    },
                    on_click: () => {
                        this.flag_negate = !this.flag_negate;
                        if (this.on_change)
                            this.on_change();
                        return RepaintMode.REPAINT_OBJECT_FULL;
                    },
                    set_full_draw: () => this.request_full_draw(),
                    mouse_cursor: "pointer"
                };
                this._listener_value = {
                    region: {
                        x: -1e8,
                        y: -1e8,
                        height: this._permission.is_boolean() ? PermissionEntry.CHECKBOX_HEIGHT : PermissionEntry.HEIGHT,
                        width: this._permission.is_boolean() ? PermissionEntry.CHECKBOX_HEIGHT : PermissionEntry.COLUMN_VALUE
                    },
                    region_weight: 10,
                    on_mouse_enter: () => {
                        this.flag_value_hovered = true;
                        return RepaintMode.REPAINT_OBJECT_FULL;
                    },
                    on_mouse_leave: () => {
                        this.flag_value_hovered = false;
                        return RepaintMode.REPAINT_OBJECT_FULL;
                    },
                    on_click: () => {
                        if (this._permission.is_boolean()) {
                            this.value = this.value > 0 ? 0 : 1;
                            if (this.on_change)
                                this.on_change();
                            return RepaintMode.REPAINT_OBJECT_FULL;
                        } else if (this._permission.name === "i_icon_id") {
                            this.on_icon_select(this.value).then(value => {
                                this.value = value;
                                if (this.on_change)
                                    this.on_change();
                            }).catch(error => {
                                console.warn(tr("Failed to select icon: %o"), error);
                            })
                        } else {
                            this._spawn_number_edit(
                                this._listener_value.region.x,
                                this._listener_value.region.y,
                                this._listener_value.region.width,
                                this._listener_value.region.height,
                                this.colors.permission.value,
                                this.value || 0,
                                value => {
                                    if (typeof (value) === "number") {
                                        this.value = value;
                                        this.request_full_draw();
                                        this.manager.request_draw(false);
                                        if (this.on_change)
                                            this.on_change();
                                    }
                                }
                            )
                        }
                        return RepaintMode.REPAINT_OBJECT_FULL;
                    },
                    set_full_draw: () => this.request_full_draw(),
                    mouse_cursor: "pointer"
                };
                this._listener_grant = {
                    region: {
                        x: -1e8,
                        y: -1e8,
                        height: PermissionEntry.HEIGHT,
                        width: PermissionEntry.COLUMN_VALUE
                    },
                    region_weight: 10,
                    on_mouse_enter: () => {
                        this.flag_grant_hovered = true;
                        return RepaintMode.REPAINT_OBJECT_FULL;
                    },
                    on_mouse_leave: () => {
                        this.flag_grant_hovered = false;
                        return RepaintMode.REPAINT_OBJECT_FULL;
                    },
                    on_click: () => {
                        this._spawn_number_edit(
                            this._listener_grant.region.x,
                            this._listener_grant.region.y,
                            this._listener_grant.region.width,
                            this._listener_grant.region.height,
                            this.colors.permission.granted,
                            this.granted || 0, //TODO use max assignable value?
                            value => {
                                if (typeof (value) === "number") {
                                    this.granted = value;
                                    this.request_full_draw();
                                    this.manager.request_draw(false);

                                    if (this.on_grant_change)
                                        this.on_grant_change();
                                }
                            }
                        );
                        return RepaintMode.REPAINT_OBJECT_FULL;
                    },
                    set_full_draw: () => this.request_full_draw(),
                    mouse_cursor: "pointer"
                };

                this._listener_general = {
                    region: {
                        x: -1e8,
                        y: -1e8,
                        height: PermissionEntry.HEIGHT,
                        width: 0
                    },
                    region_weight: 0,
                    /*
                    on_mouse_enter: () => {
                        return RepaintMode.REPAINT_OBJECT_FULL;
                    },
                    on_mouse_leave: () => {
                        return RepaintMode.REPAINT_OBJECT_FULL;
                    },
                    */
                    on_click: (event: InteractionClickEvent) => {
                        this.manager.set_selected_entry(this);

                        if (event.type == ClickEventType.DOUBLE && typeof (this.value) === "undefined")
                            return this._listener_value.on_click(event);
                        else if (event.type == ClickEventType.CONTEXT_MENU) {
                            const mouse = this.manager.mouse;
                            if (this.on_context_menu) {
                                this.on_context_menu(mouse.x, mouse.y);
                                event.consumed = true;
                            }
                        }
                        return RepaintMode.NONE;
                    },
                    set_full_draw: () => this.request_full_draw(),
                };

                this.manager.intercept_manager().register_listener(this._listener_checkbox_negate);
                this.manager.intercept_manager().register_listener(this._listener_checkbox_skip);
                this.manager.intercept_manager().register_listener(this._listener_value);
                this.manager.intercept_manager().register_listener(this._listener_grant);
                this.manager.intercept_manager().register_listener(this._listener_general);
            }

            finalize() {
            }

            private _spawn_number_edit(x: number, y: number, width: number, height: number, color: scheme.TextField, value: number, callback: (new_value?: number) => any) {
                const element = $.spawn("div");
                element.prop("contentEditable", true);
                element
                    .css("pointer-events", "none")
                    .css("background", color.background)
                    .css("display", "block")
                    .css("position", "absolute")
                    .css("top", y)
                    .css("left", x)
                    .css("width", width)
                    .css("height", height)
                    .css("z-index", 1e6);
                element.text(value);
                element.appendTo(this.manager.canvas_container);
                element.focus();

                element.on('focusout', event => {
                    console.log("permission changed to " + element.text());
                    if (!isNaN(parseInt(element.text()))) {
                        callback(parseInt(element.text()));
                    } else {
                        callback(undefined);
                    }
                    element.remove();
                });

                element.on('keypress', event => {
                    if (event.which == KeyCode.KEY_RETURN)
                        element.trigger('focusout');

                    const text = String.fromCharCode(event.which);
                    if (isNaN(parseInt(text)) && text != "-")
                        event.preventDefault();

                    if (element.text().length > 7)
                        event.preventDefault();
                });

                if (window.getSelection) {
                    const selection = window.getSelection();
                    const range = document.createRange();
                    range.selectNodeContents(element[0]);
                    selection.removeAllRanges();
                    selection.addRange(range);
                }
            }

            trigger_value_assign() {
                this._listener_value.on_click(undefined);
            }

            trigger_grant_assign() {
                this._listener_grant.on_click(undefined);
            }
        }

        export class InteractionManager {
            private _listeners: InteractionListener[] = [];
            private _entered_listeners: InteractionListener[] = [];

            register_listener(listener: InteractionListener) {
                this._listeners.push(listener);
            }

            remove_listener(listener: InteractionListener) {
                this._listeners.remove(listener);
            }

            process_mouse_move(new_x: number, new_y: number): { repaint: RepaintMode, cursor: string } {
                let _entered_listeners: InteractionListener[] = [];
                for (const listener of this._listeners) {
                    const aabb = listener.region;

                    if (listener.disabled)
                        continue;

                    if (new_x < aabb.x || new_x > aabb.x + aabb.width)
                        continue;

                    if (new_y < aabb.y || new_y > aabb.y + aabb.height)
                        continue;

                    _entered_listeners.push(listener);
                }

                let repaint: RepaintMode = RepaintMode.NONE;
                _entered_listeners.sort((a, b) => (a.region_weight || 0) - (b.region_weight || 0));
                for (const listener of this._entered_listeners) {
                    if (listener.on_mouse_leave && _entered_listeners.indexOf(listener) == -1) {
                        let mode = listener.on_mouse_leave();
                        if (mode == RepaintMode.REPAINT_OBJECT_FULL) {
                            mode = RepaintMode.REPAINT;
                            if (listener.set_full_draw)
                                listener.set_full_draw();
                        }
                        if (mode > repaint)
                            repaint = mode;
                    }
                }
                for (const listener of _entered_listeners) {
                    if (listener.on_mouse_enter && this._entered_listeners.indexOf(listener) == -1) {
                        let mode = listener.on_mouse_enter();
                        if (mode == RepaintMode.REPAINT_OBJECT_FULL) {
                            mode = RepaintMode.REPAINT;
                            if (listener.set_full_draw)
                                listener.set_full_draw();
                        }
                        if (mode > repaint)
                            repaint = mode;
                    }
                }
                this._entered_listeners = _entered_listeners;

                let cursor;
                for (const listener of _entered_listeners)
                    if (typeof (listener.mouse_cursor) === "string") {
                        cursor = listener.mouse_cursor;
                    }
                return {
                    repaint: repaint,
                    cursor: cursor
                };
            }

            private process_click_event(x: number, y: number, event: InteractionClickEvent): RepaintMode {
                const move_result = this.process_mouse_move(x, y);

                let repaint: RepaintMode = move_result.repaint;
                for (const listener of this._entered_listeners)
                    if (listener.on_click) {
                        let mode = listener.on_click(event);
                        if (mode == RepaintMode.REPAINT_OBJECT_FULL) {
                            mode = RepaintMode.REPAINT;
                            if (listener.set_full_draw)
                                listener.set_full_draw();
                        }
                        if (mode > repaint)
                            repaint = mode;
                    }

                return repaint;
            }

            process_click(x: number, y: number): RepaintMode {
                const event: InteractionClickEvent = {
                    consumed: false,
                    type: ClickEventType.SIGNLE,
                    offset_x: x,
                    offset_y: y
                };

                return this.process_click_event(x, y, event);
            }

            process_dblclick(x: number, y: number): RepaintMode {
                const event: InteractionClickEvent = {
                    consumed: false,
                    type: ClickEventType.DOUBLE,
                    offset_x: x,
                    offset_y: y
                };

                return this.process_click_event(x, y, event);
            }

            process_context_menu(js_event: MouseEvent, x: number, y: number): RepaintMode {
                const event: InteractionClickEvent = {
                    consumed: js_event.defaultPrevented,
                    type: ClickEventType.CONTEXT_MENU,
                    offset_x: x,
                    offset_y: y
                };

                const result = this.process_click_event(x, y, event);
                if (event.consumed)
                    js_event.preventDefault();
                return result;
            }
        }

        export class PermissionEditor {
            private static readonly PERMISSION_HEIGHT = PermissionEntry.HEIGHT;
            private static readonly PERMISSION_GROUP_HEIGHT = PermissionGroup.HEIGHT;

            readonly grouped_permissions: GroupedPermissions[];
            readonly canvas: HTMLCanvasElement;
            readonly canvas_container: HTMLDivElement;
            private _max_height: number = 0;

            private _permission_count: number = 0;
            private _permission_group_count: number = 0;
            private _canvas_context: CanvasRenderingContext2D;

            private _selected_entry: PermissionEntry;

            private _draw_requested: boolean = false;
            private _draw_requested_full: boolean = false;

            private _elements: PermissionGroup[] = [];
            private _intersect_manager: InteractionManager;

            private _permission_entry_map: { [key: number]: PermissionEntry } = {};

            mouse: {
                x: number,
                y: number
            } = {
                x: 0,
                y: 0
            };

            constructor(permissions: GroupedPermissions[]) {
                this.grouped_permissions = permissions;

                this.canvas_container = $.spawn("div")
                    .addClass("window-resize-listener") /* we want to handle resized */
                    .css("min-width", "750px")
                    .css("position", "relative")
                    .css("user-select", "none")
                    [0];
                this.canvas = $.spawn("canvas")[0];

                this.canvas_container.appendChild(this.canvas);

                this._intersect_manager = new InteractionManager();
                this.canvas_container.onmousemove = event => {
                    this.mouse.x = event.pageX;
                    this.mouse.y = event.pageY;

                    const draw = this._intersect_manager.process_mouse_move(event.offsetX, event.offsetY);
                    this.canvas_container.style.cursor = draw.cursor || "";
                    this._handle_repaint(draw.repaint);
                };
                this.canvas_container.onclick = event => {
                    this._handle_repaint(this._intersect_manager.process_click(event.offsetX, event.offsetY));
                };
                this.canvas_container.ondblclick = event => {
                    this._handle_repaint(this._intersect_manager.process_dblclick(event.offsetX, event.offsetY));
                };
                this.canvas_container.oncontextmenu = (event: MouseEvent) => {
                    this._handle_repaint(this._intersect_manager.process_context_menu(event, event.offsetX, event.offsetY));
                };
                this.canvas_container.onresize = () => this.request_draw(true);


                this.initialize();
            }

            private _handle_repaint(mode: RepaintMode) {
                if (mode == RepaintMode.REPAINT || mode == RepaintMode.REPAINT_FULL)
                    this.request_draw(mode == RepaintMode.REPAINT_FULL);
            }

            request_draw(full?: boolean) {
                this._draw_requested_full = this._draw_requested_full || full;
                if (this._draw_requested)
                    return;
                this._draw_requested = true;
                requestAnimationFrame(() => {
                    this.draw(this._draw_requested_full);
                });
            }

            draw(full?: boolean) {
                this._draw_requested = false;
                this._draw_requested_full = false;

                /* clear max height */
                this.canvas_container.style.overflowY = "shown";
                this.canvas_container.style.height = undefined;

                const max_height = this._max_height;
                const max_width = this.canvas_container.clientWidth;
                const update_width = this.canvas.width != max_width;
                const full_draw = typeof (full) !== "boolean" || full || update_width;

                if (update_width) {
                    this.canvas.width = max_width;
                    for (const element of this._elements)
                        element.set_width(max_width);
                }

                console.log("Drawing%s on %dx%d", full_draw ? " full" : "", max_width, max_height);
                if (full_draw)
                    this.canvas.height = max_height;
                const ctx = this._canvas_context;
                ctx.resetTransform();
                if (full_draw)
                    ctx.clearRect(0, 0, max_width, max_height);

                let sum_height = 0;
                for (const element of this._elements) {
                    element.draw(ctx, full_draw);
                    const height = element.height();
                    sum_height += height;
                    ctx.translate(0, height);
                }

                this.canvas_container.style.overflowY = "hidden";
                this.canvas_container.style.height = sum_height + "px";
            }

            private initialize() {
                /* setup the canvas */
                {
                    const apply_group = (group: GroupedPermissions) => {
                        for (const g of group.children || [])
                            apply_group(g);
                        this._permission_group_count++;
                        this._permission_count += group.permissions.length;
                    };
                    for (const group of this.grouped_permissions)
                        apply_group(group);

                    this._max_height = this._permission_count * PermissionEditor.PERMISSION_HEIGHT + this._permission_group_count * PermissionEditor.PERMISSION_GROUP_HEIGHT;
                    console.log("%d permissions and %d groups required %d height", this._permission_count, this._permission_group_count, this._max_height);

                    this.canvas.style.width = "100%";

                    this.canvas.style.flexShrink = "0";
                    this.canvas_container.style.flexShrink = "0";

                    this._canvas_context = this.canvas.getContext("2d");
                }

                const font = Math.floor(2 / 3 * PermissionEntry.HEIGHT) + "px Arial";
                const font_checkmark = Math.floor((5 / 4) * PermissionEntry.HEIGHT) + "px Arial";
                const checkbox = {
                    background: "#303036",
                    background_hovered: "#CCCCCC",

                    background_checked: "#0000AA",
                    background_checked_hovered: "#0000AA77",

                    border: "#000000",
                    checkmark: "#303036",
                    checkmark_font: font_checkmark
                };
                const input: scheme.TextField = {
                    color: "#000000",
                    font: font,

                    background_hovered: "#CCCCCCCC",
                    background: "#30303600"
                };

                const color_scheme: scheme.ColorScheme = {
                    group: {
                        name: "#808080",
                        name_font: font
                    },
                    //#28282c
                    permission: {
                        name: "#808080",
                        name_unset: "#1a1a1a",
                        name_font: font,

                        background: "#303036",
                        background_selected: "#00007788",

                        value: input,
                        value_b: checkbox,
                        granted: input,
                        negate: checkbox,
                        skip: checkbox
                    }
                };
                (window as any).scheme = color_scheme;
                /* setup elements to draw */
                {
                    const process_group = (group: PermissionGroup) => {
                        for (const permission of group._element_permissions.permissions)
                            this._permission_entry_map[permission.permission().id] = permission;
                        for (const g of group._sub_elements)
                            process_group(g);
                    };

                    for (const group of this.grouped_permissions) {
                        const element = new PermissionGroup(group);
                        element.set_color_scheme(color_scheme);
                        element.set_manager(this);
                        process_group(element);
                        this._elements.push(element);
                    }
                    for (const element of this._elements) {
                        element.initialize();
                    }
                }
            }

            intercept_manager() {
                return this._intersect_manager;
            }

            set_selected_entry(entry?: PermissionEntry) {
                if (this._selected_entry === entry)
                    return;

                if (this._selected_entry) {
                    this._selected_entry.selected = false;
                    this._selected_entry.request_full_draw();
                }
                this._selected_entry = entry;
                if (this._selected_entry) {
                    this._selected_entry.selected = true;
                    this._selected_entry.request_full_draw();
                }
                this.request_draw(false);
            }

            permission_entries(): PermissionEntry[] {
                return Object.keys(this._permission_entry_map).map(e => this._permission_entry_map[e]);
            }

            collapse_all() {
                for (const group of this._elements)
                    group.collapse_group();
                this.request_draw(true);
            }

            expend_all() {
                for (const group of this._elements)
                    group.expend_group();
                this.request_draw(true);
            }
        }
    }

    export class CanvasPermissionEditor extends Modals.AbstractPermissionEditor {
        private container: JQuery;

        private mode_container_permissions: JQuery;
        private mode_container_error_permission: JQuery;
        private mode_container_unset: JQuery;

        /* references within the container tag */
        private permission_value_map: {[key:number]:PermissionValue} = {};

        private entry_editor: ui.PermissionEditor;

        icon_resolver: (id: number) => Promise<HTMLImageElement>;
        icon_selector: (current_id: number) => Promise<number>;

        constructor() {
            super();
        }

        initialize(permissions: GroupedPermissions[]) {
            this._permissions = permissions;
            this.entry_editor = new ui.PermissionEditor(permissions);
            this.build_tag();
        }

        html_tag() { return this.container; }

        private build_tag() {
            this.container = $("#tmpl_permission_editor_canvas").renderTag();
            /* search for that as long we've not that much nodes */
            this.mode_container_permissions = this.container.find(".container-mode-permissions");
            this.mode_container_error_permission = this.container.find(".container-mode-no-permissions");
            this.mode_container_unset = this.container.find(".container-mode-unset");
            this.set_mode(Modals.PermissionEditorMode.UNSET);

            /* the filter */
            {
                const tag_filter_input = this.container.find(".filter-input");
                const tag_filter_granted = this.container.find(".filter-granted");

                tag_filter_granted.on('change', event => tag_filter_input.trigger('change'));
                tag_filter_input.on('keyup change', event => {
                    let filter_mask = tag_filter_input.val() as string;
                    let req_granted = tag_filter_granted.prop("checked");


                    for(const entry of this.entry_editor.permission_entries()) {
                        const permission = entry.permission();

                        let shown = filter_mask.length == 0 || permission.name.indexOf(filter_mask) != -1;
                        if(shown && req_granted) {
                            const value: PermissionValue = this.permission_value_map[permission.id];
                            shown = value && (value.hasValue() || value.hasGrant());
                        }

                        entry.hidden = !shown;
                    }
                    this.entry_editor.request_draw(true);
                });
            }

            /* update button */
            {
                this.container.find(".button-update").on('click', this.trigger_update.bind(this));
            }

            /* global context menu listener */
            {
                this.container.on('contextmenu', event => {
                    if(event.isDefaultPrevented()) return;
                    event.preventDefault();

                    /* TODO allow collapse and expend all */
                });
            }

            {
                const tag_container = this.container.find(".entry-editor-container");
                tag_container.append(this.entry_editor.canvas_container);

                tag_container.parent().on('contextmenu', event => {
                    if(event.isDefaultPrevented()) return;
                    event.preventDefault();

                    contextmenu.spawn_context_menu(event.pageX, event.pageY, {
                        type: contextmenu.MenuEntryType.ENTRY,
                        name: tr("Expend all"),
                        callback: () => this.entry_editor.expend_all()
                    }, {
                        type: contextmenu.MenuEntryType.ENTRY,
                        name: tr("Collapse all"),
                        callback: () => this.entry_editor.collapse_all()
                    });
                });
            }

            /* setup the permissions */
            for(const entry of this.entry_editor.permission_entries()) {
                const permission = entry.permission();
                entry.on_change = () => {
                    const flag_remove = typeof(entry.value) !== "number";
                    this._listener_change(permission, {
                        remove: flag_remove,
                        flag_negate: entry.flag_negate,
                        flag_skip: entry.flag_skip,
                        value: flag_remove ? -2 : entry.value
                    }).then(() => {
                        if(flag_remove) {
                            const element = this.permission_value_map[permission.id];
                            if(!element) return; /* This should never happen, if so how are we displaying this permission?! */

                            element.value = undefined;
                            element.flag_negate = false;
                            element.flag_skip = false;
                        } else {
                            const element = this.permission_value_map[permission.id] || (this.permission_value_map[permission.id] = new PermissionValue(permission));

                            element.value = entry.value;
                            element.flag_skip = entry.flag_skip;
                            element.flag_negate = entry.flag_negate;
                        }

                        if(permission.name === "i_icon_id") {
                            this.icon_resolver(entry.value).then(e => {
                                entry.set_icon_id_image(e);
                                entry.request_full_draw();
                                this.entry_editor.request_draw(false);
                            }).catch(error => {
                                console.warn(tr("Failed to load icon for permission editor: %o"), error);
                            });
                        }
                        entry.request_full_draw();
                        this.entry_editor.request_draw(false);
                    }).catch(() => {
                        const element = this.permission_value_map[permission.id];

                        entry.value = element && element.hasValue() ? element.value : undefined;
                        entry.flag_skip = element && element.flag_skip;
                        entry.flag_negate = element && element.flag_negate;

                        entry.request_full_draw();
                        this.entry_editor.request_draw(false);
                    });
                };

                entry.on_grant_change = () => {
                    const flag_remove = typeof(entry.granted) !== "number";

                    this._listener_change(permission, {
                        remove: flag_remove,
                        granted: flag_remove ? -2 : entry.granted,
                    }).then(() => {
                        if(flag_remove) {
                            const element = this.permission_value_map[permission.id];
                            if (!element) return; /* This should never happen, if so how are we displaying this permission?! */

                            element.granted_value = undefined;
                        } else {
                            const element = this.permission_value_map[permission.id] || (this.permission_value_map[permission.id] = new PermissionValue(permission));
                            element.granted_value = entry.granted;
                        }
                        entry.request_full_draw();
                        this.entry_editor.request_draw(false);
                    }).catch(() => {
                        const element = this.permission_value_map[permission.id];

                        entry.granted = element && element.hasGrant() ? element.granted_value : undefined;
                        entry.request_full_draw();
                        this.entry_editor.request_draw(false);
                    });
                };

                entry.on_context_menu = (x, y) => {
                    let entries: contextmenu.MenuEntry[] = [];
                    if(typeof(entry.value) === "undefined") {
                        entries.push({
                            type: contextmenu.MenuEntryType.ENTRY,
                            name: tr("Add permission"),
                            callback: () => entry.trigger_value_assign()
                        });
                    } else {
                        entries.push({
                            type: contextmenu.MenuEntryType.ENTRY,
                            name: tr("Remove permission"),
                            callback: () => {
                                entry.value = undefined;
                                entry.on_change();
                            }
                        });
                    }

                    if(typeof(entry.granted) === "undefined") {
                        entries.push({
                            type: contextmenu.MenuEntryType.ENTRY,
                            name: tr("Add grant permission"),
                            callback: () => entry.trigger_grant_assign()
                        });
                    } else {
                        entries.push({
                            type: contextmenu.MenuEntryType.ENTRY,
                            name: tr("Remove grant permission"),
                            callback: () => {
                                entry.granted = undefined;
                                entry.on_grant_change();
                            }
                        });
                    }
                    entries.push(contextmenu.Entry.HR());
                    entries.push({
                        type: contextmenu.MenuEntryType.ENTRY,
                        name: tr("Expend all"),
                        callback: () => this.entry_editor.expend_all()
                    });
                    entries.push({
                        type: contextmenu.MenuEntryType.ENTRY,
                        name: tr("Collapse all"),
                        callback: () => this.entry_editor.collapse_all()
                    });
                    entries.push(contextmenu.Entry.HR());
                    entries.push({
                        type: contextmenu.MenuEntryType.ENTRY,
                        name: tr("Show permission description"),
                        callback: () => {
                            createInfoModal(
                                tr("Permission description"),
                                tr("Permission description for permission ") + permission.name + ": <br>" + permission.description
                            ).open();
                        }
                    });
                    entries.push({
                        type: contextmenu.MenuEntryType.ENTRY,
                        name: tr("Copy permission name"),
                        callback: () => {
                            copy_to_clipboard(permission.name);
                        }
                    });

                    contextmenu.spawn_context_menu(x, y, ...entries);
                }
            }
        }

        set_permissions(permissions?: PermissionValue[]) {
            permissions = permissions || [];
            this.permission_value_map = {};

            for(const permission of permissions)
                this.permission_value_map[permission.type.id] = permission;

            for(const entry of this.entry_editor.permission_entries()) {
                const permission = entry.permission();
                const value: PermissionValue = this.permission_value_map[permission.id];

                if(permission.name === "i_icon_id") {
                    entry.set_icon_id_image(undefined);
                    entry.on_icon_select = this.icon_selector;
                }

                if(value && value.hasValue()) {
                    entry.value = value.value;
                    entry.flag_skip = value.flag_skip;
                    entry.flag_negate = value.flag_negate;
                    if(permission.name === "i_icon_id") {
                        this.icon_resolver(value.value).then(e => {
                            entry.set_icon_id_image(e);
                            entry.request_full_draw();
                            this.entry_editor.request_draw(false);
                        }).catch(error => {
                            console.warn(tr("Failed to load icon for permission editor: %o"), error);
                        });
                    }
                } else {
                    entry.value = undefined;
                    entry.flag_skip = false;
                    entry.flag_negate = false;
                }

                if(value && value.hasGrant()) {
                    entry.granted = value.granted_value;
                } else {
                    entry.granted = undefined;
                }
            }
            this.entry_editor.request_draw(true);
        }

        set_mode(mode: Modals.PermissionEditorMode) {
            this.mode_container_permissions.css('display', mode == Modals.PermissionEditorMode.VISIBLE ? 'flex' : 'none');
            this.mode_container_error_permission.css('display', mode == Modals.PermissionEditorMode.NO_PERMISSION ? 'flex' : 'none');
            this.mode_container_unset.css('display', mode == Modals.PermissionEditorMode.UNSET ? 'block' : 'none');
            if(mode == Modals.PermissionEditorMode.VISIBLE)
                this.entry_editor.draw(true);
        }

        update_ui() {
            this.entry_editor.draw(true);
        }

        set_toggle_button(callback: () => string, initial: string) {
            throw "not implemented";
        }
    }
}