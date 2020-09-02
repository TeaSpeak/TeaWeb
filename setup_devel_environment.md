# Setup the develop environment on windows
## 1.0 Requirements
The following tools or applications are required to develop the web client:
- [1.1 IDE](#11-ide)
- [1.2 NodeJS](#12-nodejs)
- [1.2.2 NPM](#122-npm)
- [1.3 Git bash](#13-git-bash)
- [1.4 Rust (Options)](#14-rust-optional-will-be-installed-automatically)

### 1.1 IDE
It does not matter which IDE you use,  
you could even use a command line text editor for developing.

### 1.2 NodeJS  
For building and serving you require `nodejs` grater than 8.  
Nodejs is easily downloadable from [here]().  
Ensure you've added `node.exe` to the environment path!  

### 1.2.2 NPM 
Normally NPM already comes with the NodeJS installer.  
So you don't really have to worry about it.  
NPM min 6.X is required to develop this project.  
With NPM you could easily download all required dependencies by just typing `npm install`.  
IMPORTANT: NPM must be available within the PATH environment variable!  

### 1.3 Git bash
For using the `.sh` build scripts you require Git Bash.  
A minimum of 4.2 is recommend, but in general every modern version should work.  

### 1.4 Rust (Optional, will be installed automatically)
For building the web client audio library, you may want to install rust in advance.  
Since it will be installed when executing the install libraries script, I'm not going into more detail here.  
  
## 2.0 Project initialization

### 2.1 Cloning the WebClient
To clone the WebClient simply use:  
```shell script
git clone https://github.com/TeaSpeak/TeaWeb.git
```
After closing the project you've to update the submodules.  
Simply execute:  
```shell script
git submodule update --init --recursive
```
  
### 2.2 Initializing NPM
To download all required packages simply type:  
```shell script
npm install
```

### 2.3 Installing required dependencies
In order to build the project you need some libraries and applications (`rustup` and `wasm-pack`).  
To install them, just execute:
```shell script
./scripts/install_dependencies.sh
```
You may need to follow some additional steps, depending on the scripts output.  
  
Attention: If you've not installed `rustup` or `wasm-pack`, you may need to restart the bash,  
since the path variable needs to be updated. If you don't want to do so, you may just run:  
```shell script
source ./scripts/install_dependencies.sh
```
Attention: On error it will close your bash session with an exit code of 1!    
  
### 2.4 You're ready to go and start developing
To start the development environment which automatically compiles all your changed  
scripts and style sheets you simply have to execute:
```shell script
npm start web
```
This will also spin up a temporary web server where you could test out your newest changes.  
The server will by default listen on `http://localhost:8081`  

### 2.5 Using your UI within the TeaClient
An explanation how this works will come later. Stay tuned!

### 2.6 Generate a release package  
In order to build your own TeaWeb-Package just execute the `scripts/build.sh` script.  
```shell script
./scripts/build.sh web rel # Build the web client
./scripts/web_package.sh rel # Bundle the webclient into one .zip archive
```
You could also create a debug packaged just by replacing `rel` with `dev`.  
