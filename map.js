//**MAP CODE STARTS HERE**//
//$('#map').css("height", $(document).height());

var map;
var ZOOM_DETAILS_LEVEL = 17;

map = new L.Map('map', { zoomControl:false });
var url = 'https://api.mapbox.com/styles/v1/mapbox/dark-v9/tiles/256/{z}/{x}/{y}?access_token=pk.eyJ1IjoibW1hc3RpIiwiYSI6ImNpb2U0eGJ6ZjAwMTl3Z2x4amJ1OGh3aTAifQ.SS26wQ8oypVbNlan2nguCg';
var tiles = new L.TileLayer(url, {minZoom: 3, attribution: 'MapBox'});


map.addLayer(tiles);
map.setView(new L.LatLng(35, -5), 3); //35, -5 to center the view

var heatmapCfg = {
  radius: 30,
  useLocalExtrema: true,
  latField: 'lat',
  lngField: 'lng',
  valueField: 'cnt',
  gradient: {
    '.5': '#9966ff',
    '.8': '#ff6600',
    '.95': '#ffff99'
  },
  maxOpacity: .8
};

//var heatmapLayer = new HeatmapOverlay(heatmapCfg);

//map.addLayer(heatmapLayer);

mergeHeatmap = function(searchResult) {
  var merged = {};
  var tpLen = Object.keys(searchResult).length

  Object.keys(searchResult).forEach(function(tp, index) {
    heatmap = searchResult[tp]["heatmap"]
    max = heatmap["max"];
    points = heatmap["points"];
    points.forEach(function(point) {
      point.cnt = point.cnt / max;
      mKey = point.lat + "_" + point.lng;
      if(!merged[mKey]) {
        merged[mKey] = point;
        merged[mKey].num = 1
      } else {
        merged[mKey].cnt = merged[mKey].cnt + point.cnt;
        merged[mKey].num = merged[mKey].num + 1;
      }
    });
  });

  data = Object.values(merged).filter(point => point.num == tpLen);
  return {"data": data};
}

mergeMajority = function(searchResult) {
  merged = {};

  Object.keys(searchResult).forEach(function(tp, index) {
    heatmap = searchResult[tp]["heatmap"];
    points = heatmap["points"];

    points.forEach(function(point) {
      point.tp = tp;
      mKey = point.lat + "_" + point.lng;
      if(!merged[mKey] || merged[mKey].cnt < point.cnt) {
        merged[mKey] = point;
      }
    });
  });

  return merged;
}

getSearchParams = function(categories) {
  var bounds = map.getBounds();
  var sw = bounds.getSouthWest();
  var ne = bounds.getNorthEast();

  var windowParams = new URL(window.location.href).searchParams

  var params = {
    sw: sw.lat + "," + sw.lng,
    ne: ne.lat + "," + ne.lng,
    tp: categories.join()
  }

  if(windowParams.get("tp")) params["tp"] = windowParams.get("tp")

  return params
}

var markers = []
var circles = []

var colors = {
  "churches": "#f1c857",
  "synagogues": "#116aec"
}

getCounter = function(){
  $.getJSON( "https://api.myjson.com/bins/9t913", function( data ) {
    console.log(JSON.stringify(data));
    var metaCounters = JSON.parse(data);
    console.log(metaCounters, "obj");
    console.log(metaCounters.crime, "liczba");
  });
}

showResult = function(searchResult) {
  var circleStroke = true;
  if(map.getZoom() > 10) {
    circleStroke = false;
    //cleaning markers
    markers.forEach(marker => map.removeLayer(marker))
    markers = [];
    Object.keys(searchResult).forEach(function(tp) {
      var items = searchResult[tp].items
      items.forEach(function(item) {
        //var marker = new L.marker([item.lat, item.lng]);
        if (tp == 'synagogues') var icoURI = 'https://daks2k3a4ib2z.cloudfront.net/59412c18231a855223f00c3a/59e9e78ba71c7d00019135b2_marker_synagogue.svg';
        else var icoURI = 'https://daks2k3a4ib2z.cloudfront.net/59412c18231a855223f00c3a/59e9e776e87a4d000109f64a_marker_church.svg';
        var myIcon = L.icon({
          iconUrl: icoURI,
          iconSize: [22, 22]
        });
        var marker = new L.marker([item.lat, item.lng], {icon: myIcon});
        marker.bindPopup(tp + ":\n<br>" + item.name);
        marker.addTo(map);
        markers.push(marker);
      });
    });
  } else {
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];
    //merged = mergeHeatmap(searchResult);
    //heatmapLayer.setData(merged);
  };
  merged = mergeMajority(searchResult);
  circles.forEach(circle => map.removeLayer(circle));
  circles = [];
  Object.values(merged).forEach(function(point) {
    var circle = new L.circle([point.lat, point.lng], {radius: 200, stroke: circleStroke, color: colors[point.tp]});
    circle.addTo(map);
    circles.push(circle);
  });
  getCounter();
}

updateMap = function() {
  var categories = getActiveCategories();
  if(categories.length == 0) {
    clearMap();
  } else {
    $.getJSON({
      url: "https://api.wearerealitygames.com/heatmap2/search",
      data: getSearchParams(categories),
      success: showResult
    });
  }
}

clearMap = function() {
  circles.forEach(circle => map.removeLayer(circle));
  circles = [];
  markers.forEach(marker => map.removeLayer(marker));
  markers = [];
}

getActiveCategories = function() {
  return location.hash.replace('#', '').split(',').filter(c => c != '');
}

$('a').click(function() {
  var category = this.href.split('#')[1];
  var categories = getActiveCategories();

  if($.inArray(category, categories) < 0) {
    categories.push(category);
  } else {
    categories = categories.filter(c => c != category);
  }

  location.hash = '#' + categories.join();

  return false;
});

window.onhashchange = updateMap;
map.on('moveend', event => updateMap());
//**MAP CODE ENDS HERE**//
