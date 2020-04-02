import {ConnectionHandler} from "tc-shared/ConnectionHandler";
import {AbstractServerConnection} from "tc-shared/connection/ConnectionBase";

export function spawn_server_connection(handle: ConnectionHandler) : AbstractServerConnection;
export function destroy_server_connection(handle: AbstractServerConnection);