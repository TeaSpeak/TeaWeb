# Setup the develop environment on windows
## 1.0 Requirements
The following tools or applications are required to develop the web client:
- [1.1 IDE](#11-ide)
- [1.2 PHP](#12-php)
- [1.3 NodeJS](#13-nodejs)
- [1.3.2 NPM](#132-npm)
- [1.4 Git bash](#14-git-bash)

### 1.1 IDE
It does not matter which IDE you use,  
you could even use a command line text editor for developing.

### 1.2 PHP
For having a test environment you require an installation of PHP 5 or grater.  
You could just download PHP from [here](https://windows.php.net/downloads/releases/).  
Note:  
`php.exe` must be accessible via the command line.  
This means you'll have to add the `bin` folder to your `PATH` variable.  

### 1.3 NodeJS  
For building and serving you require `nodejs` grater than 8.  
Nodejs is easily downloadable from [here]().  
Ensure you've added `node.exe` to the environment path!  

### 1.3.2 NPM 
Normally NPM already comes with the NodeJS installer.  
So you don't really have to worry about it.  
NPM min 6.X is required to develop this project.  
With NPM you could easily download all required dependencies by just typing `npm install`.  
IMPORTANT: NPM must be available within the PATH environment variable!  

### 1.4 Git bash
For using the `.sh` build scripts you require Git Bash.  
A minimum of 4.2 is recommend, but in general every modern version should work.  

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
Because this is a quite time consuming task we already offer prebuild javascript and wasm files.
So we just need to download them. Just execute the `download_compiled_files.sh` shell script within the `asm` folder.  
```shell script
./asm/download_compiled_files.sh
```

### 2.3 Initial client compilation
Before you could start ahead with developing you've to compile everything.  
Just execute the `web_build.sh` script:
```shell script
./scripts/web_build.sh develop
```

### 2.4 Starting the development environment
To start the development environment which automatically compiles all your changed  
scripts and style sheets you simply have to execute:
```shell script
node file.js serve web dev
```
This will also spin up a temporary web server where you could testout your newest changes.  
The server will by default listen on `http://localhost:8081`  

### 2.5 You're ready
Now you're ready to start ahead and implement your own great ideas.  
