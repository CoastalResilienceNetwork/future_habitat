require({
    // Specify library locations.
    packages: [{
            name: "jquery",
            location: "//ajax.googleapis.com/ajax/libs/jquery/1.9.0",
            main: "jquery.min"
        }
    ]
});
define([
        "dojo/_base/declare",
        "framework/PluginBase",
        "esri/geometry/webMercatorUtils",
        "esri/request",
        "esri/toolbars/draw",
        "esri/layers/ArcGISDynamicMapServiceLayer",
        "esri/layers/ArcGISImageServiceLayer",
        "esri/layers/ImageServiceParameters",
        "esri/layers/MosaicRule",
        "esri/layers/RasterFunction",
        "esri/tasks/ImageServiceIdentifyTask",
        "esri/tasks/ImageServiceIdentifyParameters",
        "esri/tasks/QueryTask",
        "esri/tasks/query",
        "esri/graphicsUtils",
        "esri/graphic",
        "esri/symbols/SimpleLineSymbol",
        "esri/symbols/SimpleFillSymbol",
        "esri/symbols/SimpleMarkerSymbol",
        "esri/geometry/Extent",
        "esri/geometry/Polygon",
        "esri/request",
        "dijit/registry",
        "dijit/form/Button",
        "dijit/form/DropDownButton",
        "dijit/DropDownMenu",
        "dijit/MenuItem",
        "dijit/layout/ContentPane",
        "dijit/layout/TabContainer",
        "dijit/form/HorizontalSlider",
        "dijit/form/CheckBox",
        "dijit/form/RadioButton",
        "dojo/dom",
        "dojo/dom-class",
        "dojo/dom-style",
        "dojo/_base/window",
        "dojo/dom-construct",
        "dojo/dom-attr",
        "dojo/dom-geometry",
        "dijit/Dialog",
        "./AgsDrawPolygon",
        "esri/geometry/jsonUtils",
        "dojox/charting/Chart",
        "dojox/charting/plot2d/Grid",
        "dojox/charting/plot2d/Pie",
        "dojox/charting/plot2d/Bars",
        "dojox/charting/action2d/Highlight",
        "dojox/charting/action2d/MoveSlice",
        "dojox/charting/action2d/Tooltip",
        "dojox/charting/themes/MiamiNice",
        "dojox/charting/widget/Legend",
        "dojox/charting/axis2d/Default",
        "dojo/html",
        "dojo/_base/array",
        "dojo/aspect",
        "dojo/_base/lang",
        'dojo/_base/json',
        "dojo/on",
        "dojo/parser",
        "dojo/query",
        "dojo/NodeList-traverse",
        "require",
        "./customZoomer",
        "dojo/text!./config.json"
        //plugins/restoration_explorer/
    ],
    function(declare,
        PluginBase,
        webMercatorUtils,
        ESRIRequest,
        Drawer,
        ArcGISDynamicMapServiceLayer,
        ArcGISImageServiceLayer,
        ImageServiceParameters,
        MosaicRule,
        RasterFunction,
        ImageServiceIdentifyTask,
        ImageServiceIdentifyParameters,
        QueryTask,
        esriQuery,
        graphicsUtils,
        Graphic,
        SimpleLineSymbol,
        SimpleFillSymbol,
        SimpleMarkerSymbol,
        Extent,
        Polygon,
        esriRequest,
        registry,
        Button,
        DropDownButton,
        DropDownMenu,
        MenuItem,
        ContentPane,
        TabContainer,
        HorizontalSlider,
        CheckBox,
        RadioButton,
        dom,
        domClass,
        domStyle,
        win,
        domConstruct,
        domAttr,
        domGeom,
        Dialog,
        AgsDrawPolygon,
        geometryJsonUtils,
        Chart,
        Grid,
        Pie,
        Bars,
        Highlight,
        MoveSlice,
        Tooltip,
        MiamiNice,
        Legend,
        Default,
        html,
        array,
        aspect,
        lang,
        dJson,
        on,
        parser,
        dojoquery,
        NodeListtraverse,
        localrequire,
        customZoomer,
        configData
    ) {
        _config = dojo.eval(configData)[0];
        if (_config.ddText != undefined) {
            _ddTexter = _config.ddText;
        } else {
            _ddTexter = "Choose a Region";
        }
        if (_config.helpWidth != undefined) {
            _helpWidth = _config.helpWidth;
        } else {
            _helpWidth = "400px";
        }
        if (_config.regionLabeler != undefined) {
            _regionLabeler = _config.regionLabeler;
        } else {
            _regionLabeler = "Selected Region: #";
        }
        if (_config.legendName != undefined) {
            _legendName = _config.legendName;
        } else {
            _legendName = _config.pluginName;
        }
        return declare(PluginBase, {
            toolbarName: _config.pluginName,
            toolbarType: "sidebar",
            allowIdentifyWhenActive: false,
            fullName: (_config.fullName ? _config.fullName : ""),
            _hasactivated: false,
            _destroyed: true,
            size: 'custom',
            width: _config.pluginWidth,
            rendered: false,
            stateRestore: false,
            selindex: 0,
            corSlope: 1,
            corIntercept: 0,
            
			activate: function() {
                this.doZoom = true;
                if (this.rendered == false) {
                    try {
                        ga('send', 'event', this.toolbarName, 'Opened app');
                    } catch {
                        // report dev build?
                    }
                    this.rendered = true;
                    this.render();
                    this.resize();
                    //This is a hack to get the form to resize after closing continue button if infographic exists
                    console.log(this.container);
                    codearea = dojoquery(this.container).parent().parent();
                    formWidgets = registry.findWidgets(codearea[0]);
                    array.forEach(formWidgets, lang.hitch(this, function(formWidget, i) {
                        on(formWidget, "click", lang.hitch(this, function(e) {
                            this.resize();
                        }));
                    }));
                } else {
                    try {
                        ga('send', 'event', this.toolbarName, 'Re-opened app');
                    } catch {
                         // report dev build?
                    }
                    this.resize();
                }
                if (this.stateRestore == false) {
                    if ((this.usableRegions.length == 1)) {
                        domStyle.set(this.regionChooserContainer, {"opacity":0, "display":"none" });
                        domStyle.set(this.regionLabelNode, {"opacity":0, "display":"none" });
                        this.doZoom = true;
                        if (this._destroyed == true) {
                            this.changeGeography(this.usableRegions[0], true);
                        }
                    } else {
                        domStyle.set(this.regionChooserContainer, {"opacity":1, "display":"block" });
                        domStyle.set(this.regionLabelNode, {"opacity":1, "display":"block" });
                        this.doZoom = true;
                    };
                } else {
                    if (this._hasactivated == false) {
                        this.changeGeography(this.currentgeography, false, this.selindex);
                        //this.stateRestore = false;
                    }
                }
                this._hasactivated = true;
            },
            deactivate: function() {
                console.log('deactivate');
            },
            hibernate: function() {
                console.log('hibernate');
                this._destroyed = true;
                if (this.zoomerNode != undefined) {
                    domConstruct.empty(this.zoomerNode);
                }
                if (this.mainLayer != undefined) {
                    this.map.removeLayer(this.mainLayer);
                }
                if (this.agsDrawPolygon != undefined) {
                    this.agsDrawPolygon.deactivate();
                }
                if (this.mainpane != undefined) {
                    //this.button.set("label","Choose a Region");
                    domConstruct.empty(this.mainpane.domNode);
                }
                this.regionLabelNode.innerHTML = "";
                this.translevel = this.mainData.transparency;
                if (this.tabpan != undefined) {
                    array.forEach(this.tabpan.getChildren(), lang.hitch(this, function(tabc, i) {
                        //if (sindex == tabc.index) {
                        if (this.selindex == tabc.index) {
                            this.tabpan.selectChild(tabc);
                            this.resize();
                        }
                    }));

                    if(this.comppane != undefined) {
                        this.tabpan.removeChild(this.comppane);
                        this.comppane = undefined;
                    }

                    if(this.chartpane != undefined) {
                        console.log(this.chartareacontent);
                        domConstruct.empty(this.tableareacontent);
                        domConstruct.empty(this.charttitle);
                        dojo.style(this.chartareacontent, "display", "none");
                        this.chartinfo.innerHTML = "Mouse Over Chart for Information -- Scroll Down to see Table";
                    }
                }
            },
            initialize: function(frameworkParameters) {
                self = this;
				tool = this;
				declare.safeMixin(this, frameworkParameters);
                domClass.add(this.container, "claro");
                domClass.add(this.container, "cr-dojo-dijits");
                domClass.add(this.container, "plugin-future-habitat");
				
                this.mainData = dojo.eval(configData)[0];
                this.translevel = this.mainData.transparency;
                if (this.translevel == undefined) {
                    this.translevel = 0;
                }
                this.infoIcon = dojo.eval(configData)[0].infoIcon;
                if (this.infoIcon == undefined) {
                    this.infoIcon = 'data:image/png;base64,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'
                }
                this.configVizObject = dojo.eval(configData)[0].pluginData;
                //console.log(this.configVizObject);
                // PUT IN CUSTOM ZOOMER ONLY CODE
                // CHECK EACH GEO TO SEE IF CUSTOM ZOOMER IS NEEDED
                //this.cz = new customZoomer();
                doZoomer = false
                array.forEach(this.configVizObject, lang.hitch(this, function(entry, i) {
                    if (entry.customZoomer != undefined) {
                        doZoomer = true;
                    }
                }));
                if (doZoomer) {
                    this.cz = new customZoomer();
                }
                this.regionLabelNode = domConstruct.create("span"); //, innerHTML: "<img src=" + this.spinnerURL + ">" 
                this.regionChooserContainer = domConstruct.create("span"); //, innerHTML: "<img src=" + this.spinnerURL + ">" 
                dom.byId(this.container).appendChild(this.regionChooserContainer);
                dom.byId(this.container).appendChild(this.regionLabelNode);
                this.rebuildOptions(this.configVizObject);
                this.usableRegions = this.configVizObject;
                
                this.drawtoolbar = new Drawer(this.map);
                dojo.connect(this.drawtoolbar, "onDrawEnd", lang.hitch(this, this.modifyFilter));
                this.agsDrawPolygon = new AgsDrawPolygon({
                    map: this.map //,
                    //tooltipTemplate: this.$templates.find('#template-measure-tooltip').html()//,
                    //infoBubbleTemplate: this.$templates.find('#template-measure-infobubble').html()
                });
                this.agsDrawPolygon.initialize();
                this.agsDrawPolygon.on("drawend", lang.hitch(this, this.modifyFilter));
            },
            rebuildOptions: function(Inregions) {
                menu = new DropDownMenu({
                    style: "display: none;"
                });
                domClass.add(menu.domNode, "claro");
                array.forEach(Inregions, lang.hitch(this, function(entry, i) {
                    var plugin = this;
                    menuItem1 = new MenuItem({
                        label: entry.name,
                        onClick: function(e) {
                            plugin.changeGeography(entry);
							domStyle.set(this.getParent()._popupWrapper, {"display": "none", "z-index":100000});
                        }
                    });
                    menu.addChild(menuItem1);
                }));
                newbutton = new DropDownButton({
                    label: _ddTexter,
                    style: "margin-bottom:6px !important",
					onMouseDown: function(evt) {
						var widget = this;
						window.setTimeout(function(){
							if (!_.isUndefined(widget.dropDown._popupWrapper)) {
								domStyle.set(widget.dropDown._popupWrapper, {"display": "block", "z-index":100000})
							}
						}, 100)
					},
					onBlur: function(){
						var widget = this;
						if (!_.isUndefined(widget.dropDown._popupWrapper)) {
							domStyle.set(widget.dropDown._popupWrapper, "display", "none");
						}
					},
                    dropDown: menu
                });
                this.regionChooserContainer.appendChild(newbutton.domNode);
                this._hasactivated = false;
            },
            resize: function(w, h) {
                cdg = domGeom.position(dojoquery(this.container).parent()[0]);
				var regpos = domGeom.position(this.regionChooserContainer);
				var subregposh = (doZoomer && dojoquery(".subRegionNode").length > 0) ? domGeom.position(dojoquery(".subRegionNode")[0]).h: 0;
                this.sph = cdg.h - regpos.h - 40 - domGeom.position(this.buttonpane.domNode).h;
				
				console.log("******* ", domGeom.position(dojoquery(this.container).parent()[0]).h);
                domStyle.set(this.mainpane.domNode, "width", "420px");
				domStyle.set(this.mainpane.domNode, "overflow-x", "hidden");
                domStyle.set(this.mainpane.domNode, "height", this.sph);
                this.tabpan.resize({
                    "w": "100%",
                    "h": this.sph
                })
                if (this.sph > 500) {
                    ch = this.sph;
                } else {
                    ch = 500;
                }
                if (this.chart != undefined) {
                    this.chart.resize(400, 350)
                }
                if (this.compchart != undefined) {
                    //this.compchart.resize(cdg.w - 50, 300)
                }
                this.tabpan.layout();
				
                array.forEach(this.varsliders, lang.hitch(this, function(slider, i) {
                    if (slider.maximum != undefined) {
                        domStyle.set(slider.domNode, "width", (cdg.w - 60) + "px");
                    }
                }));
            },
            changeGeography: function(geography, zoomto, sindex, shapedata) {
                if (geography.correction == undefined) {
                    this.corSlope = 1
                    this.corIntercept = 0
                } else {
                    this.corSlope = (geography.correction.low[1] - geography.correction.high[1]) / (geography.correction.low[0] - geography.correction.high[0])
                    this.corIntercept = ((this.corSlope * geography.correction.low[0]) - geography.correction.low[1]) * -1
                }
                this._destroyed = false;
                if (geography.customZoomer) {
                    eval("this.cz." + geography.customZoomer + "(dom.byId(this.zoomerNode),this.map);");
                    this.cz.on("zoomed", lang.hitch(this, function(e) {
                        this.agsDrawPolygon.reset();
                        eout = new Object();
                        eout.shape = e;
                        console.log(eout);
                        a = lang.hitch(this, this.modifyFilter, eout);
                        a();
                        this.agsDrawPolygon.addfromPoly(eout.shape);
                    }));
                }
                if (sindex == undefined) {
                    sindex = 0
                };
                domStyle.set(this.buttonpane.domNode, "display", "");
                this.resize()
                if (this.mainLayer != undefined) {
                    this.map.removeLayer(this.mainLayer);
                }
                this.regionLabelNode.innerHTML = _regionLabeler.replace("#", [geography.name]);
                this.currentgeography = geography;
                if (geography.methods != undefined) {
                    if (typeof geography.methods == "string") {
                        methodsTitle = "View Full Report";
                        url = geography.methods;
                        geography.methods = {}
                        geography.methods.url = url;
                        geography.methods.title = methodsTitle;
                    }
                    domStyle.set(this.methodsButton.domNode, "display", "");
                    this.methodsButton.set("label", geography.methods.title);
                } else {
                    domStyle.set(this.methodsButton.domNode, "display", "none");
                }
                domConstruct.empty(this.ButtonsLocation);
                if (geography.buttons != undefined) {
                    array.forEach(geography.buttons, lang.hitch(this, function(cbutton, i) {
                        newButt = new Button({
                            label: cbutton.title,
                            onClick: lang.hitch(this, function() {
                                window.open(cbutton.url)
                            }) //function(){window.open(this.configVizObject.methods)}
                        });
                        this.ButtonsLocation.appendChild(newButt.domNode);
                    }));
                }
                if (this.comppane != undefined) {
                    this.tabpan.removeChild(this.comppane);
                }
                if (this.currentgeography.initialCondition != undefined) {
                    this.comppane = new ContentPane({
                        index: 2,
                        title: "Compare & Chart",
                        innerHTML: "<div class='charttitler' style='text-align: center; font-size: 16px; padding: 4px;'>Change from Current Condition</div><div style='z-index:2000;line-height:1;' class='chartinfo'></div><div class='chartareacontenter'></div><div class='tableareacontenter'></div>"
                    });
                    parser.parse();
                    inac = dojoquery(this.comppane.domNode).children(".chartareacontenter");
                    this.compchartareacontent = inac[0];
                    inac = dojoquery(this.comppane.domNode).children(".tableareacontenter");
                    this.comptableareacontent = inac[0];
                    inac = dojoquery(this.comppane.domNode).children(".chartinfo");
                    this.compchartinfo = inac[0];
                    this.tabpan.addChild(this.comppane);
                    domStyle.set(this.comppane.domNode, "width", "420px");
                } else {}
                domConstruct.empty(this.mainpane.domNode);
                this.varsliders = new Array();
                this.slidervalues = new Array();
                cdg = domGeom.position(this.container);
                array.forEach(geography.variables, lang.hitch(this, function(svar, i) {
                    if (geography.titles != undefined) {
                        if (geography.titles[i] != undefined) {
                            if (geography.titles[i].help != undefined) {
                                thelpButton = "<a style='color:black; position:relative; top:5px;' href='#' title='" + 'Click for more information.' + "'><i class='fa fa-question-circle'></i></a>";
                            } else {
                                thelpButton = "";
                            }
                            if (geography.titles[i].style != undefined) {
                                tstyle = geography.titles[i].style;
                            } else {
                                tstyle = 'font-weight:bold;padding-top:10px;font-size: 120%;color:#000'
                            }
                            ttext = "<span>" + thelpButton + geography.titles[i].name + "</span>";
                            nodetitle = domConstruct.create("div", {
                                style: tstyle,
                                innerHTML: ttext
                            });
                            //controlNode.appendChild(nodetitle);
                            this.mainpane.domNode.appendChild(nodetitle);
                            a = dojoquery(nodetitle).children();
                            //if (a.children.length > 0) {
                            if (thelpButton != "") {
                                b = a.children()
                                iconNode = dojoquery(b[0])
                                on(iconNode, "click", lang.hitch(this, function(e) {
                                    //alert('you clicked info');
                                    //pos = domGeom.position(iconNode);
                                    cdg = domGeom.position(this.container);
                                    console.log(cdg)
                                    toppos = e.y - cdg.y // + 10
                                    leftpos = e.x - cdg.x // + 10
                                    console.log(toppos, leftpos)
                                    //domStyle.set(this.infoarea.domNode, 'top', toppos + 'px');
                                    //domStyle.set(this.infoarea.domNode, 'left', leftpos + 'px');
                                    domStyle.set(this.infoarea.domNode, {
                                        "display": ""
                                    });
                                    this.infoareacontent.innerHTML = geography.titles[i].help;
                                }));
                            }
                        }
                    }
                    if (svar.help != undefined) {
                        thelpButton = "<a style='color:black' href='#' title='" + 'Click for more information.' + "'><i class='fa fa-question-circle'></i></a>";
                    } else {
                        thelpButton = "";
                    }
                    nslidernodetitle = domConstruct.create("div", {
                        innerHTML: thelpButton + " <b>" + svar.name + "</b>",
                        style: "padding-top:15px"
                    });
                    this.mainpane.domNode.appendChild(nslidernodetitle);
                    on(nslidernodetitle, "click", lang.hitch(this, function(e) {
                        domStyle.set(this.infoarea.domNode, 'display', '');
                        this.infoareacontent.innerHTML = svar.help;
                    }));
                    _selected = 0;
                    array.forEach(svar.values, lang.hitch(this, function(slr, j) {
                        if (slr.selected == true) {
                            _selected = j;
                        }
                    }))
                    if (_selected == 0) {
                        svar.values[0].selected = true;
                    }
                    if (svar.type != "radio") {
                        outslid = ""
                        iconSlid = false;
                        array.forEach(svar.values, lang.hitch(this, function(slr, j) {
                            if (slr.value == "initialCondition") {
                                iconSlid = true
                            };
                            if (slr.help != undefined) {
                                outslid = outslid + "<li><a href='#' style='color:black' title='" + slr.help + "'>" + slr.name + "</a></li>"
                            } else {
                                outslid = outslid + "<li>" + slr.name + "</li>"
                            }
                        }))
                        nslidernode = domConstruct.create("div");
                        this.mainpane.domNode.appendChild(nslidernode);
                        labelsnode = domConstruct.create("ol", {
                            "data-dojo-type": "dijit/form/HorizontalRuleLabels",
                            container: "bottomDecoration",
                            style: "",
                            innerHTML: outslid
                        })
                        nslidernode.appendChild(labelsnode);
                        steps = svar.values.length;
                        nowslider = new HorizontalSlider({
                            name: svar.name,
                            value: _selected,
                            minimum: 0,
                            maximum: svar.values.length - 1,
                            showButtons: false,
                            //intermediateChanges: true,
                            discreteValues: steps,
                            "data-intialCon": iconSlid,
                            //index: entry.index,
                            onChange: lang.hitch(this, this.changeScenario),
                            style: "width:" + cdg.w - 60 + "px;margin-left:10px;margin-top:10px;margin-bottom:20px"
                        }, nslidernode);
                        this.varsliders[svar.index] = nowslider;
                        this.slidervalues[svar.index] = svar.values;
                        parser.parse();
                        domStyle.set(nowslider.domNode, "width", (cdg.w - 100) + "px");
                    } else {
                        ncontrolsnode = domConstruct.create("div");
                        this.mainpane.domNode.appendChild(ncontrolsnode);
                        outslid = ""
                        array.forEach(svar.values, lang.hitch(this, function(slr, i) {
                            ncontrolnode = domConstruct.create("div");
                            ncontrolsnode.appendChild(ncontrolnode);
                            parser.parse();
                            groupid = svar.name;
                            isselected = false;
                            if (slr.selected) {
                                isselected = true;
                            }
                            ncontrol = new RadioButton({
                                name: "group_" + groupid,
                                value: false,
                                index: groupid,
                                title: slr.name,
                                checked: isselected, //slr.selected,
                                onChange: lang.hitch(this, function(val) {
                                    if (val == true) {
                                        this.changeRadio(svar.index, i)
                                    }
                                }), //lang.hitch(this,function(e) { if(e) {this.updateUnique(i, groupid)}})
                            }, ncontrolnode);
                            if (slr.help != undefined) {
                                nslidernodeheader = domConstruct.create("div", {
                                    style: "display:inline",
                                    innerHTML: "<span style='color:#000' id='" + "test" + "_lvoption_" + groupid + "_" + i + "'><a style='color:black' href='#' title='" + 'Click for more information.' + "'><i class='fa fa-question-circle' style='position:relative; top:1px;color:#5d6165;margin-left:3px;'></i></a> " + slr.name + "</span><br>"
                                });
                            } else {
                                nslidernodeheader = domConstruct.create("div", {
                                    style: "display:inline",
                                    innerHTML: "<span style='color:#000' id='" + "test" + "_lvoption_" + groupid + "_" + i + "'> " + slr.name + "</span><br>"
                                });
                            }
                            on(nslidernodeheader, "click", lang.hitch(this, function(e) {
                                domStyle.set(this.infoarea.domNode, 'display', '');
                                this.infoareacontent.innerHTML = slr.help;
                            }));
                            ncontrolsnode.appendChild(nslidernodeheader);
                            parser.parse();
                        }))
                        this.varsliders[svar.index] = {
                            "value": 0
                        };
                        this.slidervalues[svar.index] = svar.values;
                        parser.parse();
                    }
                }));
                //end loop here
                //console.log('hi');
                //console.log(this.slidervalues)					
                nslidernodetitle = domConstruct.create("div", {
                    innerHTML: "<br><b>Filter Results by Habitat(s) of Interest</b>"
                });
                this.mainpane.domNode.appendChild(nslidernodetitle);
                //nslidernodetitle = domConstruct.create("div", {innerHTML: "<center><b>(Check to Exclude)</center></b>"});
                //this.mainpane.domNode.appendChild(nslidernodetitle);	
                this.currentgeography.exclude = [];
                this.checkers = [];
                array.forEach(geography.habitats, lang.hitch(this, function(habitat, i) {
                    if (habitat.name != "exclude") {
                        nslidernode = domConstruct.create("div");
                        this.mainpane.domNode.appendChild(nslidernode);
                        hselect = false;
                        if (habitat.selected) {
                            hselect = true;
                        }
                        slider = new CheckBox({
                            value: habitat.values,
                            //index: entry.index,
                            //minimum: entry.min,
                            //maximum: entry.max,
                            checked: hselect,
                            onChange: lang.hitch(this, function(nv) {
                                habitat.selected = nv;
                                this.modifyFilterAttributes()
                            }),
                        }, nslidernode);
                        this.checkers.push(slider);
                        parser.parse()
                        nslidernodeheader = domConstruct.create("div", {
                            style: "display:inline",
                            innerHTML: " " + habitat.name + "<br>"
                        });
                        this.mainpane.domNode.appendChild(nslidernodeheader);
                    } else {
                        this.currentgeography.exclude = habitat.values.sort();
                    }
                }))
                parser.parse()
                nslidernodetitle = domConstruct.create("div", {
                    innerHTML: "<br><b>Filter Results by a User Defined Area</b>"
                });
                this.mainpane.domNode.appendChild(nslidernodetitle);
                nslidernode = domConstruct.create("div");
                this.mainpane.domNode.appendChild(nslidernode);
                myButton = new Button({
                    label: "Click to Draw an Area",
                    class: "mainpane-button",
                    onClick: lang.hitch(this, this.drawPolygon)
                }, nslidernode);
                nslidernode = domConstruct.create("div");
                this.mainpane.domNode.appendChild(nslidernode);
                myButton2 = new Button({
                    label: "Zoom to Selection",
                    class: "mainpane-button",
                    onClick: lang.hitch(this, this.zoomToActive)
                }, nslidernode);
                nslidernode = domConstruct.create("div");
                this.mainpane.domNode.appendChild(nslidernode);
                myButton = new Button({
                    label: "Clear Filters",
                    class: "mainpane-button",
                    onClick: lang.hitch(this, this.clearFilters)
                }, nslidernode);
                this.WarningTextTag = domConstruct.create("div", {
                    style: "line-height:1; margin-top:5px;",
                    innerHTML: ""
                });
                this.mainpane.domNode.appendChild(this.WarningTextTag);
                if (geography.additionalText != undefined) {
                    addTextTag = domConstruct.create("div", {
                        innerHTML: geography.additionalText,
						style: "line-height:1;",
                    });
                    this.mainpane.domNode.appendChild(addTextTag);
                }
                parser.parse()
                var params = new ImageServiceParameters();
                params.noData = 0;
                this.mainLayer = new ArcGISImageServiceLayer(geography.url, {
                    //  imageServiceParameters: params
                    //opacity: 0.75
                });
                this.map.addLayer(this.mainLayer);
                dojo.connect(this.mainLayer, "onUpdateStart", lang.hitch(this, function() {
                    console.log("Update started...");
                    domStyle.set(this.refreshnode, "display", "block");
                }));
                dojo.connect(this.mainLayer, "onUpdateEnd", lang.hitch(this, function() {
                    //console.log(this.currentLayer.fullExtent)
                    console.log("Update Ended...");
                    domStyle.set(this.refreshnode, "display", "none");
                    this.resize();
                }));
                this.clearFilters(false, zoomto, shapedata);
                this.modifyFilterAttributes();
                this.changeScenario();
                this.changeOpacity(this.translevel);
                //rasterFunction.functionName = "Colormap";
                //var arguments = {};
                //arguments.Colormap = [[0, 255, 2, 3],[2, 45, 52, 255],[3, 45, 255, 0]];
                //rasterFunction.arguments = arguments; 
                //rasterFunction.variableName = "Raster";
                //this.mainLayer.setRenderingRule(rasterFunction);
                array.forEach(this.tabpan.getChildren(), lang.hitch(this, function(tabc, i) {
                    if (sindex == tabc.index) {
                        this.tabpan.selectChild(tabc);
                        this.resize();
                    }
                }));
            },
            drawPolygon: function() {
                //this.drawtoolbar.activate("polygon"); 
                //this.$templates = $('<div>').append($($.trim(templates))),
                this.agsDrawPolygon.deactivate();
                this.agsDrawPolygon.activate();
            },
            changeRadio: function(index, val) {
                console.log(index);
                this.varsliders[index] = {
                    "value": val
                };
                this.changeScenario();
            },
            changeScenario: function() {
                outname = this.currentgeography.root;
                icreached = false;
                disabledslids = new Array();
                title1 = new Array();
                array.forEach(this.varsliders, lang.hitch(this, function(slider, i) {
                    pushit = true;
                    array.forEach(this.currentgeography.variables, lang.hitch(this, function(vr, p) {
                        if (i == vr.index) {
                            nindx = p
                        };
                    }));
                    array.forEach(this.currentgeography.variables[nindx].values, lang.hitch(this, function(v, j) {
                        //console.log(slider.value, j)
                        if (slider.value == j) {
                            v.selected = true;
                        } else {
                            v.selected = false;
                        }
                    }));
                    console.log(this.currentgeography.variables[i].values);
                    if (icreached == false) {
                        outname = (outname == "") ? this.slidervalues[i][slider.value].value : outname + this.currentgeography.delimiter + this.slidervalues[i][slider.value].value;
                        title1.push(this.slidervalues[i][slider.value].name);
                        if (this.slidervalues[i][slider.value].value == "initialCondition") {
                            outname = (this.currentgeography.root == "") ? this.currentgeography.initialCondition : this.currentgeography.root + this.currentgeography.delimiter + this.currentgeography.initialCondition;
                            icreached = true;
                            pushit = false;
                            title1 = [this.slidervalues[i][slider.value].name]
                        }
                    }
                    if (pushit == true) {
                        //disabledslids.push(slider);
                    }
                }));
                array.forEach(disabledslids, lang.hitch(this, function(slider, i) {
                    slider.setDisabled(false);
                    if (icreached == true) {
                        if (icreached == true) {
                            slider.setDisabled(true)
                        }
                    }
                }));
                console.log("**************************");
                console.log(outname);
                this.subTitle = title1.join(" - ").replace("<br>", " ");
                //domConstruct.empty(this.charttitle);
                //newnode = domConstruct.create("span", {innerHTML: "<b> Year: " + this.currentgeography.years[this.Yearslider.value].name + "    Sea Level Rise: " +  this.currentgeography.slrs[this.SLRslider.value].name});
                //this.charttitle.appendChild(newnode);					
                //console.log(this.currentgeography.root + "_" + slrval + "_" + yearval)
                mr = new MosaicRule({
                    "method": "esriMosaicAttribute",
                    "where": this.currentgeography.field + " = '" + outname + "'",
                    "operation": "MT_FIRST",
                    "sortField": this.currentgeography.field,
                    "sortValue": outname
                });
                if (this.currentgeography.initialCondition != undefined) {
                    this.icmr = new MosaicRule({
                        "method": "esriMosaicAttribute",
                        "where": this.currentgeography.field + " = '" + ((this.currentgeography.root != "") ? this.currentgeography.root + this.currentgeography.delimiter + this.currentgeography.initialCondition : this.currentgeography.initialCondition) + "'",
                        "operation": "MT_FIRST",
                        "sortField": this.currentgeography.field,
                        "sortValue": (this.currentgeography.root == "") ? this.currentgeography.initialCondition : this.currentgeography.root + this.currentgeography.delimiter + this.currentgeography.initialCondition 
                    });
                }
                this.mainLayer.setMosaicRule(mr);
                this.applyFilter();
            },
            modifyFilterAttributes: function() {
                cloneexclude = this.currentgeography.exclude.slice(0);
                cloneexclude.push.apply(cloneexclude, this.currentgeography.exclude);
                cloneexclude = (cloneexclude.sort());
                nochecks = true;
                array.forEach(this.checkers, lang.hitch(this, function(habitat, i) {
                    if (habitat.checked == false) {
                        cloneexclude.push.apply(cloneexclude, habitat.value);
                        cloneexclude = (cloneexclude.sort());
                        cloneexclude.push.apply(cloneexclude, habitat.value);
                        cloneexclude = (cloneexclude.sort());
                    } else {
                        nochecks = false;
                    }
                }));
                this.currentExclude = (cloneexclude.sort());
                if (nochecks == true) {
                    this.currentExclude = [];
                }
                if (this.currentgeography.noData != undefined) {
                    array.forEach(this.currentgeography.noData, lang.hitch(this, function(v, i) {
                        this.currentExclude.push(v)
                    }));
                }
                this.applyFilter();
            },
            clearFilters: function(clearChecks, zoomto) {
                console.log("@@@@@3423423 ", this.stateRestore, this.clippingGeometry);
                //tsob = JSON.parse(JSON.stringify(shapedata));
                if (clearChecks == false) {
                } else {
                    array.forEach(this.checkers, lang.hitch(this, function(habitat, i) {
                        habitat.set('checked', false);
                    }));
                }
                if (this.stateRestore == true) {
                    this.isClipped = true;
                } else {
                    this.agsDrawPolygon.reset();
                    ext = this.currentgeography.extent;
                    polygonJson = {
                        "rings": [
                            [
                                [ext.xmin, ext.ymin],
                                [ext.xmin, ext.ymax],
                                [ext.xmax, ext.ymax],
                                [ext.xmax, ext.ymin],
                                [ext.xmin, ext.ymin]
                            ]
                        ],
                        "spatialReference": this.currentgeography.extent.spatialReference
                    };
                    this.clippingGeometry = new Polygon(polygonJson);
                    if (ext.spatialReference.wkid == 4326) {
                        geom = webMercatorUtils.geographicToWebMercator(this.clippingGeometry);
                        this.clippingGeometry = geom;
                    }
                    this.isClipped = false;
                }
                cloneexclude = this.currentgeography.exclude.slice(0);
                cloneexclude.push.apply(cloneexclude, this.currentgeography.exclude);
                //this.currentExclude = (cloneexclude.sort());
                this.currentExclude = []
                this.applyFilter();
                if (zoomto != false) {
                    if (this.doZoom == true) {
                        ext = new Extent(this.currentgeography.extent);
                        this.map.setExtent(ext);
                    }
                }
                /*				
                					var rasterFunction = new RasterFunction(
                					
                					{
                						"rasterFunction": "Colormap",
                						"rasterFunctionArguments": {
                							"Colormap": this.currentgeography.colormap,
                							"Raster": {
                									
                									"rasterFunction": "Remap",
                									"rasterFunctionArguments": {
                									"NoDataRanges": exclude,
                									"variableName": "Raster"
                										},
                							"outputPixelType": "U8"
                							} 
                						},
                						"outputPixelType": "U8"
                					}	
                					
                					);
                					
                					
                					this.mainLayer.setRenderingRule(rasterFunction);	
                					ext = new Extent(this.currentgeography.extent);
                					this.map.setExtent(ext);					
                */
            },
            makeDiffCharts: function() {
                domConstruct.empty(this.compchartareacontent);
                domConstruct.empty(this.comptableareacontent);
                newnode = domConstruct.create("span", {
                    innerHTML: "You have selected the current condition so there is nothing to compare, Totals information is in the Results Tab.",
					style:"line-height:1;"
                });
                this.compchartinfo.appendChild(newnode);
                console.log('$$$$$$$$$$$');
                console.log(this.icresults)
                console.log(this.regresults)
                if ((this.regresults != undefined) && (this.icresults != undefined)) {
                    // enable all other controls
                    if (this.varsliders.length > 1) {
                        array.forEach(this.varsliders, lang.hitch(this, function(slider, i) {
                            try {
                                slider.setDisabled(false);
                            } catch (err) {
                                console.log("Not a control");
                            }
                        }));
                    }
                    domConstruct.empty(this.compchartinfo);
                    newnode = domConstruct.create("span", {
                        innerHTML: "Mouse over chart for values <br> Scroll Down to see Table"
                    });
                    this.compchartinfo.appendChild(newnode);
                    console.log("compare now");
                    console.log(this.regresults, this.icresults);
                    if (this.isClipped == false) {
                        clipmes = "Full Extent"
                    } else {
                        clipmes = "User-defined Polygon Extent"
                    };
                    //this.ctitle = this.currentgeography.name + " - " + clipmes + "<br>" + this.subTitle;
                    this.compData = []
                    outable = "<tr style='background:" + "#fff" + "'><td style='font-size:12px;width:10%'>" + "Code" + "</td><td style='width:60%'>" + "Name" + "</td><td style='font-size:12pxtext-align: center;;width:10%'>" + "Total (Acres)" + "</td><td style='font-size:12px;text-align: center;width:10%'>" + "Change (Acres)" + "</td><td style='font-size:12px;text-align: center;width:10%'>" + "Change (%)" + "</td></tr>"
                    //this.totalarea =  0;
                    boxes = ""
                    texts = ""
                    count = 0
                    totacers1 = 0
                    totacers2 = 0
                    array.forEach(this.regresults.histograms[0].counts, lang.hitch(this, function(histo, i) {
                        //alert(this.currentgeography.colormap[i])
                        histo2 = this.icresults.histograms[0].counts[i]
                        //for (var c=0; c<this.currentgeography.colormap; c++) {
                        //	
                        //		currentcolor = this.currentgeography.colormap[c];
                        //		alert(currentcolor);
                        //		if (currentcolor[0] == i) {
                        //			alert(currentcolor);
                        //		}
                        //	}
                        array.forEach(this.currentgeography.colormap, lang.hitch(this, function(ccolormap, c) {
                            if (ccolormap[0] == i) {
                                outcolor = "rgb(" + ccolormap[1] + "," + ccolormap[2] + "," + ccolormap[3] + ")"
                                brightness = ((ccolormap[1] * 299) + (ccolormap[2] * 587) + (ccolormap[3] * 114)) / 1000;
                                if (brightness > 150) {
                                    textColor = "#000";
                                } else {
                                    textColor = "#fff";
                                }
                            }
                        }));
                        acers2 = parseInt((histo * (cvm * cvm) * 0.000247105) * ((cvm * this.corSlope) + this.corIntercept))
                        acers1 = parseInt((histo2 * (cvm * cvm) * 0.000247105) * ((cvm * this.corSlope) + this.corIntercept))
                        console.log(cvm + " " + histo + " " + acers1 + " " + acers2)
                        acers = acers2 - acers1;
                        totacers1 = acers + totacers1;
                        totacers2 = acers2 + totacers2;
                        pchangep = (acers1 > 0) ? (acers / acers1) * 100 : 0;
                        if (histo != 0) {
                            this.compData.push({
                                "a1": acers1,
                                "a2": acers2,
                                "pchange": pchangep,
                                text: this.currentgeography.labels[i + ""],
                                "y": acers,
                                tooltip: i + "",
                                fill: outcolor,
                                stroke: {
                                    color: "rgb(255,255,255)"
                                }
                            })
                            outable = outable + "<tr style='background:" + outcolor + "'><td style='font-size:12px;width:10%;color:" + textColor + "'>" + i + "</td><td style='font-size:12px;width:60%;color:" + textColor + "'>" + this.currentgeography.labels[i + ""] + "</td><td style='font-size:12px;width:10%;text-align: center;color:" + textColor + "'>" + acers2.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + "</td><td style='font-size:12px;width:10%;text-align: center;color:" + textColor + "'>" + acers.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + "</td><td style='font-size:12px;width:10%;text-align: center;color:" + textColor + "'>" + parseInt(pchangep.toString()) + "</td></tr>"
                            boxes = boxes + '<rect x="0" y ="' + (count * 30) + '" width="30" height="20" style="fill:' + outcolor + ';stroke-width:1;stroke:' + outcolor + '" />'
                            texts = texts + '<text x="35" y="' + (((count + 1) * 30) - 15) + '" fill="black">' + this.currentgeography.labels[i + ""] + '</text>'
                            count = count + 1;
                        }
                    }));
                    pchanget = (totacers1 / totacers2) * 100
                    outable = outable + "<tr style='border-top: double #000;background:#FFF'><td style='font-size:12px;width:10%;color:#000'></td><td style='font-size:12px;width:60%;color:#000'>" + "Totals" + "</td><td style='font-size:12px;width:10%;text-align: center;color:#000'>" + totacers2.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + "</td><td style='font-size:12px;width:10%;text-align: center;color:#000'>" + totacers1.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + "</td><td style='font-size:12px;width:10%;text-align: center;color:#000'>" + parseInt(pchanget.toString()) + "</td></tr>"
                    outable = "<center><table style='border:1px solid black'>" + outable + "</table></center>"
                    this.compData.reverse();
                    console.log(this.compData);
                    newnode = domConstruct.create("span", {
                        innerHTML: outable
                    });
                    this.comptableareacontent.appendChild(newnode);
                    this.compchart = new Chart(this.compchartareacontent);
                    this.compchart.addPlot("default", {
                        type: "Bars",
                        font: "normal normal 11pt Tahoma",
                        fontColor: "black",
                        htmlLabels: false
                    })
                    this.compchart.addAxis("y", {
                        fixLower: "major",
                        fixUpper: "major",
                        leftBottom: false
                    })
                    this.compchart.addPlot("Grid", {
                        type: Grid,
                        vAxis: "y",
                        htmlLabels: false,
                        hMajorLines: true,
                        hMinorLines: false,
                        vMajorLines: true,
                        vMinorLines: false
                    });
                    this.compchart.addSeries("Series A", this.compData);
                    this.compchart.connectToPlot("default", lang.hitch(this, function(evt) {
                        type = evt.type;
                        shape = evt.shape;
                        if (type == "onmouseover") {
                            // Store the original color
                            if (!shape.originalFill) {
                                shape.originalFill = shape.fillStyle;
                                shadeRGBColor = function(color, percent) {
                                    color = "rgb(" + color.r + "," + color.g + "," + color.b + ")";
                                    f = (color + "").split(","), t = percent < 0 ? 0 : 255, p = percent < 0 ? percent * -1 : percent, R = parseInt(f[0].slice(4)), G = parseInt(f[1]), B = parseInt(f[2]);
                                    return "rgb(" + (Math.round((t - R) * p) + R) + "," + (Math.round((t - G) * p) + G) + "," + (Math.round((t - B) * p) + B) + ")";
                                }
                                shape.altFill = shadeRGBColor(shape.originalFill, 0.30)
                            }
                            shape.setFill(shape.altFill);
                            domConstruct.empty(this.compchartinfo);
                            //console.log(evt.index)
                            newnode = domConstruct.create("span", {
                                innerHTML: this.compData[evt.index].text + ": " + this.compData[evt.index].a2 + " Acres Total <br> Change From Current: " + parseInt(this.compData[evt.index].y) + " Acres / " + parseInt(this.compData[evt.index].pchange) + "%"
                            });
                            this.compchartinfo.appendChild(newnode);
                        }
                        if (type == "onmouseout") {
                            // Set the fill the original fill
                            shape.setFill(shape.originalFill);
                            domConstruct.empty(this.compchartinfo);
                            newnode = domConstruct.create("span", {
                                innerHTML: "Mouse over chart for values <br> Scroll Down to see Table"
                            });
                            this.compchartinfo.appendChild(newnode);
                        }
                    }));
                    this.compchart.render();
                    //this needs fix'n
                    /*
					//domConstruct.empty(this.compchartareacontent);
					//domConstruct.empty(this.tableareacontent);
		
					//newnode = domConstruct.create("span", {innerHTML: "HI"});
					//this.comppane.appendChild(newnode);
	
					// Define the data
					var chartData = [10000,9200,11811,12000,7662,13887,14200,12222,12000,10009,11288,12099];
				 
					console.log('ddd');
					console.log(this.comppane);
					// Create the chart within it's "holding" node
					this.compchart = new Chart(this.compchartareacontent);
				    
					// Add the only/default plot
					this.compchart.addPlot("default", {
						type: "Bars",
						markers: true,
						gap: 5
					});
				 
					// Add axes
					this.compchart.addAxis("x");
					this.compchart.addAxis("y", { vertical: true, fixLower: "major", fixUpper: "major" });
				 
					// Add the series of data
					this.compchart.addSeries("Monthly Sales",chartData);
				 
					// Render the chart!
					this.compchart.render();
					*/
                    console.log('done');
                } else {
                    array.forEach(this.varsliders, lang.hitch(this, function(slider, i) {
                        //console.log("&&&&&&&&&&&&", slider);
                        //if (i < this.varsliders.length-1) {
                        if (slider["data-intialCon"] == false) {
                            slider.setDisabled(true);
                        }
                    }));
                }
            },
            applyFilter: function() {
                var rasterFunction = new RasterFunction(
                    {
                        "rasterFunction": "Colormap",
                        "rasterFunctionArguments": {
                            "Colormap": this.currentgeography.colormap,
                            "Raster": {
                                "rasterFunction": "Remap",
                                "rasterFunctionArguments": {
                                    "NoDataRanges": this.currentExclude,
                                    "Raster": {
                                        "rasterFunction": "Clip",
                                        "rasterFunctionArguments": {
                                            "ClippingGeometry": this.clippingGeometry.toJson(),
                                            "ClippingType": 1
                                        },
                                        "outputPixelType": "U8",
                                        "variableName": "Raster"
                                    }
                                },
                                "outputPixelType": "U8"
                            }
                        },
                        "outputPixelType": "U8"
                    }
                );
                ext = this.clippingGeometry.getExtent();
                if (ext.getHeight() > ext.getWidth()) {
                    cv = ext.getHeight();
                } else {
                    cv = ext.getWidth();
                }
                cvm = parseInt(cv / 3000) + 1;
                if (cvm > this.currentgeography.cellsize) {
                    //insertWarning and round
                    this.WarningTextTag.innerHTML = "Warning: The area that is currently defined is very large and some rounding will take place in the calculations for the values shown in the results and compare tabs.  Defining a smaller area will result in less rounding."
                    console.log("Warning");
                } else {
                    this.WarningTextTag.innerHTML = ""
                    //cvm = this.currentgeography.cellsize 
                    console.log("No Warning")
                }
                geo = dJson.toJson(this.clippingGeometry);
                mr = dJson.toJson(this.mainLayer.mosaicRule);
                rr = dJson.toJson(rasterFunction);
                this.icresults = undefined;
                if (this.icmr != undefined) {
                    tmr = dJson.toJson(this.icmr);
                    if (tmr != mr) {
                        computeHistogramsIC = esriRequest({
                            url: this.currentgeography.url + "/computeHistograms",
                            content: {
                                geometry: geo,
                                geometryType: "esriGeometryPolygon",
                                f: "json",
                                mosaicRule: tmr,
                                pixelSize: '{"x": ' + cvm + ', "y": ' + cvm + '}',
                                renderingRule: rr
                            },
                            callbackParamName: "callback",
                            handleAs: "json"
                        });
                        computeHistogramsIC.then(lang.hitch(this, function(results) {
                            this.icresults = results;
                            a = lang.hitch(this, this.makeDiffCharts);
                            a();
                        }))
                    }
                }
                computeHistograms = esriRequest({
                    url: this.currentgeography.url + "/computeHistograms",
                    content: {
                        geometry: geo,
                        geometryType: "esriGeometryPolygon",
                        f: "json",
                        mosaicRule: mr,
                        pixelSize: '{"x": ' + cvm + ', "y": ' + cvm + '}',
                        renderingRule: rr
                    },
                    callbackParamName: "callback",
                    handleAs: "json"
                });
                this.regresults = undefined;
                computeHistograms.then(lang.hitch(this, function(results) {
                    if (this.isClipped == false) {
                        clipmes = "Full Extent"
                    } else {
                        clipmes = "User-defined Polygon Extent"
                    };
                    this.ctitle = this.currentgeography.name + " - " + clipmes + "<br>" + this.subTitle;
                    this.currentData = []
                    outable = "<tr style='background:" + "#fff" + "'><td style='width:21%'>" + "Code" + "</td><td style='width:60%'>" + "Name" + "</td><td style='width:20%'>" + "Area (Acres)" + "</td></tr>"
                    this.totalarea = 0;
                    boxes = ""
                    texts = ""
                    count = 0
                    array.forEach(results.histograms[0].counts, lang.hitch(this, function(histo, i) {
                        array.forEach(this.currentgeography.colormap, lang.hitch(this, function(ccolormap, c) {
                            if (ccolormap[0] == i) {
                                outcolor = "rgb(" + ccolormap[1] + "," + ccolormap[2] + "," + ccolormap[3] + ")"
                                brightness = ((ccolormap[1] * 299) + (ccolormap[2] * 587) + (ccolormap[3] * 114)) / 1000;
                                if (brightness > 150) {
                                    textColor = "#000";
                                } else {
                                    textColor = "#fff";
                                }
                            }
                        }));
                        acers = ((histo * (cvm * cvm) * 0.000247105) * ((cvm * this.corSlope) + this.corIntercept))
                        rac = acers
                        if (acers < 1) {
                            acers = "<1"
                        } else {
                            acers = Math.round(acers)
                        }
                        this.currentData.push({
                            text: "",
                            y: rac,
                            tooltip: i + "",
                            fill: outcolor,
                            stroke: {
                                color: "rgb(255,255,255)"
                            }
                        })
                        this.totalarea = rac + this.totalarea;
                        if (histo != 0) {
                            outable = outable + "<tr style='background:" + outcolor + "'><td style='width:21%;color:" + textColor + "'>" + i + "</td><td style='width:60%;color:" + textColor + "'>" + this.currentgeography.labels[i + ""] + "</td><td style='width:20%;color:" + textColor + "'>" + acers.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + "</td></tr>"
                            boxes = boxes + '<rect x="0" y ="' + (count * 30) + '" width="30" height="20" style="fill:' + outcolor + ';stroke-width:1;stroke:' + outcolor + '" />'
                            texts = texts + '<text x="35" y="' + (((count + 1) * 30) - 15) + '" fill="black">' + this.currentgeography.labels[i + ""] + '</text>'
                            count = count + 1;
                        }
                    }));
					console.log(this.currentData);
                    this.totalarea = Math.round(this.totalarea);
                    if (this.totalarea < 1) {
                        taout = "<1"
                    } else {
                        taout = this.totalarea.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                    }
                    outable = outable + "<tr style='border-top: double #000;background:#FFF'><td style='font-size:12px;width:10%;color:#000'></td><td style='width:60%;color:#000'>" + "Totals" + "</td><td style='font-size:12px;width:10%;color:#000'>" + taout + "</td></tr>"
                    outable = "<center><table style='border:1px solid black'>" + outable + "</table></center>"
                    //this.legendContainer.innerHTML = this.toolbarName;
                    domConstruct.empty(this.legendContainer);
                    hit = 30 + (count * 28)
                    this.legendContainer.innerHTML = '<div style="margin-bottom:7px">' + _legendName + '</div><svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="500" height="' + hit + '">' + boxes + texts + '</svg>'
					
                    //domConstruct.empty(this.chartareacontent);
                    domConstruct.empty(this.tableareacontent);
                    //html.set(this.tableareacontent, "I was set!");
                    newnode = domConstruct.create("span", {
                        innerHTML: outable
                    });
                    this.tableareacontent.appendChild(newnode);
                    console.log(this.chart);
                    dojo.style(this.chartareacontent, "display", "block");
                    if (!this.chart) {
						this.chart = new Chart(this.chartareacontent, {
							margins: {t:0, l:0, b:0, r:0}
						});
						this.chart.addPlot("default", {
								type: Pie,
								font: "normal normal 11pt Tahoma",
								fontColor: "black",
								labelOffset: -30,
								radius: 135
							}).addSeries("Series A", this.currentData);
						this.chart.connectToPlot("default", lang.hitch(this, function(evt) {
							type = evt.type;
							shape = evt.shape;
							if (type == "onmouseover") {
								// Store the original color
								if (!shape.originalFill) {
									shape.originalFill = shape.fillStyle;
									shadeRGBColor = function(color, percent) {
										color = "rgb(" + color.r + "," + color.g + "," + color.b + ")";
										f = (color + "").split(","), t = percent < 0 ? 0 : 255, p = percent < 0 ? percent * -1 : percent, R = parseInt(f[0].slice(4)), G = parseInt(f[1]), B = parseInt(f[2]);
										return "rgb(" + (Math.round((t - R) * p) + R) + "," + (Math.round((t - G) * p) + G) + "," + (Math.round((t - B) * p) + B) + ")";
									}
									shape.altFill = shadeRGBColor(shape.originalFill, 0.30)
								}
								shape.setFill(shape.altFill);
								domConstruct.empty(this.chartinfo);
								newnode = domConstruct.create("span", {
									innerHTML: this.currentgeography.labels[evt.x + ""] + ": " + Math.round(evt.y).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " acres (" + (parseInt((evt.y / this.totalarea) * 100)) + " %)"
								});
								this.chartinfo.appendChild(newnode);
							}
							if (type == "onmouseout") {
								// Set the fill the original fill
								shape.setFill(shape.originalFill);
								domConstruct.empty(this.chartinfo);
								newnode = domConstruct.create("span", {
									innerHTML: this.ctitle + "<br>Mouse Over Chart for Information -- Scroll Down to see Table"
								}); // + this.warning
								this.chartinfo.appendChild(newnode);
							}
						}));
					} else {
						this.chart.updateSeries("Series A",this.currentData);	
					}
                    this.chart.render();
					this.chart.resize(400, 350);
                    //var legendTwo = new Legend({chart: chartTwo}, "legendTwo");
                    domConstruct.empty(this.chartinfo);
                    newnode = domConstruct.create("span", {
                        innerHTML: this.ctitle + "<br>Mouse Over Chart for Information -- Scroll Down to see Table"
                    });
                    this.chartinfo.appendChild(newnode);
                    this.regresults = results;
                    a = lang.hitch(this, this.makeDiffCharts);
                    a();
                }), function(b) {
                    console.log('ERROR');
                    console.log(b)
                });
                //parser.parse();
                this.mainLayer.setRenderingRule(rasterFunction);
                //console.log(this.currentData);
            },
            modifyFilter: function(data) {
                /*		   if (typeof geometry == 'boolean') {
                				//alert('hi');
                				
                				//ext = new Extent(this.currentgeography.extent)
                				//geometry = ext.toPolygon();
                				ext = this.currentgeography.extent
                				
                				polygonJson  = {"rings":[[[ext.xmin,ext.ymin],[ext.xmin,ext.ymax],[ext.xmax,ext.ymax],[ext.xmax,ext.ymin],[ext.xmin,ext.ymin]]],"spatialReference":this.currentgeography.extent.spatialReference};
                				geometry = new Polygon(polygonJson);
                				
                	//			alert('');
                		   };
                		   
                		 */
                //this.drawtoolbar.deactivate();
                //perhaps save shape
                geometry = data.shape;
                this.clippingGeometry = geometry;
                this.isClipped = true;
                var simpleJson = {
                    "type": "esriSFS",
                    "style": "esriSFSSolid",
                    "color": [115, 76, 0, 255],
                    "outline": {
                        "type": "esriSLS",
                        "style": "esriSLSSolid",
                        "color": [110, 110, 110, 255],
                        "width": 1
                    }
                }
                symbol = new SimpleFillSymbol(simpleJson);
                this.applyFilter();
                ext = geometry.getExtent();
                //this.map.setExtent(ext);	
            },
            setup: function(response) {
                console.log("Success: ", response);
                this.layerlist = {};
                array.forEach(response.layers, lang.hitch(this, function(layer, i) {
                    layerSplit = layer.name.split("__")
                    this.layerlist[layer.name] = layer.id;
                    array.forEach(layerSplit, lang.hitch(this, function(cat, i) {
                        cgi = this.groupindex[i]
                        if (this.controls[cgi].options == undefined) {
                            this.controls[cgi].options = [];
                            makedefault = true;
                        } else {
                            makedefault = false;
                        }
                        withingroup = false;
                        array.forEach(this.controls[cgi].options, lang.hitch(this, function(opts, i) {
                            if (opts.value == cat) {
                                withingroup = true;
                            }
                        }));
                        if (withingroup == false) {
                            newoption = {};
                            newoption.text = cat;
                            newoption.selected = makedefault;
                            newoption.value = cat;
                            this.controls[cgi].options.push(newoption)
                        }
                    }));
                }));
            },
            updateMap: function() {
                outvalues = [];
                array.forEach(this.controls, lang.hitch(this, function(entry, orderid) {
                    if (entry.type == "group") {
                        array.forEach(entry.options, lang.hitch(this, function(option, i) {
                            if (option.selected == true) {
                                //need to put code to build here
                                if (option.enabled) {
                                    outvalues.push(option.value)
                                };
                            }
                        }));
                    }
                }));
                layertoAdd = this.layerlist[outvalues.join("__")];
                x = 0;
                while (layertoAdd == undefined) {
                    outvalues = outvalues.slice(0, outvalues.length - 1)
                    layertoAdd = this.layerlist[outvalues.join("__")];
                    x = x + 1
                    if (x > 9999) {
                        layertoAdd = "None"
                    }
                }
                console.log(layertoAdd);
                slayers = [];
                slayers.push(layertoAdd);
                //this.currentLayer.setVisibility(true);
                this.currentLayer.setVisibleLayers(slayers)
            },
            updateUnique: function(val, group) {
                console.log(val);
                array.forEach(this.controls[group].options, lang.hitch(this, function(option, i) {
                    option.selected = false;
                }));
                this.controls[group].options[val].selected = true;
                //console.log(this.controls);
                this.findInvalids();
                this.updateMap();
            },
            findInvalids: function() {
                clist = [];
                array.forEach(this.groupindex, lang.hitch(this, function(cat, cgi) {
                    ccontrol = this.controls[cat]
                    okvals = [];
                    needtoChange = false;
                    array.forEach(ccontrol.options, lang.hitch(this, function(option, i) {
                        if (option.selected == true) {
                            clist.push(option.value)
                        }
                        tlist = clist.slice(0, cgi);
                        tlist.push(option.value);
                        checker = tlist.join("__");
                        enabled = false
                        for (key in this.layerlist) {
                            n = key.indexOf(checker);
                            if (n == 0) {
                                enabled = true;
                            }
                        }
                        option.enabled = enabled;
                        cdom = dom.byId(this.sliderpane.id + "_lvoption_" + cat + "_" + i)
                        if (enabled) {
                            domStyle.set(cdom, "color", "#000")
                            okvals.push(i);
                        } else {
                            domStyle.set(cdom, "color", "#bbb")
                        }
                        if ((enabled == false) && (option.selected == true)) {
                            needtoChange = true;
                        }
                    }));
                    if ((needtoChange == true) && (okvals.length > 0)) {
                        if (ccontrol.control == "slider") {
                            cwidget = registry.byId(this.sliderpane.id + "_slider_" + cat)
                            cwidget.set('value', okvals[0]);
                        } else {
                            //cwidgets = registry.findWidgets(ccontrol.node)
                            cwidget = registry.byId(this.sliderpane.id + "_radio_" + cat + "_" + okvals[0])
                            cwidget.set('value', true);
                        }
                        //alert('changeit');
                    }
                }));
            },
            zoomToActive: function() {
                if (this.isClipped == true) {
                    ext = this.clippingGeometry.getExtent();
                } else {
                    ext = new Extent(this.currentgeography.extent);
                }
                this.map.setExtent(ext, true);
            },
            changeOpacity: function(e) {
                if (e != undefined) {
                    this.translevel = e;
                } else {
                    this.translevel = 0;
                }
                this.mainLayer.setOpacity(1 - this.translevel);
            },
            viewChart: function() {
                console.log(this.currentData);
                domStyle.set(this.chartArea.domNode, 'display', '');
            },
            render: function() {
                a = dojoquery(this.container).parent();
                domStyle.set(this.container, 'overflow', 'visible');
                this.zoomerNode = domConstruct.create("div");
                dom.byId(this.container).appendChild(this.zoomerNode);
                this.infoarea = new ContentPane({
					class:"infoarea",
                    style: "z-index:10000; !important;position:absolute !important;left:50px !important;top:20px !important;width:" + _helpWidth + " !important;background-color:#FFF !important;padding:10px !important;border-style:solid;border-width:4px;border-color:#444;border-radius:5px;display: none",
                    innerHTML: "<div class='infoareacloser' style='float:right !important'><a href='#'>✖</a></div><div class='infoareacontent' style='padding-top:15px'>no content yet</div>"
                });
                dom.byId(a[0]).appendChild(this.infoarea.domNode)
                ina = dojoquery(this.infoarea.domNode).children(".infoareacloser");
                this.infoAreaCloser = ina[0];
                inac = dojoquery(this.infoarea.domNode).children(".infoareacontent");
                this.infoareacontent = inac[0];
                on(this.infoAreaCloser, "click", lang.hitch(this, function(e) {
                    domStyle.set(this.infoarea.domNode, 'display', 'none');
                }));
                this.chartArea = new ContentPane({
                    class: "chartArea",
					style: "overflow:hidden;z-index:10000; !important;position:absolute !important;left:310px !important;top:20px !important;width:430px !important;background-color:#FFF !important;padding:10px !important;border-style:solid;border-width:4px;border-color:#444;border-radius:5px;display: none",
                    innerHTML: "<div class='chartareacloser' style='float:right !important'><a href='#'>✖</a></div><div class='chartareacontent'>n</div>"
                });
                dom.byId(a[0]).appendChild(this.chartArea.domNode)
                ina = dojoquery(this.chartArea.domNode).children(".chartareacloser");
                this.ChartAreaCloser = ina[0];
                inac = dojoquery(this.chartArea.domNode).children(".chartareacontent");
                this.chartareacontent = inac[0];
                on(this.ChartAreaCloser, "click", lang.hitch(this, function(e) {
                    domStyle.set(this.chartArea.domNode, 'display', 'none');
                }));
                
				this.tabpan = new TabContainer({
                    class:"tabpan"
					//style: "height: 100%; width: 100%;"
                });
				
                this.mainpane = new ContentPane({
                    class: "mainpane",
					style: "width: 100%;",
                    title: "Choose Parameters",
                    index: 0
                });
                this.chartpane = new ContentPane({
                    class: "chartpane",
					style: "width: 100%;",
                    title: "Results & Chart",
                    index: 1,
                    innerHTML: "<div class='charttitler'></div><div sytle='z-index:2000' class='chartinfo'>Mouse Over Chart for Information -- Scroll Down to see Table</div><div class='chartareacontenter'></div><div class='tableareacontenter'></div>"
                });
                //parser.parse();
                dom.byId(this.container).appendChild(this.tabpan.domNode);
                this.tabpan.addChild(this.mainpane);
                this.tabpan.addChild(this.chartpane);
                
				aspect.after(this.tabpan, "selectChild", lang.hitch(this, function(e, o) {
                    this.selindex = o[0].index;
                    this.resize();
                }));
                this.tabpan.startup();
                //dom.byId(this.container).appendChild(this.mainpane.domNode);
                //parser.parse();
				
				this.spinnerURL = localrequire.toUrl("./images/spinner.gif");
                this.refreshnode = domConstruct.create("div", {
                    class: "refreshNode",
					style: "position:absolute; display:none; z-index: 100000; width:100%; height:100%;"
                });
				this.tabpan.domNode.appendChild(this.refreshnode);
                
				var spinnernode = domConstruct.create("div", {
                    style: "background: url(" + this.spinnerURL + ") no-repeat center center; height: 32px; width: 32px; position:absolute; top:50%; left:50%; "
                });
                this.refreshnode.appendChild(spinnernode);

                inac = dojoquery(this.chartpane.domNode).children(".chartareacontenter");
                this.chartareacontent = inac[0];
                inac = dojoquery(this.chartpane.domNode).children(".tableareacontenter");
                this.tableareacontent = inac[0];
                inac = dojoquery(this.chartpane.domNode).children(".charttitler");
                this.charttitle = inac[0];
                inac = dojoquery(this.chartpane.domNode).children(".chartinfo");
                this.chartinfo = inac[0];
                this.buttonpane = new ContentPane({
                    class: "buttonpane",
					style: "position:relative;border:1px solid #ddd !important; height:100px;overflow: hidden !important;background-color:#F3F3F3 !important;padding:10px !important; display: none"
                })
                dom.byId(this.container).appendChild(this.buttonpane.domNode);
                nslidernodetitle = domConstruct.create("span", {
                    innerHTML: " Layer Properties: " //,
					//style: "position: relative;top: 70px;"
                });
                this.buttonpane.domNode.appendChild(nslidernodetitle);
                
				zoombutton = domConstruct.create("a", {
                    class: "pluginLayer-extent-zoom",
                    href: "#",
                    title: "Zoom to Extent"
                });
                this.buttonpane.domNode.appendChild(zoombutton);
                on(zoombutton, "click", lang.hitch(this, this.zoomToActive));
                nslidernode = domConstruct.create("span", {
                    style: "margin-left:10px !important"
                });
                this.buttonpane.domNode.appendChild(nslidernode);
                //myButton = new Button({
                //	label: "Chart",
                //	onClick: lang.hitch(this,this.viewChart)
                //}, nslidernode);
                nslidernode = domConstruct.create("div");
                this.buttonpane.domNode.appendChild(nslidernode);
                labelsnode = domConstruct.create("ol", {
                    "data-dojo-type": "dijit/form/HorizontalRuleLabels",
                    container: "bottomDecoration",
                    style: "",
                    innerHTML: "<li>Opaque</li><li>Clear</li>"
                })
                nslidernode.appendChild(labelsnode);
                slider = new HorizontalSlider({
                    value: this.translevel,
                    minimum: 0,
                    maximum: 1,
                    showButtons: false,
                    title: "Change the layer transparency",
                    //intermediateChanges: true,
                    //discreteValues: entry.options.length,
                    onChange: lang.hitch(this, this.changeOpacity),
                    style: "width:210px;margin-left:10px;bottom:25px;position: relative;left: 130px;top: -15px;"
                }, nslidernode);
                parser.parse()
                this.methodsButton = new Button({
                    label: "Methods Button",
                    style: "position: absolute; right:10px; bottom:10px !important;",
                    onClick: lang.hitch(this, function() {
                        window.open(this.currentgeography.methods.url)
                    }) //function(){window.open(this.configVizObject.methods)}
                });
                this.buttonpane.domNode.appendChild(this.methodsButton.domNode);
                domStyle.set(this.methodsButton.domNode, "display", "none");
                this.ButtonsLocation = domConstruct.create("span", {
                    style: "float:right"
                });
                this.buttonpane.domNode.appendChild(this.ButtonsLocation);
                this.resize();
            },
            //identify: function(mapPoint, clickPoint, processResults) {
            //var text = "You clicked on latitude " + mapPoint.getLatitude() + " longitude " + mapPoint.getLongitude(),
            //    identifyWidth = 300;
            //processResults(text, identifyWidth);
            //},
            showHelp: function() {
                helpDialog = new Dialog({
                    title: "My Dialog",
                    content: "Test content.",
                    style: "width: 300px"
                });
                helpDialog.show();
            },
            getState: function() {
                state = new Object();
                state.geo = this.currentgeography;
                state.trans = this.translevel;
                state.selindex = this.selindex;
                state.shape = this.clippingGeometry.toJson();
                return state;
            },
            setState: function(state) {
                this.stateRestore = true;
                this.currentgeography = state.geo;
                this.translevel = state.trans;
                this.selindex = state.selindex;
                this.clippingGeometry = geometryJsonUtils.fromJson(state.shape);
            },
            subregionActivated: function(subregion) {
                this.usableRegions = new Array();
                array.forEach(this.configVizObject, lang.hitch(this, function(region, i) {
                    if (region.name == subregion.id) {
                        this.usableRegions.push(region);
                    }
                }));
                domConstruct.empty(this.regionChooserContainer);
                this.rebuildOptions(this.usableRegions);
                this.doZoom = false;
            },
            subregionDeactivated: function(subregion) {
                domConstruct.empty(this.regionChooserContainer);
                this.rebuildOptions(this.configVizObject);
                this.doZoom = true;
            }
        });
    });
