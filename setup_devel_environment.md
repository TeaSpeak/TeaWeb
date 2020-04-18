# Setup the develop environment on windows
## 1.0 Requirements
The following tools or applications are required to develop the web client:
- [1.1 IDE](#11-ide)
- [1.2 NodeJS](#12-nodejs)
- [1.2.2 NPM](#122-npm)
- [1.3 Git bash](#13-git-bash)
- [1.4 Docker](#14-docker)

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

### 1.4 Docker
For building the native scripts you need docker.  
Just install docker from [docker.com](https://docs.docker.com).  
Attention: If you're having Windows make sure you're running linux containers!  
  
In order to setup the later required containers, just execute these commands:  
Make sure you're within the web source directory! If not replace the `$(pwd)` the the path the web client is located at  
```shell script
docker run -dit --name emscripten -v "$(pwd)":"/src/" trzeci/emscripten:sdk-incoming-64bit bash
```
  
## 2.0 Project initialization

### 2.1 Cloning the WebClient
To clone the WebClient simply use:  
```shell script
git clone https://github.com/TeaSpeak/TeaWeb.git
```
After closing the project you've to update the submodules.  
Simply execute:  
```shell script
git submodule update --init
```

### 2.2 Setting up native scripts  
TeaWeb uses the Opus audio codec. Because almost no browser supports it out of the box  
we've to implement our own de/encoder. For this we're using `emscripten` to compile the codec.  
In order to build the required javascript and wasm files just executing this in your git bash:  
```shell script
docker exec -it emscripten bash -c 'web/native-codec/build.sh'
```
  
### 2.3 Initializing NPM
To download all required packages simply type:  
```shell script
npm install
```

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
./scripts/build.sh web rel
```
You could also create a debug packaged just by replacing `rel` with `dev`.  
