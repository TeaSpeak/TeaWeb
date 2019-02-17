# File structure
The TeaSpeak web client is separated into 2 different parts.

## I) Application files
Application files are all files which directly belong to the app itself.  
Like the javascript files who handle the UI stuff or even translation templates.  
Theses files are separated into two type of files.
1. [Shared application files](#1-shared-application-files)
2. [Web application files](#2-web-application-files)

### 1. Shared application files  
Containing all files used by the TeaSpeak client and the Web client.  
All of these files will be found within the folder `shared`.  
This folder follows the general application file structure.  
More information could be found [here](#application-file-structure)  
    
### 2. Web application files
All files which only belong to a browser only instance.
All of these files will be found within the folder `web`.  
This folder follows the general application file structure.  
More information could be found [here](#application-file-structure)  

### application file structure
Every application root contains several subfolders.  
In the following list will be listed which files belong to which folder  
  
| Folder | Description |  
| --- | --- |  
| `audio` | This folder contains all audio files used by the application. More information could be found [here]().  |  
| `css` | This folder contains all style sheets used by the application. More information could be found [here]().  |
| `js` | This folder contains all javascript files used by the application. More information could be found [here]().  |
| `html` | This folder contains all HTML and PHP files used by the application. More information could be found [here]().  |
| `i18n` | This folder contains all default translations. Information about the translation system could be found [here]().  |
| `img` | This folder contains all image files. |  

## I) Additional tools

## Environment builder
The environment builder is one of the most important tools of the entire project.  
This tool, basically implemented in the file `files.php`, will be your helper while live developing.  
What this tool does is, it creates a final environment where you could navigate to with your browser.  
It merges all the type separated files, which had been listed above ([here](#application-file-structure)).  