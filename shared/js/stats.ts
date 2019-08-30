namespace stats {
    const LOG_PREFIX = "[Statistics] ";

    export enum CloseCodes {
        UNSET = 3000,
        RECONNECT = 3001,
        INTERNAL_ERROR = 3002,

        BANNED = 3100,
    }

    enum ConnectionState {
        CONNECTING,
        INITIALIZING,
        CONNECTED,
        UNSET
    }

    export class SessionConfig {
        /*
         * All collected statistics will only be cached by the stats server.
         * No data will be saved.
         */
        volatile_collection_only?: boolean;

        /*
         * Anonymize all IP addresses which will be provided while the stats collection.
         * This option is quite useless when volatile_collection_only is active.
         */
        anonymize_ip_addresses?: boolean;
    }

    export class Config extends SessionConfig {
        verbose?: boolean;

        reconnect_interval?: number;
    }

    export interface UserCountData {
        online_users: number;
        unique_online_users: number;
    }

    export type UserCountListener = (data: UserCountData) => any;

    let reconnect_timer: NodeJS.Timer;
    let current_config: Config;

    let last_user_count_update: number;
    let user_count_listener: UserCountListener[] = [];

    const DEFAULT_CONFIG: Config = {
        verbose: true,
        reconnect_interval: 5000,
        anonymize_ip_addresses: true,
        volatile_collection_only: false
    };

    function initialize_config_object(target_object: any, source_object: any) : any {
        for(const key of Object.keys(source_object)) {
            if(typeof(source_object[key]) === 'object')
                initialize_config_object(target_object[key] || (target_object[key] = {}), source_object[key]);

            if(typeof(target_object[key]) !== 'undefined')
                continue;

            target_object[key] = source_object[key];
        }

        return target_object;
    }

    export function initialize(config: Config) {
        current_config = initialize_config_object(config || {}, DEFAULT_CONFIG);
        if(current_config.verbose)
            log.info(LogCategory.STATISTICS, tr("Initializing statistics with this config: %o"), current_config);

        connection.start_connection();
    }

    export function register_user_count_listener(listener: UserCountListener) {
        user_count_listener.push(listener);
    }

    export function all_user_count_listener() : UserCountListener[] {
        return user_count_listener;
    }

    export function deregister_user_count_listener(listener: UserCountListener) {
        user_count_listener.remove(listener);
    }

    namespace connection {
        let connection: WebSocket;
        export let connection_state: ConnectionState = ConnectionState.UNSET;

        export function start_connection() {
            cancel_reconnect();
            close_connection();

            connection_state = ConnectionState.CONNECTING;

            connection = new WebSocket('wss://web-stats.teaspeak.de:27790');
            if(!connection)
                connection = new WebSocket('wss://localhost:27788');

            {
                const connection_copy = connection;
                connection.onclose = (event: CloseEvent) => {
                    if(connection_copy !== connection) return;

                    if(current_config.verbose)
                        log.warn(LogCategory.STATISTICS, tr("Lost connection to statistics server (Connection closed). Reason: %o. Event object: %o"), CloseCodes[event.code] || event.code, event);

                    if(event.code != CloseCodes.BANNED)
                        invoke_reconnect();
                };

                connection.onopen = () => {
                    if(connection_copy !== connection) return;

                    if(current_config.verbose)
                        log.info(LogCategory.STATISTICS, tr("Successfully connected to server. Initializing session."));

                    connection_state = ConnectionState.INITIALIZING;
                    initialize_session();
                };

                connection.onerror = (event: ErrorEvent) => {
                    if(connection_copy !== connection) return;

                    if(current_config.verbose)
                        log.warn(LogCategory.STATISTICS, tr("Received an error. Closing connection. Object: %o"), event);

                    connection.close(CloseCodes.INTERNAL_ERROR);
                    invoke_reconnect();
                };

                connection.onmessage = (event: MessageEvent) => {
                    if(connection_copy !== connection) return;

                    if(typeof(event.data) !== 'string') {
                        if(current_config.verbose)
                            log.info(LogCategory.STATISTICS, tr("Received an message which isn't a string. Event object: %o"), event);
                        return;
                    }

                    handle_message(event.data as string);
                };
            }
        }

        export function close_connection() {
            if(connection) {
                const connection_copy = connection;
                connection = undefined;

                try {
                    connection_copy.close(3001);
                } catch(_) {}
            }
        }

        function invoke_reconnect() {
            close_connection();

            if(reconnect_timer) {
                clearTimeout(reconnect_timer);
                reconnect_timer = undefined;
            }

            if(current_config.verbose)
                log.info(LogCategory.STATISTICS, tr("Scheduled reconnect in %dms"), current_config.reconnect_interval);

            reconnect_timer = setTimeout(() => {
                if(current_config.verbose)
                    log.info(LogCategory.STATISTICS, tr("Reconnecting"));
                start_connection();
            }, current_config.reconnect_interval);
        }

        export function cancel_reconnect() {
            if(reconnect_timer) {
                clearTimeout(reconnect_timer);
                reconnect_timer = undefined;
            }
        }

        function send_message(type: string, data: any) {
            connection.send(JSON.stringify({
                type: type,
                data: data
            }));
        }

        function initialize_session() {
            const config_object = {};
            for(const key in SessionConfig) {
                if(SessionConfig.hasOwnProperty(key))
                    config_object[key] = current_config[key];
            }

            send_message('initialize', {
                config: config_object
            })
        }

        function handle_message(message: string) {
            const data_object = JSON.parse(message);
            const type = data_object.type as string;
            const data = data_object.data;

            if(typeof(handler[type]) === 'function') {
                if(current_config.verbose)
                    log.debug(LogCategory.STATISTICS, tr("Handling message of type %s"), type);
                handler[type](data);
            } else if(current_config.verbose) {
                log.warn(LogCategory.STATISTICS, tr("Received message with an unknown type (%s). Dropping message. Full message: %o"), type, data_object);
            }
        }

        namespace handler {
            interface NotifyUserCount extends UserCountData { }

            function handle_notify_user_count(data: NotifyUserCount) {
                last_user_count_update = Date.now();
                for(const listener of [...user_count_listener])
                    listener(data);
            }

            interface NotifyInitialized {}
            function handle_notify_initialized(json: NotifyInitialized) {
                if(current_config.verbose)
                    log.info(LogCategory.STATISTICS, tr("Session successfully initialized."));

                connection_state = ConnectionState.CONNECTED;
            }

            handler["notifyinitialized"] = handle_notify_initialized;
            handler["notifyusercount"] = handle_notify_user_count;
        }
    }
}