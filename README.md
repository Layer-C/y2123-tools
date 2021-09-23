# NFT ART GENERATOR
This tool generates generative NFT art, based of all available traits.  

**Features:**
* Generate Images of an infinite amount of traits
* Weight traits for different rarities
* Remove duplicated combinations
* Generate metadata for direct use on OpenSea

**Documentation**  

Before you start, make sure your file structure looks something like this:

YOUR_PROJECT/  
├─ images/  
│  ├─ trait1_name/  
│  │  ├─ file1.png  
│  │  ├─ file2.png  
│  │  ├─ file3.png  
│  │  ├─ ...  
│  ├─ trait2_name/  
│  │  ├─ file4.png  
│  │  ├─ file5.png  
│  │  ├─ ...  
│  ├─ trait3_name/  
│  │  ├─ file6.png  
│  │  ├─ ...  
│  ├─ ...  

This is really important, since the scripts imports the traits based on the folder structure.

The next step is the weighting of your traits.  
You can enter the amount you want to have of the listed trait.  
Please make sure that all traits end up with the same amount of images, otherwise there will be issues.  
Example: You want 50 total images. You enter 50 White background, 25 red balls and 25 blue balls.  
That would result in 50 total spheres and 50 total background.

Please note that if you selected the option to remove duplicates there might be less images then expected.  

That's it check your output folder for your images and metadata file.