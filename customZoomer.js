define([
    "dojo/_base/declare",
    "dojo/_base/array",
    "dojo/_base/lang",
    "dojo/dom-construct",
    "dijit/DropDownMenu",
    "dijit/form/DropDownButton",
    "dijit/MenuItem",
    "dojo/dom-class",
    "dojo/dom-style",
    "esri/tasks/query",
    "esri/tasks/QueryTask",
    "esri/graphicsUtils",
    "dojo/Evented",
    "dojo/dom"
], function(
    declare,
    array,
    lang,
    domConstruct,
    DropDownMenu,
    DropDownButton,
    MenuItem,
    domClass,
    domStyle,
    Query,
    QueryTask,
    graphicsUtils,
    Evented,
    dom
) {
    return declare([Evented], {
        url: "https://services2.coastalresilience.org/arcgis/rest/services/New_Jersey/RestorationExplorer/MapServer/0",
        allquery: "FutHabitat = 'Y'",
        fields: [{
            value: "COUNTY",
            name: "County"
        }, {
            value: "MUN",
            name: "Municipality"
        }, {
            value: "MUN_CODE",
            name: "Municipality Code"
        }],
        linkdata: {
            text: "Municipal Summary",
            link: " http://54.175.241.254/snapshot/#/process?action=tncmm&",
            field: "MUN_CODE"
        },
        constructor: function(args) {
            tfields = new Array();
            array.forEach(this.fields, lang.hitch(this, function(entry, i) {
                tfields.push(entry.value);
            }));
            query = new Query();
            //alert(this.url);
            queryTask = new QueryTask(this.url);
            query.where = this.allquery;
            query.returnGeometry = true;
            query.outFields = tfields;
            query.orderByFields = tfields;
            queryTask.execute(query, lang.hitch(this, this.returnedData));
            declare.safeMixin(this, args);
        },
        returnedData: function(data) {
            console.log("RETURNED");
            //console.log(data);
            this.data = data;
        },
        njZoomer: function(domel, map) {
            this.map = map;
			this.domel = domel;
			domClass.add(domel, "subRegionNode");
            menu = new DropDownMenu({
                style: "display: none;"
            });
            domClass.add(menu.domNode, "cr-dojo-dijits");
            if (this.data == undefined) {
                //settimout
            }
            this.njcounties = new Array();
            this.njsubs = new Object();
            array.forEach(this.data.features, lang.hitch(this, function(entry, i) {
                cf = entry.attributes[this.fields[0].value];
                if (array.indexOf(this.njcounties, cf) == -1) {
                    this.njcounties.push(cf)
                    this.njsubs[cf] = new Array();
                }
                this.njsubs[cf].push({
                    name: entry.attributes[this.fields[1].value],
                    shape: entry.geometry,
                    data: entry.attributes
                })
            }));
            array.forEach(this.njcounties, lang.hitch(this, function(entry, i) {
                var plugin = this;
                menuItem1 = new MenuItem({
                    label: entry,
                    onClick: function(e) {
                        plugin.changeCounty(entry);
                        domStyle.set(this.getParent()._popupWrapper, {
                            "display": "none",
                            "z-index": 100000
                        });
                    }
                });
                menu.addChild(menuItem1);
            }));
            this.countybutton = new DropDownButton({
                class:"countybutton",
				label: "Choose a " + this.fields[0].name,
                style: "margin-bottom:6px !important",
                onMouseDown: function(evt) {
                    var widget = this;
                    window.setTimeout(function() {
                        if (!_.isUndefined(widget.dropDown._popupWrapper)) {
                            domStyle.set(widget.dropDown._popupWrapper, {
                                "display": "block",
                                "z-index": 100000
                            })
                        }
                    }, 100)
                },
                onBlur: function() {
                    var widget = this;
                    if (!_.isUndefined(widget.dropDown._popupWrapper)) {
                        domStyle.set(widget.dropDown._popupWrapper, "display", "none");
                    }
                },
                dropDown: menu
            });
            domel.appendChild(this.countybutton.domNode);
            this.subelement = domConstruct.create("span");
            domel.appendChild(this.subelement);
            this.linkEl = domConstruct.create("span");
            domel.appendChild(this.linkEl);
        },
        changeCounty: function(county) {
            this.countybutton.set("label", county);
            domConstruct.empty(this.subelement);
            menu = new DropDownMenu({
                style: "display: none;"
            });
            domClass.add(menu.domNode, "cr-dojo-dijits");
            subs = this.njsubs[county];
            array.forEach(subs, lang.hitch(this, function(entry, i) {
                var plugin = this;
                menuItem1 = new MenuItem({
                    label: entry.name,
                    //iconClass:"dijitEditorIcon dijitEditorIconSave",
                    onClick: function(e) {
                        plugin.changeMun(entry);
                        domStyle.set(this.getParent()._popupWrapper, {
                            "display": "none",
                            "z-index": 100000
                        });
                    }
                });
                menu.addChild(menuItem1);
            }));
            this.munBun = new DropDownButton({
                class:"munBun",
				label: "Choose a " + this.fields[1].name,
                style: "margin-bottom:6px !important",
                onMouseDown: function(evt) {
                    var widget = this;
                    window.setTimeout(function() {
                        if (!_.isUndefined(widget.dropDown._popupWrapper)) {
                            domStyle.set(widget.dropDown._popupWrapper, {
                                "display": "block",
                                "z-index": 100000
                            })
                        }
                    }, 100)
                },
                onBlur: function() {
                    var widget = this;
                    if (!_.isUndefined(widget.dropDown._popupWrapper)) {
                        domStyle.set(widget.dropDown._popupWrapper, "display", "none");
                    }
                },
                dropDown: menu
            });
            this.subelement.appendChild(this.munBun.domNode);
            this.linkEl.innerHTML = "";
        },
        changeMun: function(mun) {
            console.log(mun);
            this.munBun.set("label", mun.name);
            this.map.setExtent(mun.shape.getExtent());
            this.emit("zoomed", mun.shape);
            this.linkEl.innerHTML = " <a target='_blank' href='" + this.linkdata.link + "mun_code=" + mun.data[this.linkdata.field] + "'>" + this.linkdata.text + "</a>";
        }
    });
});
