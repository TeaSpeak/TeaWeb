# Setup the develop environment on windows
## 1.0 Requirements
The following tools or applications are required to develop the web client:
- [1.1 IDE](#11-ide)
- [1.2 XAMPP (apache & php)](#12-xampp-with-a-web-server-and-php)
- [1.3 NPM](#13-npm)
- [1.4 Git bash](#14-git-bash)

### 1.1 IDE
For developing TeaWeb you require and IDE.  
Preferable is PHPStorm from Jetbrains because the've already build in compiling on changes.  
Else you've to run the compiler to compile the TS or SCSS files to js e.g. css files.

### 1.2 XAMPP with a web server and PHP
You require PHP (grater than 5) to setup and manage the project files.  
PHP is required for the index page as well.
The web server is required for browsing your final environment and watch your result.  
The final environment will be found at `web/environemnt/development/`. More information about  
the file structure could be found [here (TODO: link me!)]().

### 1.3 NPM 
NPM min 6.X is required to develop this project.  
With NPM you could easily download all required dependencies by just typing `npm install`.  
IMPORTANT: NPM must be available within the PATH environment variable!  

### 1.4 Git bash
For using the `.sh` build scripts you require Git Bash.  
A minimum of 4.2 is recommend, but in general every version should work.  

## 2.0 Development environment setup
### 2.1 Native code (codecs) (Not required)
If you dont want to develop the codec part or something related to the native
webassembly part of TeaWeb you could skip this step and follow the steps in [2.1-b](#21-b-skip-native-code-setup)

### 2.1-b Skip native code setup
