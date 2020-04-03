# Changelog:
* **03.03.20**
    - Using webpack instead of our own loaded (a lot of restructuring)
    - Fixed that the microphone slider hasn't worked for touch devices
    
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
    - Improved bookmarks modal for smaller devices
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
    
    Big UI Improvement:
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
    - Added bookmarks and bookmarks management
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
    * Fixed poke and client description with empty message
    * Fixed channel tree icons
    * Fixed group sorting
    
* **26.09.18**:
    - Added Safari support
    
* **25.09.18**:
    - Added support for token use
    - Added support for away messages
    * Fixed away display within information bar
    - Capturing last given address and nickname within connect modal
    * Using random password field ids for server connect modal
    + Improved forum not authenticated message within connect modal
    - Added partitional MS Edge support
    * Fixed chat new line indeed
    
* **24.09.18**:
    - Added server passwords within login modal
    - Fixed native encoding for opera and firefox
    - Made the default music bot group configurable

* **0.0.1-Alpha**:  
- First public upload of the Web client  
  All TeaSpeak premium & alpha testers have access  
  You require a valid TeaSpeak forum account  