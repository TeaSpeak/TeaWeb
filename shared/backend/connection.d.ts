declare namespace connection {
    export function spawn_server_connection(handle: ConnectionHandler) : AbstractServerConnection;
    export function destroy_server_connection(handle: AbstractServerConnection);
}