var request = require("sync-request");
var turf = require("turf-distance");
var array = require("array-extended");


/***************************
GET THE COMMAND LINE VARS
****************************/
// get text (tag) to search for 
var text = process.argv[2];

//get the number of hours to sleep
var gHours = process.argv[3];

//get the longitude min of BBOX
var lonmin = parseFloat(process.argv[4]);

//get the latitude min of BBOX
var latmin = parseFloat(process.argv[5]);

//get the longitude max of BBOX
var lonmax = parseFloat(process.argv[6]);

//get the latitude max of BBOX
var latmax = parseFloat(process.argv[7]);

//get max distance from the radius, in km, to report results
var gMaxDistance = process.argv[8];

//get the start time (publishedAfter) to begin at
var startTime = process.argv[9];

//get the start time (publishedAfter) to begin at
var key = process.argv[10];

//units are always km
var gUnits = 'kilometers';
var resultsArray = new Array();

/*
outputElement - output an element (video) if we havent seen it before (remove dups)
*/
function outputElement(item, longitude, latitude)
{
	id = item.id.videoId;
	
	urlTemp = 'https://www.googleapis.com/youtube/v3/videos?id='+id+'&part=snippet&type=video&key='+key;
	var response = request('GET',urlTemp);
	var body = response.body.toString('utf-8');
	var info = JSON.parse(body);
	if (info.items)
	{
		item = info.items[0];

		if (resultsArray.indexOf(id) < 0)
		{
			resultsArray.push(id);
			videoURI = "https://www.youtube.com/watch?v="+id;
			dateTime = item.snippet.publishedAt;
			title = item.snippet.title;
			ft = new Date();
			console.log(id+','+longitude+','+latitude+',"'+title+'",'+videoURI+','+dateTime+','+ft);
		}
	}
}

/*
findCircumcircle - find the min circumcircle for a bounding box
*/
function findCircumcircle(lonmin,latmin,lonmax,latmax)
{
	var circle = {loncenter:0, latcenter:0, radius: 0};
	loncenter = (lonmax+lonmin)/2;
	latcenter = (latmax+latmin)/2;
	
	a = lonmax - loncenter;
	b = latmax - latcenter;
	
	c = Math.sqrt((a*a)+(b*b));
	
	circle.loncenter = loncenter;
	circle.latcenter = latcenter;
	circle.radius = c;
	
	return circle;
}

/*
distanceOfRadius - using turf, find the distance between two points (the center of a circle, and a point along the circumference)
*/
function distanceOfRadius(lon1,lat1,lon2,lat2,units)
{
	var point1 = {
	  "type": "Feature",
	  "properties": {},
	  "geometry": {
		"type": "Point",
		"coordinates": [lon1, lat1]
	  }
	};
	var point2 = {
	  "type": "Feature",
	  "properties": {},
	  "geometry": {
		"type": "Point",
		"coordinates": [lon2, lat2]
	  }
	};

	return turf(point1, point2, units);
}

/*
findAllVideosBBox - find all the youtube videos within a bounding box, recursively using a quadtree
*/
function findAllVideosBBox(lonmin,latmin,lonmax,latmax,pubDate)
{
 	var circle = findCircumcircle(lonmin,latmin,lonmax,latmax);
 	var distance = distanceOfRadius(circle.loncenter,circle.latcenter,circle.loncenter,(circle.latcenter+circle.radius),gUnits);
 
	urlTemp = 'https://www.googleapis.com/youtube/v3/search?locationRadius='+distance+'km&q='+text+'&part=id&maxResults=1&location='+circle.latcenter+','+circle.loncenter+'&type=video&key='+key+'&publishedAfter='+pubDate;

	var response = request('GET',urlTemp);
	var body = response.body.toString('utf-8');
	var info = JSON.parse(body);
	var items;
	if (info.items)
	{
		if (distance <= gMaxDistance)
		{
			for (var t = 0; t < info.items.length; t++)
			{
				outputElement(info.items[t],circle.loncenter,circle.latcenter);
			}
			nextPageToken = info.nextPageToken;
			while(nextPageToken)
			{
				urlTemp = 'https://www.googleapis.com/youtube/v3/search?locationRadius='+distance+'km&q='+text+'&part=id&maxResults=50&location='+circle.latcenter+','+circle.loncenter+'&type=video&key='+key+'&publishedAfter='+pubDate+'&pageToken='+nextPageToken;
				
				var response = request('GET',urlTemp);
				var body = response.body.toString('utf-8');
				var info = JSON.parse(body);
				var items;
				if (info.items)
					for (var t = 0; t < info.items.length; t++)
					{
						outputElement(info.items[t], circle.loncenter,circle.latcenter);
					}
				nextPageToken = info.nextPageToken;
			}
		}
		else if (info.items.length > 0)
		{
			//we have items! so we need to split the box into quads
			q1lonmin = lonmin;
			q1latmin = latmin;
			q1lonmax = (lonmax+lonmin)/2;
			q1latmax = (latmax+latmin)/2;
			findAllVideosBBox(q1lonmin,q1latmin,q1lonmax,q1latmax,pubDate);
	
			q2lonmin = lonmin;
			q2latmin = (latmax+latmin)/2;
			q2lonmax = (lonmax+lonmin)/2;
			q2latmax = latmax;
			findAllVideosBBox(q2lonmin,q2latmin,q2lonmax,q2latmax,pubDate);
	
			q3lonmin = (lonmax+lonmin)/2;;
			q3latmin = latmin;
			q3lonmax = lonmax;
			q3latmax = (latmax+latmin)/2;
			findAllVideosBBox(q3lonmin,q3latmin,q3lonmax,q3latmax,pubDate);
	
			q4lonmin = (lonmax+lonmin)/2;
			q4latmin = (latmax+latmin)/2;
			q4lonmax = lonmax;
			q4latmax = latmax;
			findAllVideosBBox(q4lonmin,q4latmin,q4lonmax,q4latmax,pubDate);
		}
	
	}
	return;
}


//start the app, make an initial call to get all the videos since our start time
console.log('id,longitude,latitude,title,url,dateTime,foundTime');
findAllVideosBBox(lonmin,latmin,lonmax,latmax,startTime);

//....now go to sleep for gHours and wakeup and find the new videos
var hour = 1000*60*60;
var d1 = new Date();
d1 = new Date(d1.getTime()-(gHours*hour));

//set the timer to go off every gHours!
setInterval(function() {
	
	findAllVideosBBox(lonmin,latmin,lonmax,latmax,d1.toISOString());
	d1 = new Date();
	d1 = new Date(d1.getTime()-(gHours*hour));
	
	}, gHours * hour);



