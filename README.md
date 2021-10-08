# OXGN Labs - ART GENERATOR
A tool to generate generative art with Metaplex metadata. 

**Features:**
* Probability for each traits
* Weight traits for different rarities
* Remove duplicated combinations
* Generate metadata for Metaplex

**Setup** 
1) Install latest Node: https://nodejs.org/en/download/
2) Open Terminal, cd into the script folder and run: 
npm install

**Run** 
To run the script, simply cd into the script folder and run:
node index.js 

**Documentation**  
File structure must be like this:

SCRIPT_FOLDER/  
├─ images/  
│  ├─ layer0_TraitType1/  
│  │  ├─ layer0_TraitName1.png  
│  │  ├─ layer0_TraitName2.png  
│  │  ├─ layer0_TraitName3.png  
│  │  ├─ ...  
│  ├─ layer1_TraitType2/  
│  │  ├─ layer1_TraitName1.png   
│  │  ├─ layer1_TraitName2.png  
│  │  ├─ ...  
│  ├─ layer2_TraitType3/  
│  │  ├─ layer2_TraitName1.png  
│  │  ├─ ...  
│  ├─ ...  

Script imports the traits based on the folder structure.

Total images generated is the sum of all layer0 weights. But duplicates are removed so there might be less images then expected.

Make sure for all other layers, the sum of weights are same (or more) as layer0'.

At least 1 layer should have probability set to 100.

config.json will store the configurations, no need to enter values again. Can just edit this file.

output folder will have all the images and metadata after script finish running.