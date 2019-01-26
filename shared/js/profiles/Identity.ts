namespace profiles.identities {
    export enum IdentitifyType {
        TEAFORO,
        TEAMSPEAK,
        NICKNAME
    }

    export interface Identity {
        name() : string;
        uid() : string;
        type() : IdentitifyType;

        valid() : boolean;

        encode?() : string;
        decode(data: string) : Promise<void>;

        spawn_identity_handshake_handler(connection: ServerConnection) : HandshakeIdentityHandler;
    }

    export async function decode_identity(type: IdentitifyType, data: string) : Promise<Identity> {
        let identity: Identity;
        switch (type) {
            case IdentitifyType.NICKNAME:
                identity = new NameIdentity();
                break;
            case IdentitifyType.TEAFORO:
                identity = new TeaForumIdentity(undefined, undefined);
                break;
            case IdentitifyType.TEAMSPEAK:
                identity = new TeaSpeakIdentity(undefined, undefined);
                break;
        }
        if(!identity)
            return undefined;

        try {
            await identity.decode(data)
        } catch(error) {
            /* todo better error handling! */
            console.error(error);
            return undefined;
        }

        return identity;
    }

    export function create_identity(type: IdentitifyType) {
        let identity: Identity;
        switch (type) {
            case IdentitifyType.NICKNAME:
                identity = new NameIdentity();
                break;
            case IdentitifyType.TEAFORO:
                identity = new TeaForumIdentity(undefined, undefined);
                break;
            case IdentitifyType.TEAMSPEAK:
                identity = new TeaSpeakIdentity(undefined, undefined);
                break;
        }
        return identity;
    }

    export abstract class AbstractHandshakeIdentityHandler implements HandshakeIdentityHandler {
        connection: ServerConnection;

        protected callbacks: ((success: boolean, message?: string) => any)[] = [];

        protected constructor(connection: ServerConnection) {
            this.connection = connection;
        }

        register_callback(callback: (success: boolean, message?: string) => any) {
            this.callbacks.push(callback);
        }

        abstract start_handshake();

        protected trigger_success() {
            for(const callback of this.callbacks)
                callback(true);
        }

        protected trigger_fail(message: string) {
            for(const callback of this.callbacks)
                callback(false, message);
        }
    }
}