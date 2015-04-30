# youtube_geocoder
A simple geocoding exercise for youtube videos geotagged in nepal, since the quake. Since the youtube api does not report locations as lats and lons, I developed a heuristic approach, which uses search radius and 'quad trees' to refine video location.


-- youtube_geocoder.js: a node based app to retrieve the urls

USAGE: 

node youtube_geocode.js [text_to_find] [hours_to_sleep] [bbox_lonmin] [bbox_latmin] [bbox_lonmax] [bbox_latmax]  [minradius] [time_to_start] [apikey]


* text_to_find: text string to search for
* hours_to_sleep: hours to sleep between trying to find new videos
* bbox_lonmin: longitude min of bbox to search
* bbox_latmin: latitude min of bbox to search
* bbox_lonmax: longitude max of bbox to search
* bbox_latmax: latitude max of bbox to search
* minradius: the min  (in km) from a point radius at which we will attribute a video to a point
* time_to_start: only find videos published after this time
* apikey: the youtube apikey to use (get your own!)


example:

Find all the earthquake videos within the bounding box for nepal, after the event time. Attribute when our search radius < 0.5 km. Sleep for 4 hours between calls to find new videos

node youtube_geocoder.js earthquake 4 80.00 25.767 88.183 30.45 0.5 2015-04-25T06:45:00Z  AIzaSyDS4heuflAGO1bE67aZioeT3OE


OUTPUT: a tab separated file (written to stdout via console.log) with the videos and locations.

DEPENDENCIES: turf-distance, sync-request, array_extended node modules

KNOWN BUGS: 

* does no error checking on command line args and assumes they will all be present.
* the bounding box math/division makes no assumptions about projection
