#!/usr/bin/env bash

cd $(dirname $0)
#find css/static/ -name '*.css' -exec cat {} \; | npm run csso -- --output `pwd`/generated/static/base.css

#File order
files=(
    "css/static/main-layout.css"
    "css/static/helptag.css"
    "css/static/scroll.css"
    "css/static/channel-tree.css"
    "css/static/ts/tab.css"
    "css/static/ts/chat.css"
    "css/static/ts/icons.css"
    "css/static/ts/icons_em.css"
    "css/static/ts/country.css"
    "css/static/general.css"
    "css/static/modal.css"
    "css/static/modals.css"
    "css/static/modal-about.css"
    "css/static/modal-avatar.css"
    "css/static/modal-icons.css"
    "css/static/modal-bookmarks.css"
    "css/static/modal-connect.css"
    "css/static/modal-channel.css"
    "css/static/modal-query.css"
    "css/static/modal-invite.css"
    "css/static/modal-playlist.css"
    "css/static/modal-banlist.css"
    "css/static/modal-bancreate.css"
    "css/static/modal-clientinfo.css"
    "css/static/modal-serverinfo.css"
    "css/static/modal-identity.css"
    "css/static/modal-settings.css"
    "css/static/modal-poke.css"
    "css/static/modal-server.css"
    "css/static/modal-keyselect.css"
    "css/static/modal-permissions.css"
    "css/static/modal-group-assignment.css"
    "css/static/music/info_plate.css"
    "css/static/frame/SelectInfo.css"
    "css/static/control_bar.css"
    "css/static/context_menu.css"
    "css/static/frame-chat.css"
    "css/static/connection_handlers.css"
    "css/static/server-log.css"
    "css/static/htmltags.css"
    "css/static/hostbanner.css"
    "css/static/menu-bar.css"
)

target_file=`pwd`/../generated/static/base.css

if [[ ! -d $(dirname ${target_file}) ]]; then
    echo "Creating target path ($(dirname ${target_file}))"
    mkdir -p $(dirname ${target_file})
    if [[ $? -ne 0 ]]; then
        echo "Failed to create target path!"
        exit 1
    fi
fi

echo "/* Auto generated merged CSS file */" > ${target_file}
for file in "${files[@]}"; do
    if [[ ${file} =~ css/* ]]; then
        file="./${file:4}"
    fi
    cat ${file} >> ${target_file}
done

cat ${target_file} | npm run csso -- --output `pwd`/../generated/static/base.css