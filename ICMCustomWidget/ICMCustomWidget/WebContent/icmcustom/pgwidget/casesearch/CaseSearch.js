define(["dojo/_base/declare", "icm/action/Action", "dojo/dom-style",
        "dijit/form/Button",
        "dojo/_base/lang", "dojo/_base/array",
        "dojo/parser", "dojox/grid/cells",
        "dijit/ToolbarSeparator", "icm/util/Coordination",
        "ecm/widget/dialog/BaseDialog",
        "ecm/widget/FilteringSelect",
        "dojox/grid/_CheckBoxSelector",
        "dojox/grid/DataGrid",
        "dojox/grid/cells/dijit", "dojo/data/ItemFileWriteStore",
        "dijit/dijit", "dijit/form/TextBox", "dojo/date", "dijit/form/DateTextBox",
        "dijit/layout/TabContainer", "dijit/layout/ContentPane",
        "pvr/widget/Layout",
        "dojo/dom-construct", "dijit/Toolbar",
        "pvr/widget/PropertyTable", "dojo/dom-class",
        "dojo/data/ObjectStore",
        "dojo/store/Memory", "gridx/modules/CellWidget",
        "gridx/modules/dnd/Row", "gridx/modules/Sort",
        "dojo/aspect",
        "dojo/dom-attr", "dojo/request", "dojo/request/xhr", "dojo/dom", "dojo/on",
        "dojo/mouse",
        "icm/pgwidget/casesearch/dijit/CaseSearchContentPane",
        "icmcustom/action/ICMSearchExportAction",
        "dojo/data/ItemFileReadStore",
        "icm/util/SearchPayload",
        "icm/base/BasePageWidget",
        "ecm/model/AttributeDefinition",
        "icm/util/SearchUtil",
        "dojo/domReady!"
    ],

    function(declare, Action, domStyle, Button, lang,
        array, parser, cells, ToolbarSeparator,
        Coordination, BaseDialog, FilteringSelect, _CheckBoxSelector, DataGrid,
        cellsDijit, ItemFileWriteStore, dijit, TextBox, date, DateTextBox, TabContainer, ContentPane,
        Layout, domConstruct,
        Toolbar, PropertyTable, domClass, ObjectStore,
        Memory, CellWidget, Row, Sort, aspect,
        domAttr, request, xhr, dom, on, mouse, CaseSearchContentPane,
        ICMSearchExportAction,
        ItemFileReadStore,
        SearchPayload,
        BasePageWidget,
        AttributeDefinition,
        SearchUtil
    ) {

        /**
         * @name icm.pgwidget.casesearch.CaseSearch
         * @class Provides a widget that is used to render a Case search form 
         * @augments dijit._Widget
         */
        return declare("icmcustom.pgwidget.casesearch.CaseSearch", [BasePageWidget, CaseSearchContentPane], {
            /** @lends icm.pgwidget.casesearch.CaseSearch.prototype */


            postCreate: function() {

                this.logEntry("Case Search postCreate");
                this.inherited(arguments);
                this._searchPayload = new SearchPayload();
                this._searchUtil = new SearchUtil();
                aspect.after(this, "onClickSearchButton", lang.hitch(this, this._onClickSearchButton), true);
                aspect.after(this, "executeAdvancedSearch", lang.hitch(this, this._onAdvancedButtonClick), true);
                this.initialize();
                this.logExit("Case Search postCreate");
            },

            /**
             * Handler for icm.ClearContent event.
             */
            handleClearContent: function() {
                this.logEntry("Case Search handleClearContent");
                this.clearInputValue();
                this.logExit("Case Search handleClearContent");
            },

            /*
             * Retrieve quick search properties to construct the UI.
             */
            initialize: function() {
                this.logEntry("Case Search initialize");
                if (this.solution) {
                    this.solution.retrieveCaseTypes(dojo.hitch(this, this._retrieveCaseTypesComplete));
                } else {
                    this.searchDisabled = true;
                    this._getQuickSearchableProperties([]);
                }
                this.logExit("Case Search initialize");
            },

            _retrieveCaseTypesComplete: function(caseTypes) {
                if (!caseTypes || caseTypes.length == 0) {
                    this.searchDisabled = true;
                } else {
                    this.searchDisabled = false;
                }
                this.solution.retrieveAttributeDefinitions(dojo.hitch(this, "_getQuickSearchableProperties"));
            },

            _onClickSearchButton: function() {
                var payload = this.getQuickSearchData();
                payload.caseType = "";
                payload.objectStoreName = this.solution.getTargetOS().id;
                this.fireEvent(payload, null);
            },

            _onAdvancedButtonClick: function(search) {
                this.fireEvent(search, null);
            },

            fireEvent: function(search) {
            	var selectQueryString = "SELECT caseProperties,classDescription FROM LA_LoanProcessingCaseType WHERE ";
                var searchCondition = "";
            	if(search.anyCriteria==false)
				{
					var whereClause='';
					var selectQuery=selectQueryString;
					for(var i=0;i<search.searchCriteria.criterion.length;i++)
					{
						if(search.searchCriteria.criterion[i].dataType=="xs:timestamp")
						{
							if(search.searchCriteria.criterion[i].defaultValue[1]!=""){
								var date1 = new Date(search.searchCriteria.criterion[i].defaultValue[0]);
								var date2 = new Date(search.searchCriteria.criterion[i].defaultValue[1]);
								var date3 = date.add(date2, "day", 1);
								var beforeDate=	this.formatDate(date1);
								var afterDate=	this.formatDate(date3);
								whereClause=whereClause+' and '+search.searchCriteria.criterion[i].id+" > "+beforeDate+ " and " +search.searchCriteria.criterion[i].id+" < "+afterDate
							}
							else{
								var date1 = new Date(search.searchCriteria.criterion[i].value);
								var date2 = date.add(date1, "day", 1);
								var searchDate=	this.formatDate(date1);
								var afterDate=	this.formatDate(date2);
								whereClause=whereClause+' and '+search.searchCriteria.criterion[i].id+" > "+searchDate+ " and " +search.searchCriteria.criterion[i].id+" < "+afterDate
							}
						}
						else if(search.searchCriteria.criterion[i].dataType=="xs:integer")
							whereClause=whereClause+' and '+search.searchCriteria.criterion[i].id+" = "+search.searchCriteria.criterion[i].value
							else if(search.searchCriteria.criterion[i].id=="Creator")
								whereClause =whereClause+' and '+search.searchCriteria.criterion[i].id+" LIKE '"+search.searchCriteria.criterion[i].value.shortName+"'"
								else if(search.searchCriteria.criterion[i].dataType=="xs:boolean")
									whereClause =whereClause+' and '+search.searchCriteria.criterion[i].id+" = "+search.searchCriteria.criterion[i].value

									else
										whereClause =whereClause+' and '+search.searchCriteria.criterion[i].id+" LIKE '"+search.searchCriteria.criterion[i].value+"'"

					}

					whereClause=whereClause.replace('and',' ');

					var cequery =selectQuery+whereClause;
				}
				if (search.anyCriteria === undefined || search.anyCriteria === null) {

					if(search.searchCriteria.criterion[0].dataType=="xs:timestamp")
					{
						var date1 = new Date(search.searchCriteria.criterion[0].value);
						var date2 = date.add(date1, "day", 1);
						var searchDate=	this.formatDate(date1);
						var afterDate=	this.formatDate(date2);
						var cequery =selectQueryString+search.searchCriteria.criterion[0].id+" > "+searchDate+ " and " +search.searchCriteria.criterion[0].id+" < "+afterDate
					}
					else if(search.searchCriteria.criterion[0].dataType=="xs:integer")
					{
						var searchVal=search.searchCriteria.criterion[0].value;
						searchVal=searchVal.toLowerCase();
						if(searchVal == "null" || searchVal == "empty")
						{
							var cequery =selectQueryString+search.searchCriteria.criterion[0].id+" is null"
						}
						else{
							var cequery =selectQueryString+search.searchCriteria.criterion[0].id+" = "+search.searchCriteria.criterion[0].value
						}
					}
				
					else if(search.searchCriteria.criterion[0].id=="Creator")
					{
						var searchVal=search.searchCriteria.criterion[0].value;
						searchVal=searchVal.toLowerCase();
						if(searchVal == "null" || searchVal == "empty")
						{
							var cequery =selectQueryString+search.searchCriteria.criterion[0].id+" is null"
						}
						else{
							var cequery =selectQueryString+search.searchCriteria.criterion[0].id+" LIKE '"+search.searchCriteria.criterion[0].value.shortName+"'"
						}
					}
					else if(search.searchCriteria.criterion[0].dataType=="xs:boolean")
					{
						var searchVal=search.searchCriteria.criterion[0].value;
						searchVal=searchVal.toLowerCase();
						if(searchVal == "null" || searchVal == "empty")
						{
							var cequery =selectQueryString+search.searchCriteria.criterion[0].id+" is null"
						}
						else{
							var cequery =selectQueryString+search.searchCriteria.criterion[0].id+" = "+search.searchCriteria.criterion[0].value
						}
					}
					else
					{
						var searchVal=search.searchCriteria.criterion[0].value;
						searchVal=searchVal.toLowerCase();
						if(searchVal == "null" || searchVal == "empty")
						{
							var cequery =selectQueryString+search.searchCriteria.criterion[0].id+" is null"
						}
						else{
							var cequery =selectQueryString+search.searchCriteria.criterion[0].id+" LIKE '"+search.searchCriteria.criterion[0].value+"'"
						}
					}

					cequery=cequery;
				}

                var model = {
                	ceQuery: cequery,
                    CaseType: search.caseType,
                    ObjectStore: search.objectStoreName,
                    solution: this.solution,
                    criterions: search.searchCriteria.criterion,
                    andSearch: !search.anyCriteria,
                    isShowSummaryViewProperties: this.widgetProperties.isShowSummaryViewProperties
                }
                this._searchPayload.setModel(model);
                this.onExecute(model);
            },
            _getQuickSearchableProperties: function(propDefs) {
                var quickSearchProperties = [];
                this.searchViewPropDefs = this._constructSearchViewPropertyDefs(propDefs);
                this.allPropDefs = this._constructAllSearchablePropertyDefs(propDefs);

                if (this.searchViewPropDefs.length == 0) {
                    //If no Search Views exist in the solution, we include Case ID and Date Added in the dropdown.
                    dojo.forEach(icmglobal.wellKnownProperties.quickSearchWellKnowProperties, function(property) {
                        var attr = new AttributeDefinition({
                            id: property.name,
                            name: this.resourceBundle[property.name],
                            repositoryType: 'p8',
                            dataType: property.dataType,
                            format: property.format || "",
                            defaultValue: property.defaultValue || "",
                            valueRequired: property.valueRequired || false,
                            readOnly: property.readOnly || false,
                            hidden: property.hidden || false,
                            system: property.system,
                            settability: "",
                            allowedValues: property.validValues,
                            maxLength: property.maxEntry,
                            minLength: property.minEntry,
                            minValue: property.minValue,
                            maxValue: property.maxValue,
                            cardinality: property.cardinality || this._searchUtil.CARDINALITY.SINGLE,
                            choiceList: property.choiceList,
                            contentClass: null,
                            serachable: true,
                            nullable: property.nullable || true,
                            hasDependentAttributes: property.hasDependentAttributes || false,
                            formatDescription: property.description || "",
                            repository: this.solution.getTargetOS()
                        });
                        quickSearchProperties.push(attr);
                    }, this);
                } else {
                    quickSearchProperties = this.searchViewPropDefs;
                }

                var isSortAllowedOnCaseSearch = icmglobal.configProvider.isSortAllowedOnCaseSearch();
                if ((this.searchViewPropDefs.length == 0) || isSortAllowedOnCaseSearch == true) {
                    if (quickSearchProperties.length > 1) {
                        //the display order of the properties is the alphabetical order
                        quickSearchProperties.sort(function(a, b) {
                            return a.name.toUpperCase().localeCompare(b.name.toUpperCase());
                            //	return a.name < b.name ? -1 : 1;
                        });
                    }
                }

                var isShowUserSpecified = true;
                if (this.widgetProperties && this.widgetProperties.advancedSearchUserSpecifiedSelector == "hideUserSpecified") {
                    isShowUserSpecified = false;
                }
                this.setModel({
                    searchDisabled: this.searchDisabled,
                    quickSearchProperties: quickSearchProperties,
                    searchViewPropDefs: this.searchViewPropDefs,
                    allPropDefs: this.allPropDefs,
                    targetOS: this.solution.getTargetOS(),
                    solution: this.solution,
                    role: this.role,
                    isHideAdvancedButton: this.widgetProperties.isHideAdvancedButton,
                    isShowAllProperties: this.widgetProperties.isShowAllProperties,
                    enableFindMyCasesButton: this.widgetProperties.enableFindMyCasesButton,
                    isShowUserSpecified: isShowUserSpecified
                });

            },
            onExecute: function(model) {
            	const xlsx = require('xlsx');
            	var ceQuery = model.ceQuery;
            	var repository = ecm.model.desktop.getRepositoryByName(model.ObjectStore);
            	var resultsDisplay = ecm.model.SearchTemplate.superclass.resultsDisplay;
                resultsDisplay = [];
                var sortBy = "";
                var sortAsc = true;
            	var json = '{' + resultsDisplay + '}';
                var json = JSON.parse(json);
                var propData = {
                    items: []
                };
                this.htmlTemplate = this.buildHtmlTemplate1();
                var initiateTaskDialog1 = new BaseDialog({
                    cancelButtonLabel: "Cancel",
                    contentString: this.htmlTemplate,
                    onCancel: function() {
                        dijit.byId('gridDiv').destroy();
                    },
                    createGridTable: function() {
                        taskLayout = new dijit.layout.TabContainer({
                            cols: 1,
                            spacing: 5,
                            showLabels: true,
                            orientation: "vert"
                        });
                        for (var i = 0; i < propData.items.length; i++) {
                            propData.items[i].id = propData.items[i].name;
                        }

                        var data = {
                            identifier: "id",
                            items: []
                        };
                        var idVal = 0;
                        var myNewItem;

                        for (var j = 0; j < propData.items.length; j++) {
                            if (propData.items[j].dataType == "xs:timestamp") {
                                myNewItem = {
                                    id: ++idVal,
                                    pname: propData.items[j].id,
                                    sname: propData.items[j].symbolicName,
                                    dtype: propData.items[j].dataType.replace("xs:timestamp", "datetime")
                                };
                            } else {
                                myNewItem = {
                                    id: ++idVal,
                                    pname: propData.items[j].id,
                                    sname: propData.items[j].symbolicName,
                                    dtype: propData.items[j].dataType.replace("xs:", "")
                                };
                            }
                            data.items.push(myNewItem);
                        }

                        var stateStore = new Memory({
                            data: propData
                        });

                        layoutProperties = [{
                                type: "dojox.grid._CheckBoxSelector"
                            },

                            {
                                defaultCell: {
                                    width: 5,
                                    editable: false,
                                    type: cells._Widget
                                },
                                cells: [
                                    new dojox.grid.cells.RowIndex({
                                        name: "S.No",
                                        width: '40px'
                                    }),

                                    {
                                        field: "pname",
                                        name: "Property Name",
                                        type: dojox.grid.cells._Widget,
                                        widgetClass: dijit.form.FilteringSelect,
                                        widgetProps: {
                                            id: name,
                                            store: stateStore,
                                            onChange: function(value) {
                                                var store = grid.store;
                                                var index = grid.selection.selectedIndex;
                                                var item = grid.getItem(index);
                                                if (value) {
                                                    for (var a = 0; a < store._arrayOfAllItems.length; a++) {
                                                        if (value == store._arrayOfAllItems[a].pname) {
                                                            alert('Duplicate value is chosen, Please select any other value');
                                                            store.setValue(item, 'sname', '');
                                                            store.setValue(item, 'dtype', '');
                                                            grid.update();
                                                            break;
                                                        } else {
                                                            store.setValue(item, 'sname', this.item.symbolicName);
                                                            if (this.item.dataType.includes("xs:timestamp")) {
                                                                store.setValue(item, 'dtype', this.item.dataType.replace("xs:timestamp", "datetime"));
                                                            } else {
                                                                store.setValue(item, 'dtype', this.item.dataType.replace("xs:", ""));
                                                            }
                                                            grid.update();
                                                        }
                                                    }

                                                } else {
                                                    alert('Empty value is chosen, Please select any value');
                                                    store.setValue(item, 'sname', '');
                                                    store.setValue(item, 'dtype', '');
                                                    grid.update();
                                                }
                                            }
                                        },
                                        searchAttr: "id",
                                        width: '148px',
                                        editable: false
                                    },
                                    {
                                        field: "sname",
                                        name: "Symbolic Name",
                                        width: '148px',
                                        height: '109px',
                                        editable: false
                                    },
                                    {
                                        field: "dtype",
                                        name: "DataType",
                                        width: '148px',
                                        height: '109px',
                                        editable: false
                                    },
                                ]
                            }
                        ];

                        store = new ItemFileWriteStore({
                            data: data
                        });

                        grid = new DataGrid({
                            id: 'grid',
                            store: store,
                            structure: layoutProperties,
                            //rowSelector: '20px',
                            //selectionMode: "multiple",
                            rowsPerPage: 200
                        });
                        grid.placeAt("gridDiv");
                        grid.setSortIndex(1, true);
                        grid.sort();
                        grid.startup();
                    },
                    
                    getCaseTypePropData: function() {
                        var solution = ecm.model.desktop.currentSolution;
                        var caseTypes = solution.caseTypes;
                        var prefix = solution.prefix;
                        for (var i = 0; i < caseTypes.length; i++) {
                            if (caseTypes[i].id == "LA_LoanProcessingCaseType") {
                                caseTypes[i].retrieveAttributeDefinitions(lang.hitch(this, function(retrievedAttributes) {
                                    var rows = retrievedAttributes.length;
                                    for (var i = 0; i < rows; i++) {
                                        var propSymbolicName = retrievedAttributes[i].symbolicName;
                                        if (propSymbolicName.includes("_")) {
                                            var propList = propSymbolicName.split("_");
                                            if (propList[0] == prefix) {
                                                propData.items.push(retrievedAttributes[i]);
                                            }
                                        }
                                        if (i == (rows - 1)) {
                                            this.createGridTable();
                                        }
                                    }
                                }));

                            }
                        }
                    },
                    onExport: function() {
                        var symNames = "";
                        var displayNames = [];
                        var items = grid.selection.getSelected();
                        if (items.length) {
                            dojo.forEach(items, function(selectedItem) {
                                if (selectedItem != null) {
                                    symNames += selectedItem.sname;
                                    symNames += ",";
                                    displayNames.push(selectedItem.pname);
                                }
                            });
                        }
                        symNames = symNames.replace(/,\s*$/, "");
                        var symNamesArray = symNames.split(',');
                        ceQuery = ceQuery.replace("caseProperties", symNames);
                        this._searchQuery = new ecm.model.SearchQuery();
                        this._searchQuery.repository = repository;
                        this._searchQuery.resultsDisplay = json;
                        this._searchQuery.pageSize = 0;
                        this._searchQuery.query = ceQuery;
                        this._searchQuery.search(lang.hitch(this, function(results) {
                            if (results.items.length > 0) {
                                searchResults = results.items;
                                var fileName = "Search_Results_Export";
                                fileName = fileName + ".xlsx";
                                var sr = [];
                                for (var i = 0; i < searchResults.length; i++) {
                                    var caseData = JSON.stringify(searchResults[i].attributes);
                                    var caseTypesData = JSON.stringify(searchResults[i].attributeTypes);
                                    var jsonData = JSON.parse(caseData);
                                    var caseTypejson = JSON.parse(caseTypesData);
                                    if ("DateLastModified" in jsonData) {
                                        delete jsonData['DateLastModified'];
                                    }
                                    for (var l = 0; l < symNamesArray.length; l++) {
                                        if (caseTypejson[symNamesArray[l]] == "xs:timestamp") {
                                            var val = jsonData[symNamesArray[l]];
                                            if (val != null) {
                                                val = new Date(val);
                                            }
                                            jsonData[displayNames[l]] = val;
                                            delete jsonData[symNamesArray[l]];
                                        } else {
                                            var val = jsonData[symNamesArray[l]];
                                            jsonData[displayNames[l]] = val;
                                            delete jsonData[symNamesArray[l]];
                                        }
                                    }
                                    sr.push(jsonData);
                                }
                                var wb = xlsx.utils.book_new();
                                wb.SheetNames.push("Search Results");
                                var ws = xlsx.utils.json_to_sheet(sr);
                                wb.Sheets["Search Results"] = ws;
                                var wbout = xlsx.write(wb, {
                                    bookType: 'xlsx',
                                    type: 'binary'
                                });

                                function s2ab(s) {

                                    var buf = new ArrayBuffer(s.length);
                                    var view = new Uint8Array(buf);
                                    for (var i = 0; i < s.length; i++) view[i] = s.charCodeAt(i) & 0xFF;
                                    return buf;

                                }
                                var blob = new Blob([s2ab(wbout)], {
                                    type: "application/octet-stream"
                                });
                                saveAs(blob, fileName);
                                initiateTaskDialog1.destroy();
                                dijit.byId('gridDiv').destroy();
                            } else {
                                var messageDialog = new ecm.widget.dialog.MessageDialog({
                                    text: "No Results Found..!!"
                                });
                                messageDialog.show();
                                initiateTaskDialog1.destroy();
                                dijit.byId('gridDiv').destroy();
                            }
                        }), sortBy, sortAsc, null, function(error) {

                            console.log(error);
                        });
                    },

                });
                initiateTaskDialog1.setTitle("LA_LoanProcessingCaseType");
                initiateTaskDialog1.getCaseTypePropData();
                initiateTaskDialog1.addButton("Export", initiateTaskDialog1.onExport, false, false);
                initiateTaskDialog1.setResizable(true);
                initiateTaskDialog1.setSize(600, 500);
                initiateTaskDialog1.show();

            },
            formatDate : function(dateValue)
    		{
    			var year=dateValue.getFullYear();
    			var month=dateValue.getMonth()+1;
    			if(month<10)
    			{
    				month='0'+month;
    			}
    			var day=dateValue.getDate();
    			if(day<10)
    			{
    				day='0'+day;
    			}

    			var returnDate=year+'-'+month+'-'+day;
    			return returnDate;

    		},
            buildHtmlTemplate1: function() {
                var htmlstring1 = '<div><div data-dojo-type="dijit/layout/TabContainer" style="width: 571px; height: 360px;">' +
                    '<div style="width: 571px; height: 360px;" id="gridDiv" data-dojo-type="dijit/layout/ContentPane" title="Properties" ></div>' +
                    '</div></div>';
                return htmlstring1;
            },
            _constructSearchViewPropertyDefs: function(propDefs) {
                var searchDefs = [];
                if (this.solution) {
                    var caseTypes = this.solution.getCaseTypes();
                    for (i = 0; i < caseTypes.length; i++) {
                        var type = caseTypes[i];

                        //add SearchView
                        fields = type.getSearchView() ? type.getSearchView().fields : [];
                        for (j = 0; j < fields.length; j++) {
                            if (!this._searchUtil.isInArray(searchDefs, fields[j].name, "id")) {
                                var def = this._searchUtil.getAttributeDefinitionByID(propDefs, fields[j].name);

                                var k;
                                for (k = 0; k < icmglobal.wellKnownProperties.searchExceptionProperties.length; k++) {
                                    if (def.id == icmglobal.wellKnownProperties.searchExceptionProperties[k].name) {
                                        if (icmglobal.wellKnownProperties.searchExceptionProperties[k].excludedValues && def.choiceList && def.choiceList.choices) {
                                            var newChoices = [];
                                            var m, n;
                                            var excludedValues = icmglobal.wellKnownProperties.searchExceptionProperties[k].excludedValues;
                                            for (m = 0; m < def.choiceList.choices.length; m++) {
                                                var choice = def.choiceList.choices[m];
                                                var isInclude = true;
                                                for (n = 0; n < excludedValues.length; n++) {
                                                    if (excludedValues[n] == choice.value) {
                                                        isInclude = false;
                                                    }
                                                }
                                                if (isInclude) {
                                                    newChoices.push(choice);
                                                }
                                            }
                                            def.choiceList.choices = newChoices;
                                        }
                                    }
                                }

                                if (def.searchable)
                                    searchDefs.push(def);
                            }
                        }
                    }
                }

                /*if(searchDefs.length > 1) {
                	//the display order of the properties is the alphabetical order
                	searchDefs.sort(function(a, b){
                		return a.name.toUpperCase().localeCompare(b.name.toUpperCase());
                		//return a.name < b.name ? -1 : 1;
                	});
                }*/
                return searchDefs;
            },
            _constructAllSearchablePropertyDefs: function(propDefs) {
                var allDefs = [];
                var i;
                for (i = 0; i < propDefs.length; i++) {
                    if (propDefs[i].searchable && !propDefs[i].hidden && propDefs[i].dataType != "xs:object" && !this._searchUtil.isInArray(this._searchUtil.ignoredProperties, propDefs[i].id, "id")) {
                        allDefs.push(propDefs[i]);
                    }
                }

                if (allDefs.length > 1) {
                    //the display order of the properties is the alphabetical order
                    allDefs.sort(function(a, b) {
                        return a.name.toUpperCase().localeCompare(b.name.toUpperCase());
                        //return a.name < b.name ? -1 : 1;
                    });
                }
                return allDefs;
            },
            _eoc_: null
        });
    });

dojo.setObject("icmcustom.pgwidget.casesearch", {});