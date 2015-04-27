future_habitat
==============

The Future Habitat Plugin for Coastal Resilience

To create a future habitat plugin for a specified region, there are three things you need to do:
1. Prepare your data
2. Publish your data as an image service
3. configure the plugin to use your data/service


Prepare Your Data

To prepare your data, it all needs to be raster GIS data.  Further it needs to be single band imagery (not R,G,B) storing some sort of integer type number where each number represents a land cover / land use value in real life (e.g. 1 = Wetlands, 2 = Urban etc.).  You should have a number of datasets where each dataset represents the land cover values at certain point in time.  Each dataset should have a unique name, named in a systematic manner.  Move each of these datasets onto the file gdb that can be seen by the server you are publishing to.  Once you have each of these datasets, you need to combine them using the tool "mosaic to new raster".  After this tools runs you will have a mosaic dataset that should be locacted in the same file geodatabase as the initial datasets.  One of the fields (attributes) will be called Name or name.

Publish your data

Next publish this mosaic dataset as an image service according to the instructions here:

http://resources.arcgis.com/en/help/main/10.2/index.html#//01540000045v000000

