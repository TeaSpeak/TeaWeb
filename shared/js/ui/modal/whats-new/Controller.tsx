import {spawnReactModal} from "tc-shared/ui/react-elements/modal";
import * as React from "react";
import {WhatsNew} from "tc-shared/ui/modal/whats-new/Renderer";
import {Translatable} from "tc-shared/ui/react-elements/i18n";
import {ChangeLog} from "tc-shared/update/ChangeLog";
import {InternalModal} from "tc-shared/ui/react-elements/modal/Definitions";

export function spawnUpdatedModal(changes: { changesUI?: ChangeLog, changesClient?: ChangeLog }) {
    const modal = spawnReactModal(class extends InternalModal {
        constructor() {
            super();
        }

        renderBody(): React.ReactElement {
            return <WhatsNew changesUI={changes.changesUI} changesClient={changes.changesClient}/>;
        }

        renderTitle(): string | React.ReactElement<Translatable> {
            return <Translatable>We've updated the client for you</Translatable>;
        }
    });

    modal.show();
}