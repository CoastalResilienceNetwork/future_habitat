
define(["jquery", "use!underscore", "esri/geometry/Polygon", "esri/SpatialReference", "dojo/Evented", "dojo/_base/declare", "dojo/_base/lang"],
    function ($, _, Polygon, SpatialReference, Evented, declare, lang) {
        dojo.require("esri.tasks.geometry");
        dojo.require("esri.dijit.InfoWindow");
  
  
	//	  var AgsDrawPolygon = declare([Evented], {
	//		startup: function(){
	//		  // once we are done with startup, fire the "ready" event
	//		  this.emit("ready", {});
	//		  alert('');
	//		}
	//	  });

  

        //var AgsMeasure = function (opts) {
		return declare([Evented], {
		
		
			constructor: function(kwArgs){
			  lang.mixin(this, kwArgs);
			},

		
            options : {
                map: null,
                tooltipTemplate: '',
                infoBubbleTemplate: '',
                // It is preferable to provide a custom geometry server, but 
                // this url is non-warranty "production" ready
                geomServiceUrl: 'http://tasks.arcgisonline.com/ArcGIS/rest/services/Geometry/GeometryServer',
                
                pointSymbol: new esri.symbol.SimpleMarkerSymbol(
                    esri.symbol.SimpleMarkerSymbol.STYLE_CIRCLE, 10,
                    new esri.symbol.SimpleLineSymbol(esri.symbol.SimpleLineSymbol.STYLE_SOLID,
                        new dojo.Color([105, 105, 105]), 1),
                        new dojo.Color([80, 80, 80, 0.35])),

                lineSymbol: new esri.symbol.SimpleLineSymbol(
                        esri.symbol.SimpleLineSymbol.STYLE_DASH,
                        new dojo.Color([105, 105, 105]), 2),

                polygonSymbol: new esri.symbol.SimpleFillSymbol(
                    esri.symbol.SimpleFillSymbol.STYLE_SOLID,
                    new esri.symbol.SimpleLineSymbol(esri.symbol.SimpleLineSymbol.STYLE_SOLID,
                        new dojo.Color([105, 105, 105]), 2),
                        new dojo.Color([105, 105, 105, 0])),

                hoverLineSymbol: new esri.symbol.SimpleLineSymbol(
                        esri.symbol.SimpleLineSymbol.STYLE_SOLID,
                        new dojo.Color([105, 105, 105]), 2),

                hoverPointSymbol: new esri.symbol.SimpleMarkerSymbol(
                    esri.symbol.SimpleMarkerSymbol.STYLE_CIRCLE, 15,
                    new esri.symbol.SimpleLineSymbol(esri.symbol.SimpleLineSymbol.STYLE_SOLID,
                        new dojo.Color([255, 0, 0]), 1),
                        new dojo.Color([255, 0, 0, 0.35])),
						
                mousePointSymbol: new esri.symbol.SimpleMarkerSymbol(
                    esri.symbol.SimpleMarkerSymbol.STYLE_CIRCLE, 15,
                    new esri.symbol.SimpleLineSymbol(esri.symbol.SimpleLineSymbol.STYLE_SOLID,
                        new dojo.Color([75, 75, 75]), 1),
                        new dojo.Color([255, 255, 255, 0.35])),

                //esriLengthUnits: esri.Units.MILES,
                //esriAreaUnits: esri.Units.SQUARE_MILES

            },

            _unitsLookup : {
                esriMiles: "mi",
                esriSquareMiles: "mi",
                esriMeters: "m",
                esriKilometers: "km",
                esriSquareKilometers: "km"
            },

            _points : [],
            _originPointEvent : null,
            _defaultOriginPointGraphic : null,
            _firstNodeClickBuffer : 20, // measured in pixels
            _renderedLength : 0,
            _pointLayer : null,
            _outlineLayer : null,
            _hoverLine : null,
            _eventHandles : {},
            _$tooltip : $('<div>'),
            _popupTemplate : '',
            _tooltipTemplate : '',
            _geometrySvc : '',
			
                
            showResultPopup : function (results) {
                // Delete the current info window (after grabbing its parent DOM node)
                //var map = options.map,
                    $parent = $(map.infoWindow.domNode).parent();
                map.infoWindow.destroy();

                // Create a new info window at the starting measure node
                var $infoWindow = $('<div>').appendTo($parent),
                    infoWindow = new esri.dijit.InfoWindow({ map: map }, $infoWindow.get(0));
                infoWindow.startup();
                map.infoWindow = infoWindow;
                $(infoWindow.domNode).addClass('measure-info-window'); // style it ourselves
                map.infoWindow.setContent(_popupTemplate(results));
                map.infoWindow.setTitle(""); // hides title div
                map.infoWindow.show(_points[0]);
                
            },

            finish : function (results) {
                // Finish the measurement, so add a final popup with
                // all available info
                //results.lengthUnits = _unitsLookup[options.esriLengthUnits];
                //results.areaUnits = _unitsLookup[options.esriAreaUnits];

                //showResultPopup(results);

                // Stop listening for events
                //this.deactivate();
				
				_.each(this._eventHandles, dojo.disconnect);
                this.map.enableDoubleClickZoom();
                this._$tooltip.hide();
				console.log(this._polygon)
				this.emit("drawend", {shape:this._polygon});
				
            },

            reset : function () {
                //deactivate();
				
				_.each(this._eventHandles, dojo.disconnect);
                this.map.enableDoubleClickZoom();
                this._$tooltip.hide();

                this.map.infoWindow.hide();

                this._pointLayer.clear();
                this._outlineLayer.clear();

                this._points = [];
                this._originPointEvent = null,
                this._defaultOriginPointGraphic = null,
                this._renderedLength = 0;
                this._hoverLine = null;
                this._eventHandles = {};

                this._$tooltip.empty().show();
            },

            setupMeasureEvents : function () {
                // Track clicks and hovers while the measure tool is active
                this._eventHandles.move =
                    dojo.connect(this.map, "onMouseMove", lang.hitch(this,this.handleMapMouseMove));

                this._eventHandles.doubleClick =
                    dojo.connect(this.map, "onDblClick", lang.hitch(this,this.handleMapDoubleClick));

                this._eventHandles.graphicMouseOver =                    dojo.connect(this._pointLayer, 'onMouseOver', lang.hitch(this,this.handleMarkerMouseOver));
                this._eventHandles.graphicMouseOut =
                    dojo.connect(this._pointLayer, 'onMouseOut', lang.hitch(this,this.handleMarkerMouseOut));

               this._eventHandles.graphicClick =
                    dojo.connect(this._pointLayer, 'onClick', lang.hitch(this,this.handleMarkerClick));

                this._eventHandles.graphicDoubleClick =
                    dojo.connect(this._pointLayer, 'onDblClick', lang.hitch(this,this.handleMarkerDblClick));
            },

            calculateDistance : function (points) {
                // Calculate the total distance from a series of ordered points
                var polyline = new esri.geometry.Polyline();
                polyline.setSpatialReference(this.map.spatialReference);
                polyline.addPath(points);

                var geoLine = esri.geometry.webMercatorToGeographic(polyline);
                return esri.geometry.geodesicLengths([geoLine], this.options.esriLengthUnits)[0];
            },

            handleMapDoubleClick : function (evt) {
                // Treat this click as a measurement node
                this.handleMapClick(evt);

                // Remove the hover graphic
                //this._hoverLine.setGeometry(null);

                // Stop measuring
                this.finish();
            },

            formatTooltip : function (segment, line) {

                return this._tooltipTemplate({
                    segmentLength: Azavea.numberToString(segment, 0),
                    totalLength: Azavea.numberToString(line, 0),
                    units: this._unitsLookup[this.options.esriLengthUnits]
                });
            },

            handleMapMouseMove : function (evt) {
                // Use the last entered point, and the hover point to 
                // create a temporary line which follows the mouse cursor
                var path = _.last(this._points, 1),
                    line = new esri.geometry.Polyline(),
                    geographicLine = null,
                    tipText = '';

                path.push(evt.mapPoint);
                line.setSpatialReference(this.map.spatialReference);
                line.addPath(path);

                //this._hoverLine.setGeometry(line);

                // Calculate the length of the line, using a geographic coordindate system
                geographicLine = esri.geometry.webMercatorToGeographic(line);
                var geoLineLength = esri.geometry.geodesicLengths([geographicLine], this.options.esriLengthUnits)[0];

                // Format the segment and line lengths
                //tipText = this.formatTooltip(geoLineLength, this._renderedLength + geoLineLength);

                // Update the popup to also track the mouse cursor, with the 
                // formatted text
				this._outlineLayer.clear();
				
				if (this._points.length == 0 ) {
				
					this._$tooltip
						.html('<div class="measure-tooltip"><p>Click the map to start drawing an area. </p></div>')
						.offset({
							top: evt.clientY + 10,
							left: evt.clientX + 10
						});				
				
				} else {
				
                this._$tooltip
                    .html('<div class="measure-tooltip"><p>Double-click at the final point or Single-click the first point to end your area.</p></div>')
                    .offset({
                        top: evt.clientY + 10,
                        left: evt.clientX + 10
                    });
					
					var _points2 = this._points.slice(0);
					
					_points2.push(evt.mapPoint)
					_points2.push(this._points[0])
					
					var polygon = new esri.geometry.Polygon(this.map.spatialReference);
					polygon.addRing(_points2)
					
					this._outlineLayer.add(new esri.Graphic(polygon, this.options.polygonSymbol));
				}
					
					var pointGraphic = new esri.Graphic(evt.mapPoint, this.options.mousePointSymbol,
                    { index: 1 });
					this._outlineLayer.add(pointGraphic);
					
					//console.log(_points2);
					
            },

            pointsMakeValidPolygon : function () {
                return (this._points && this._points.length > 2);
            },

            handleMapClick : function (evt) {
			a = (lang.hitch(this,this.pointsMakeValidPolygon));
                if (a()) {
                    var originP = new esri.geometry.ScreenPoint(this._originPointEvent.x,
                                                                this._originPointEvent.y),
                        bufferP = new esri.geometry.ScreenPoint(evt.clientX, evt.clientY),
                        len = esri.geometry.getLength(originP, bufferP);
                    if (len < this._firstNodeClickBuffer) {
                        this.finishMeasureAsPolygon();
                    } else {
                        this.continueMeasureAndAddPoint(evt);
                    }
                } else {
                    this.continueMeasureAndAddPoint(evt);
                }
            },

            continueMeasureAndAddPoint : function (evt) {

                // Track each point clicked to create a line segment for 
                // measuring length
                this._points.push(evt.mapPoint);

                // Add the graphic of the line node to the map.  An index attribute
                // is added to the graphic to enable querying of node-added order
                var pointGraphic = new esri.Graphic(evt.mapPoint, this.options.pointSymbol,
                    { index: this._points.length });
                this._pointLayer.add(pointGraphic);

                if (this._points.length === 1) {
                    // The first point has been added, start listening
                    // for measure events
                    

                    // Cache the event generated when clicking the first point. this will
                    // be needed to calculate the distance from origin of subsequent clicks
                    this._originPointEvent = evt;

                    this._defaultOriginPointGraphic = pointGraphic;

                    // Double clicks are handled exclusively by this tool while active
                    this.map.disableDoubleClickZoom();

                    // Setup the hover line symbology and add to the map
                    this._hoverLine = new esri.Graphic();
                    this._hoverLine.setSymbol(this.options.hoverLineSymbol);
                    this._outlineLayer.add(this._hoverLine);

                } else {
                    // An additional point has been added to the measurement,
                    // take the two most recent points, and draw a line from them
                    //var line = new esri.geometry.Polyline();
                    //line.setSpatialReference(options.map.spatialReference);
                    //line.addPath(_.last(_points, 2));

                    //var lineGraphic = new esri.Graphic(line, options.lineSymbol);
                    //_outlineLayer.add(lineGraphic);
					
					var _points2 = this._points.slice(0);
					_points2.push(this._points[0])
					
					this._outlineLayer.clear();
					var polygon = new esri.geometry.Polygon(this.map.spatialReference);
					polygon.addRing(_points2);
					
					this._polygon = polygon;
					this._outlineLayer.add(new esri.Graphic(polygon, this.options.polygonSymbol));
					
                }
				
				//var polygon = new Polygon(options.map.spatialReference);
				//polygon.addRing([_points]);
				
                //var polygonGraphic = new esri.Graphic(polygonGraphic, options.polygonSymbol);
                //_outlineLayer.add(polygonGraphic);
				
				
				//console.log(polygon);
                
                // Cache a copy of the total line length so far, so we don't
                // have to recalculate frequently on mouse move events
                var calculated = this.calculateDistance(this._points);

                // Only update the _renderedLength if calculated is a valid number
                // This is an IE10 workaround.
                this._renderedLength = isNaN(calculated) ? this._renderedLength : calculated;
            },

            setDefaultOriginPointSymbol : function (graphic) {
                graphic.setSymbol(this.options.pointSymbol);
            },

            setHoverPointSymbol : function (graphic) {
                graphic.setSymbol(this.options.hoverPointSymbol);
            },

            isFirstNode : function (evt) {
                // Is this the node which begins the measure line?
                return evt.graphic.attributes && evt.graphic.attributes.index === 1;
            },

            handleMarkerMouseOver : function (evt) {
                // Check if the graphic the mouse is on was the first 
                // node added to the measure line
                if (this.isFirstNode(evt) && this.pointsMakeValidPolygon()) {
                    // Change the style of the node to demonstrate that it
                    // can be clicked to complete as polygon
                    this.setHoverPointSymbol(evt.graphic);
                }
            },

            handleMarkerMouseOut : function (evt) {
                // Return the node to the deafult symbol, if it was
                // the first node added
                if (this.isFirstNode(evt)) {
                    this.setDefaultOriginPointSymbol(evt.graphic);
                }
            },

            handleMarkerDblClick : function (evt) {
                this.finishPolygonOrStopProp(evt);
            },
                
            handleMarkerClick : function (evt) {
                this.finishPolygonOrStopProp(evt);
            },

            finishPolygonOrStopProp : function (evt) {
                if (this.pointsMakeValidPolygon()) {
                    this.tryToFinishMeasureAsPolygon(evt);
                } else {
                    dojo.stopEvent(evt);
                }
            },
                
            tryToFinishMeasureAsPolygon : function (evt) {
                if (this.isFirstNode(evt) && this.pointsMakeValidPolygon()) {
                    dojo.stopEvent(evt);
                    this.finishMeasureAsPolygon();
                }
            },

            finishMeasureAsPolygon : function() {
                // If the first measurement node was clicked, and there
                // has already been a line drawn, close the line into a 
                // polygon

                // Make the last point be the same coordinates of the first point
                // and create a polygon out of it
                this._points.push(this._points[0]);
                var polygon = new esri.geometry.Polygon(this.map.spatialReference);
                
                // If the user has drawn the polygon ring anti-clockwise, reverse the ring
                // to make it a valid esri geometry.
                if (!esri.geometry.isClockwise(this._points)) {
                    this._points = this._points.reverse();
                }
                polygon.addRing(this._points);
                
                // If the polygon self interesects, simplify it using the geometry service
                if (esri.geometry.polygonSelfIntersecting(polygon) && this._geometrySvc) {
                    this._geometrySvc.simplify([polygon], function (simplifiedPolygons) {
                        this.setMeasureOutput(simplifiedPolygons[0]);
                    });
                } else {
                    this.setMeasureOutput(polygon);
                }
            }, 
            
            // Assumes polygon is valid at this point
            setMeasureOutput : function (polygon)
            {
                var geoPolygon = esri.geometry.webMercatorToGeographic(polygon),
                        area = esri.geometry.geodesicAreas([geoPolygon],
                            this.options.esriAreaUnits)[0];

                // Remove our lines for the outline layer and replace them
                // with the new polygon area
                this._outlineLayer.clear();
                this._outlineLayer.add(new esri.Graphic(polygon, this.options.polygonSymbol));
				this._polygon = polygon;
                // Change the first node symbol to the default as we finish
                this.setDefaultOriginPointSymbol(this._defaultOriginPointGraphic);
			
                this.finish();
            },

            // Public methods
            //return {
                initialize: function () {
                    this._outlineLayer = new esri.layers.GraphicsLayer();
                    this._pointLayer = new esri.layers.GraphicsLayer();
					
                    // Ordering of layers is important to not get hover-out events
                    // from a point when a line graphic is intersects it.
                    this.map.addLayer(this._outlineLayer);
                    this.map.addLayer(this._pointLayer);
                    var $map = $(this.map.container);
                    this._$tooltip.appendTo($map);
			
                    //_popupTemplate = _.template(options.infoBubbleTemplate);
                    //_tooltipTemplate = _.template(options.tooltipTemplate);
					
                    if (this.options.geomServiceUrl) {
                        this._geometrySvc = new esri.tasks.GeometryService(this.options.geomServiceUrl);
                    }
					
                },

                deactivate: function () {this.reset()},

                activate: function () {
                    // Clear any previous measurements
                    this.reset();

                    this._eventHandles.click =
                        dojo.connect(this.map, "onClick", lang.hitch(this,this.handleMapClick));
						
						this.setupMeasureEvents();
                }
            //};
        });

		
    }
);

