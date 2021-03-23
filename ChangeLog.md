# Changelog:
* **23.03.21**
    - Made the permission editor popoutable
    - Now using SVG flags for higher quality.
    - Fixed issue [#74](https://github.com/TeaSpeak/TeaWeb/issues/74) (Swiss flag box has black background)
    - Fixed issue that middle clicking on the channel does not shows the channel file browser instead it shows the global one
  
* **21.03.21**
    - Reworked the server group assignment modal. It now better reacts to the user input as well is now popoutable
  
* **18.03.21**
    - Finally, got fully rid of the initial backend glue and changes all systems to provider
  
* **17.03.21**
    - Updated from webpack 4 to webpack 5
    - Reworked the client build process
    - Using webpack dev server from now on
  
* **14.03.21**
    - Enchanted the bookmark system
      - Added support for auto connect on startup
      - Cleaned and simplified up the bookmark UI
      - Added support for importing/exporting bookmarks
      - Added support for duplicating bookmarks
      - Adding support for default channels and passwords
      
* **12.03.21**
    - Added a new video spotlight mode which allows showing multiple videos at the same time as well as 
      dragging and resizing them
    - Fixed a minor bug within the permission editor
    - Fixed the creation of channel groups
  
* **20.02.21**
    - Improved the browser IPC module
    - Added support for client invite links
  
* **15.02.21**
    - Fixed critical bug within the event registry class
    - Added a dropdown for the microphone control button to quickly change microphones    
    - Fixed the microphone settings microphone selection (The default device wasn't selected)
    - Adding a hint whatever the device is the default device or not
    - Fixed issue [#169](https://github.com/TeaSpeak/TeaWeb/issues/169) (Adding permissions dosn't work for TS3 server)
    - Fixed issue [#166](https://github.com/TeaSpeak/TeaWeb/issues/166) (Private conversations are not accessible when IndexDB could not be opened)
    - Using the last used emoji to indicate the chat emoji button
  
* **22.01.21**
    - Allowing the user to easily change the channel name mode
    - Fixed channel name mode parsing
    - Improved the modal algorithms as preparation for easier popoutable modals
  
* **16.01.21**
    - Various bugfixes (Thanks to Vafin)
    
* **15.01.21**
    - Fixed the history toggle (Thanks to Vafin)
    
* **12.01.21**
    - Fixed bug where the quick video select popup did not start the video broadcasting
    - Fixed a bug where an invalid H264 codec may caused video connection setup failure
    
* **09.01.21**
    - The connect modal now connects when pressing `Enter` on the address line
    
* **08.01.21**
    - Fixed a bug where the microphone did not started recording after switching the device
    - Fixed bug that the web client was only able to use the default microphone
    
* **07.01.21**
    - Improved general client ui memory footprint (Don't constantly rendering the channel tree)
    - Improved channel tree loading performance especially on server join and switch
    - The channel tree now adjusts accordingly to the clients font size
    
* **29.12.20**
    - Reimplemented the music bot control UI
        - Fixing some bugs from earlier versions
        - Added a volume change button to easily change the bots volume

* **22.12.20**
    - Fixed missing channel status icon update on channel type edit
    - Improved channel edit UI experience and fixed some bugs
        - Fixed the invalid flags bug
        - Show "Not supported" for options which the server does not support
        - Added the option to edit the channel sidebar mode
        - Remove the phonetic name and the channel title (Both are not used)
        - Improved property validation 
        - Adjusting property edibility according to the clients permissions
    - Fixed issue [#164](https://github.com/TeaSpeak/TeaWeb/issues/154) ("error: channel description" bug)
    
* **18.12.20**
    - Added the ability to send private messages to multiple clients
    - Channel client count now updates within the side bar header
    - The client now supports the new server channel sidebar mode (File transfer is in progress)
    - Correctly parsing and render `client://` urls
    - Updating the client talk status if the client has been moved
    
* **13.12.20**
    - Directly connection when hitting enter on the address line
    
* **12.12.20**
    - Improved screen sharing and camara selection
    - Showing the echoed own stream from the server instead of the local one
    - Fixed a few minor issues with the auto url tokenizer
    
* **09.12.20**
    - Fixed the private messages unread indicator
    - Properly updating the private message unread count
    - Improved channel conversation mode detection support
    - Added support for HTML encoded links (Example would be when copying from Edge the URL)
    - Enabled context menus for all clickable client tags
    - Allowing to drag client tags
    - Fixed the context menu within popout windows for the web client
    - Reworked the whole sidebar (Highly decreased memory footprint)
    
* **08.12.20**
    - Fixed the permission editor not resolving unique ids
    - Fixed client database info resolve
    - Improved the side header bar
      All values are not updating accordingly to the connection state
        
* **07.12.20**
    - Fixed the Markdown to BBCode transpiler falsely emitting empty lines
    - Fixed invalid BBCode escaping
    - Added proper BBCode support for lazy close tags
    - Improved the URL detecting and replace support (Reduced false positives and proper protocol checking)
    - Adding support for list bb codes and background color
    - Fixed a bug where `code` and `noparse` areas got parsed by the bbcode url parser
    - Fixed some minor BBCode parser bugs
        - Fixed BBCode inline code style
        - URL tags can not contain any other tags
        - Correctly parsing the "lazy close tag" `[/]`
    - The client info modal now updates its values accordingly on client changes
    
* **05.12.20**
    - Fixed the webclient for Firefox in incognito mode
    
* **04.12.20**
    - Properly logging channel creations, deletions, shows and hides
    - Fixed missing collapsed arrow update after channel move
    - Added an option for mass channel subscription and unsubscription
    - Adding channel entry range selection for ealier multi channel select
    
* **03.12.20**
    - Fixed server connection tab move handler
    - Fixed file browser context menu when having an overlay
    - Added channel movement and reordering
    - Automatically subscribe to newly created channels
    
* **02.12.20**
    - Fixed a bug within the client entry move mechanic of the channel tree which prevented any client selection
    - Selecting clicked client when moving 
    - When a client has been moved into another client his channel will be used
    
* **29.11.20**
    - Added support for the native client to show and broadcast video
    - By default using a quick select method when sharing the screen
    
* **22.11.20**
    - Added a ton of video settings
    - Added screen sharing (Currently via the camera channel)
    - Using codec H264 instead of VP8
    
* **14.11.20**
    - Fixed bug where the microphone has been requested when muting it.
    
* **07.11.20**
    - Added video broadcasting to the web client
    - Added various new user interfaces related to video broadcasting
    - Reworked the whole media transmission system (now using native audio en/decoding)
    
* **05.10.20**
    - Reworked the top menu bar (now properly updates)
    - Recoded the top menu bar renderer for the web client
    
* **04.10.20**
    - Fixed invalid channel tree unique id assignment for the initial server entry ([#F2986](https://forum.teaspeak.de/index.php?threads/2986))
    
* **27.09.20**
    - Middle clicking on bookmarksOld now directly connects in a new tab
    
* **26.09.20**
    - Updating group prefix/suffixes when the group naming mode changes
    - Added a client talk power indicator
    - Fixed channel info description not rendering
    
* **25.09.20**
    - Update the translation files
    - Made the server tabs moveable
    
* **24.09.20**
    - Improved the server tab menu
        - Better scroll handling
        - Automatic update on server state changes
        - Added an audio playback indicator
        - Rendering the server icon
    - Changing the favicon according to the clients status
    - Aborting all replaying audio streams when client mutes himself
    - Fixed issue [#139](https://github.com/TeaSpeak/TeaWeb/issues/139)
    
* **17.09.20**
    - Added a settings registry and some minor bug fixing
    
* **10.09.20**
    - Implemented an echo test
    - Added basic whisper support
    - Removed the emscripten part and use rust now for the audio worker
    - Heavily improved the audio decoding and playback part
    
* **07.09.20**
    - Fixed the web client for safari
    
* **05.09.20**
    - Smoother voice playback start (web client only)
    
* **16.09.20**
    - Fixed the control bar microphone and speaker buttons
    - Improved the default identity generation (no web worker required now)
    - Improved voice connection error handling (especially for firefox)
    - Adding a max reconnect limit for voice connection
    - Don't show the newcomer guide when directly connection to a server
    - Fixed default profile initialisation
    
* **07.09.20**
    - Fixed the web client for safari
    
* **05.09.20**
    - Smoother voice playback start (web client only)
    
* **02.09.20**
    - Fixed web client hangup on no device error
    - Improved default recorder device detection (selects by default the best device)
    - Decreased playback latency for the web client
    - The newcomer help texts are now forward able via the next button
    - Do not show the what's new screen for new users
    
* **31.08.20**
    - Reworked the audio decode system 
      - Improved audio decode performance
      - Heavily improved the audio quality for users with packet loss
      
* **24.08.20**
    - Fixed the country icon path for the native client
    - Fixed the context menu for the native client (It errored because some icons generated by the sprite generator where miss aligned)
    
* **23.08.20**
    - Fixed the CSS-Variable editor export and import functionality for the native client
    - Fixed the nasty scroll bar within the CSS-Variable editor for the native client
    - Added the possibility, by shift clicking the export button, to export the full variable set, including the default values
    - Made the CSS-Variable changes persistent. This means changes will still effect the client after a restart.
    - Fixed the steam animation for the native client in development mode
    
* **22.08.20**
    - Added a fancy client updated, change log window for the native and web client
    - Implemented the changed audio API into the client
    
* **11.08.20**
    - Fixed the voice push to talk delay
    - Improved the microphone setting controller
    - Heavily reworked the input recorder API
    - Improved denied audio permission handling
    
* **09.08.20**
    - Added a "watch to gather" context menu entry for clients
    - Disassembled the current client icon sprite into his icons
    - Added an icon spread generator. This now allows dynamically adding new icons to the spread sheet
    - Fixed a bug that prevented the microphone settings from saving
    - Enabled the CSS editor for the client as well
    
* **08.08.20**
    - Added a watch to gather mode
    - Added API support for the popout able browsers for the native client
    
* **05.08.20**
    - Putting the CSS files within the assets. No extra load needed any more
    - Revoked the async file loading limit
    - Improved chunk splitting for webpack
    - Using webpack for the opus codec generated code as well
    - Improved the web audio context handler
    
* **01.08.20**
    - Cleaning up the channel trees selection on reset
    - Updated the translations to the newest standard
    
* **25.07.20**
    - Fixed bug where icons could not be loaded due to cros policy
    
* **24.07.20**
    - Cleaned up the web client socket connection establishment code
    - Improved connect refused error detection (Not showing the certificate accept dialog if the server is down)
    
* **21.07.20**
    - Added the enchanted server log system
    - Recoded the server log with react
    
* **20.07.20**
    - Some general project cleanup
    - Heavily improved the IPC internal API
    - Added a basic API for popout able modals 
    - Added a CSS variable editor
    
* **18.07.20**
    - Rewrote the channel conversation UI and manager
      - Several bug fixes like the scrollbar 
      - Updated the channel history view mode
      - Improved chat box behaviour
      - Automatically crawling all channels on server join for new messages (requires TeaSpeak 1.4.16-b2 or higher)
      - Improved the channel chat history browsing experience
    - Added support for the `qote` bbcode and markdown syntax
    - Recoded the private conversation UI and manager
        - Improved client disconnect/reconnect handing
        - Updated several chat box issues
        - Improved history view
        - Improved chat experience when chatting with two different users which have the same identity
        - Automatically reopening the last open private chats
        - Fixed the chat partner typing indicator
    - Fixed chat scroll bar after switching tabs
    - Fixed the chat "scroll to new messages" button
    - Finalized the loader animation
    - Improved the channel tree scroll fix handler
  
* **12.07.20**
    - Made the loader compatible with ES5 to support older browsers
    - Updated the loader animation

* **15.06.20**
    - Recoded the permission editor with react
    - Fixed sever permission editor display bugs
    - Recoded the group add editor with react
    - Added the ability to duplicate groups and copy their permissions
    - The permission editor now uses by default the highest permission value instead of 1
    - Added options to enable/disable a whole permission group
    
* **14.06.20**
    - Fixed local icon display element not updating when the icon has been loaded
    
* **13.06.20**
    - Started to extract all color values and put them into css variables
    - Fixed a minor issue related to server/channel groups
    
* **12.06.20**
    - Added a copy/paste menu for all HTML input elements
    - Heavily improved web client audio de/encoding
    - Fixed script node voice encoding
    
* **11.06.20**
    - Fixed channel tree deletions
    - Removed layout recalculate bottleneck on connection handler switching
    - Fixed empty channel tree on tab change, if the tree has some scroll offset
    - Added the ability to duplicate bookmarksOld
    - Fixed issue [#106](https://github.com/TeaSpeak/TeaWeb/issues/106)
    - Fixed issue [#90](https://github.com/TeaSpeak/TeaWeb/issues/90)
    
* **10.06.20**
    - Finalize the channel file explorer
    - Reworked the file transfer system
    - Using an appropriate hash function for the avatar id generation
    - Fixed icon over clipping for the channel tree and favorites
    
* **21.05.20**
    - Updated the volume adjustment bar
    
* **18.05.20**
    - Fixed client name change does not update the name in the channel tree
    - Fixed hostbanner height
    
* **03.05.20**
    - Splitup the file transfer & management part
    - Added the ability to register a custom file transfer provider (required for the native client)
    - Added DockerHub image deploy automatisation
    - Fixed enum member declaration for the dts generator
    - Hiding non exported classes from `.d.ts` files
    
* **25.04.20**
    - Fixed missing channel tree update on talk power change
    
* **21.04.20**
    - Clicking on the music bot does not longer results in the insufficient permission sound when the client has no permissions
    - Fixed permission editor overflow
    - Fixed the bookmark edit window (bookmarksOld have failed to save)
    
* **18.04.20**
    - Recoded the channel tree using React
    - Heavily improved channel tree performance on large servers (fluent scroll & updates)
    - Automatically scroll to channel tree selection
    - Fixed client speak indicator
    - Fixed the message unread indicator only shows up after the second message (as well increase visibility)
    - Fixed the invalid initialisation of codec workers
    - Improved context menu subcontainer selection
    - Fixed client channel permission tab within the permission editor (previously you've been kick from the server)
    - Added the ability to collapse/expend the channel tree
    - Removed PHP dependencies from the project. PHP isn't needed anymore
    
* **11.04.20**
    - Only show the host message when its not empty
    
* **10.04.20**
    - Improved key code displaying 
    - Added a keymap system (Hotkeys)
    
* **09.04.20**
    - Using React for the client control bar
    - Saving last away state and message
    - Saving last query show state
    - Removing the hostbutton when we're disconnected from the server
    - Improved main pages loader speed as well inlining the initial js/css sources
      This ensures that the error & loading animation loads properly regardless of any errors
      
* **04.03.20**
    - Implemented the new music bot playlist song list
    - Implemented the missing server log message builders
    
* **03.03.20**
    - Using webpack instead of our own loaded (a lot of restructuring)
    - Fixed that the microphone slider hasn't worked for touch devices
    - Fixed a bug which caused that audio data hasn't been transmitted
    - Added the ability to start a https web server
     
* **28.03.20**
    - Fixed a bug within the permission editor which kicks you from the server
    
* **21.03.20**
    - Fixed identity import throwing an "btoa" error
    
* **19.03.20**
    - Using proper icons for the client info
    - Added an image preview overlay
    - Added image preview within the chat
    - Added an image preview to the music bot thumbnails
    - Added an image preview to client avatars
    - Fixed the translations system default repository
    
* **18.03.20**
    - Updated the sound playback mechanism and allowing the native backend to playback sounds via the native interface.
    
* **22.02.20**
    - Added a music bot control panel
    
* **16.02.20**
    - Updated the `setup_windows.md` tutorial
    - Correct redirecting to `index.php` when using the serve mode
    - Added correct hostname resolving for the web client.
    - Fixed automatically added new lines for inserted text
    - Improved button icon visibility within the permission editor
    - Fixed missing "private chats" button
    - Allowing YT videos within the chat and channel descriptions
    
* **02.02.20**
    - Added a music bot GUI
    
* **30.01.20**
    - Improved chat message parsing
        - Fixed copy & paste error
        - Better handling for spaces & tab indention
    - Fixed internal audio codec error
    - Fixed modal spam on microphone start fail
        
* **21.12.19**
    - Improved background performance when the microphone has been muted
    - Added support for `[ul]` and `[ol]` tags within the chat
    - Disabled BBCode format by default (enableable via the settings)
    - Added a hint under the chat box for the text formatting
    - Added Headings to the chat
    - Added `[hr]` or `___` to the chat
    - Added support for tables within the chat
    - Fixed "undefined" history when pressing `arrowup` within the chat box
    - Correctly logging ban messages within the server log
    - Capturing last used profile for connect
    
* **20.12.19**
    - Fixing chat URL escaping
    - Fixed issue [#77](https://github.com/TeaSpeak/TeaWeb/issues/77)
    - Implemented issue [#75](https://github.com/TeaSpeak/TeaWeb/issues/75) (Close Modals With ESC)
    - Improved the server info modal experience (Correctly showing no permissions)
    - Improved "About" modal overflow behaviour
    - Allow the client to use the scroll bar without closing the modal within modals
    - Improved bookmarksOld modal for smaller devices
    - Fixed invalid white space representation
    
* **10.12.19**
    - Show the server online count along the server chat
    
* **24.11.19**
    - Fixed several bugs within the permission editor
    - Hide senseless permissions (disableable via options)
    - Mute system sounds by default if the output has been muted
    - Improved PPT handler for the web client [#73](https://github.com/TeaSpeak/TeaWeb/issues/73)
    
* **06.10.19**
    - Added the possibility to connect within an already running TeaWeb instance
    - Closing the emoji picker as soon the client clicks into the void
    
* **30.10.19**
    - Removed old `files.php` script and replaced it with a more modern `file.ts` script to generate the environment
    - Some small UI fixed
    - Added support for the client to use his mouse keys (TeaClient for Windows only)
    - Made the top menu bar fully translateable
    - Fixed an UI overflow within the permission editor when using another language
    
* **Client update 1.4.0**
    - Removed icon size restriction for SVGs
    - Fixed permission editor icon select for not granted icon permissions
    - Fixed "disconnect" button not showing up after beeing connected
    - Improved handling of `disableMultiSession` settings (Connect in a new tab does not show up anymore)
    - Implemented avatar upload
    - Sorting server group icons within client channel tree
    - Fixed buggy away message position
    - Logging the servers welcome message [#54](https://github.com/TeaSpeak/TeaWeb/issues/54)
    - Showing servers hostbutton
    - Fixed microphone and sound action sounds [#67](https://github.com/TeaSpeak/TeaWeb/issues/67)
    - Added option to mute clients [#64](https://github.com/TeaSpeak/TeaWeb/issues/64)
    - Improved debug loader (no dependency faults anymore)
    - Saving private conversations and showing the messages again after client restart
    - Fixed some general memory leaks
    - Implemented the hostmessage functions
    - Fixed bookmark server password
    - Improved UI performance
    
    - Big UI Improvement:
      - New "dark theme" design
      - All elements are responsive to the font-size (Supporting now large & small screens (No mobile support yet))
      - Implemented an active ping calculation
      - And a lot more....
    
* **22.06.19**
    - Fixed channel create not working issue
    - Added BB-Code support for pokes
    
* **20.06.19**
    - Improved the threshold audio filter
    - Parsing `[spacerX]` channels properly
    
* **25.05.19**
    - Show icons within the permission editor
    - Added the possibility to select icons within the permission editor
    - Added server group clients list
    - Improved invite buddy dialog
    - Improved poke modal system
    - Improved modal template for text input
    
* **24.05.19**
    - Implemented icon upload
    
* **21.05.19**
    - Restructured project
    - Redesigned the audio input API (required for the client)
    - Minifying release file
    - Fixed travis builds
    
* **29.04.19**
    - Added a master volume slider and separated it from the sounds master volume
    - Saving changed sound and master volume settings
    
* **26.04.19**
    - Significant permission editor performance improve
      Using canvas now instead of a lots of HTML nodes
    - Fixed client related query and music bot issues
    
* **15.04.19**
    - Adjusted hostbanner properties
    - Added a chat history log
    - Added some extra features needed for the client
    
* **04.04.19**
    - Fixed issue with client icons not updating correctly (Showing invalid microphone state)
    - Added multi server mode
    - Connect URL not disconnecting from all other servers
    - Open certificate accept URL in another tab
    - Improved the host banner experience
    - Hiding server group types in permission editor which are not editable
    
* **28.03.19**
    - Improved icon and avatar cache handling
    - Added an icon manager
    - Fixed bookmark create modal style
    - Fixed control bar drop downs going over the edge
    - Fixed context menu overflowing and going out of the side
    - Improved host banner url revoke (only revoke after a new one has been generated)
    - Added some fancy console messages
    - Added country icons to the translation tab
    - Decreased required bandwidth on translation loading
    
* **17.03.19**
    - Using VAD by default instead of PPT
    - Improved mobile experience:
        - Double touch join channel
        - Removed the info bar for devices smaller than 500px
    - Added country flags and names
    - Added favicon, which change when you're recording
    - Fixed double cache loading
    - Fixed modal sizing scroll bug
    - Added a channel subscribe all button
    - Added individual channel subscribe settings
    - Improved chat switch performance
    - Added a chat message URL finder
        - Escape URL detection with `!<url>`
    - Improved chat experience
        - Displaying offline chats as offline
        - Notify when user closes the chat
        - Notify when user disconnect/reconnects
    - Preloading hostbanners to prevent flickering
    - Fixed empty channel and server kick messages
    
* **17.02.19**
    - Removed WebAssembly as dependency (Now working with MS Edge as well (but without audio))
    - Improved channel tree performance
    - Improved touch channel tree hierarchy (not selects the channel which had been actually touched)
    - Added the possibility to scroll on the control bar (required for super small devices)
    - Improved error handling within the codecs
    - Fixed the vertical sliders for touch devices
    - Added an effect on slider select/move
    - Fixed query visibility setting
    - Removed useless client infos for query clients
    - Added an auto reconnect system
    - Reworked the channel tree selected lines
    
* **15.02.19**
    - Fixed MS Edge loading/document issues
    - Fixed invalid pattern in the yes/no modal
    
* **11.02.19**
    - Added a detection to the loader to avoid cached files on updates
    
* **09.02.19**
    - Improved UI now using the material design framework based on bootstrap
    - Fixed several UI overflow or small screen issues
    - Improved permission editor performance
    - Added hash rate to identity improve
    - Merged CSS files in release mode
    - Fixed overlapping avatars
    
* **04.02.19**
    - Fixed channel permissions
    
* **27.01.19**
    - Made sounds configurable
    - Added option to mute sounds when output is muted
    - Added push to talk delay option
    - Have improvements related to identity management
    - First load of the app generates identity
    - Default VAD is not longer PPT, changed to Voice activity detection via threshold
    - Added identity improve gui
    
* **26.01.19**
    - Improved TeaSpeak identities (now generates automatic and are saveable)
    - Fixed `connect_profile` parameter within URL
    
* **20.01.19**
    - Added the possibility to change the remote volume of a bot
    - Added a playlist management system
    - Added BBCodes to the chat
    - Added client links to BBCodes
    - Added channel links to BBCodes
    - Added the possibility to drag client into the chat
    - Added function "create invite code" to the server
    - Added parameters `connect_password` and `connect_password_hashed` to URL to pass passwords
    
* **19.01.19**
    - Added multi user movement
    - Improved connection profile error handling
    - Added possibility to move the dividers
    
* **23.12.18**
    - Added query account management (since server 1.2.32b)
    
* **18.12.18**
    - Added bookmarksOld and bookmarksOld management
    - Added query user visibility button and creation (Query management will follow soon)
    - Fixed overflow within the group assignment dialog
    
* **17.12.18**
    - Implemented group prefix and suffix
    
* **15.12.18**
    - Implemented a translation system with default translated language sets for  
        - German
        - Turkish
        - Russian
        
* **3.12.18**
    - Fixed url connect parameters
    
* **2.12.18**
    - Fixed `[spacerX]` detection
    - Added a hint if the channel encryption has been overridden by the server settings
    - Enabled log grouping
    - Improved permission popup performance
    - Showing a better client version on client info
    - When you press enter while a channel is selected let you enter this channel
    - Fixed connect file select overflow
    
* **1.12.18**
    - Added the possibility to navigate via arrow keys within the channel tree
    
* **25.11.18**
    - Implemented support for svg and image detection
    - Fixed keeped host banner
    
* **20.11.18**
    - Improved client updates, and showing a query client as a query
    
* **17.11.18**
    - Improved PPT handling
    
* **04.11.18**
    - Added basic music bot management (Create | Delete | Nickname/Description-change)
    - Merged music bot pause and play. Added stop button
    - Fixed voice "lamp" being on on channel switch
    - Improved hostbanner reload (Not flicker anymore)
    - Added sounds on servergroup assignment and on revoke as well for channel group changed
    - Added client multiselect and multi actions
    - Implemented serveredit file transfer support
    
* **03.11.18**
    - Reworked on the basic overlay sizes
    - Added hostbanner to the UI 
    - Implemented sounds
    - Implemented poke notification
    - Added local volume change to music bots
    - Added move and channel kick to the music bot context menu options
    - Reworked private chat format
    - Added several server chat messages
    - Fixed client double click chat opening
    - Implemented client drag and drop
    - Fixed channel select within sub channels
    
* **28.10.18**
    - Restructured the project
    - Added a lot of helper scripts
    - Added a native client declaration export file to access the native methods
    
* **27.10.18**
    - Added speaker select option (client only)
    - Displaying version of the client
    - Reworked on the audio setting menu
    
* **20.10.18**
    - Project restructuring (forgot to update the changelog)
    - Added a complete ban ui
    - Fixed pointer stringify bug 
    
* **30.09.18**
    - Added the permission system (Assignments and management)
    - Fixed poke and client description with empty message
    - Fixed channel tree icons
    - Fixed group sorting
    
* **26.09.18**
    - Added Safari support
    
* **25.09.18**
    - Added support for token use
    - Added support for away messages
    - Fixed away display within information bar
    - Capturing last given address and nickname within connect modal
    - Using random password field ids for server connect modal
    - Improved forum not authenticated message within connect modal
    - Added partitional MS Edge support
    - Fixed chat new line indeed
    
* **24.09.18**
    - Added server passwords within login modal
    - Fixed native encoding for opera and firefox
    - Made the default music bot group configurable

* **27.02.18**
    - The first public upload of the Web client  
      All TeaSpeak premium & alpha testers have access  
      You require a valid TeaSpeak forum account  