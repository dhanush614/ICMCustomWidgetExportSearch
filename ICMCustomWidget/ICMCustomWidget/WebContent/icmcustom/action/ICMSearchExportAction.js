define([
    "dojo/_base/declare", "icm/action/Action", "dojo/dom-style",
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
    "dojo/domReady!"
], function(declare, Action, domStyle, Button, lang,
    array, parser, cells, ToolbarSeparator,
    Coordination, BaseDialog, FilteringSelect, _CheckBoxSelector, DataGrid,
    cellsDijit, ItemFileWriteStore, dijit, TextBox, date, DateTextBox, TabContainer, ContentPane,
    Layout, domConstruct,
    Toolbar, PropertyTable, domClass, ObjectStore,
    Memory, CellWidget, Row, Sort, aspect,
    domAttr, request, xhr, dom, on, mouse) {

    return declare("icmcustom.action.ICMSearchExportAction", [Action], {
        solution: null,

        isEnabled: function() {

            var Solution = this.getActionContext("Solution");
            if (Solution === null || Solution.length == 0) {
                return false;
            } else {
                this.solution = Solution[0];
                return true;
            }
        },
        execute: function() {
            var targetOS = this.propertiesValue.targetOS;
            var ceQuery = "SELECT caseProperties,classDescription FROM caseType WHERE searchCondition conditionValue";
            this._repositoryId = targetOS;
            var repository = ecm.model.desktop.getRepositoryByName(targetOS);

            this._ceQuery = ceQuery;
            var resultsDisplay = ecm.model.SearchTemplate.superclass.resultsDisplay;
            resultsDisplay = [];
            var sortBy = "";
            var sortAsc = true;
            var json = '{' + resultsDisplay + '}';
            var json = JSON.parse(json);

            var store;
            const xlsx = require('xlsx');
            var solution = ecm.model.desktop.currentSolution;
            this.htmlTemplate = this.buildHtmlTemplate();
            var caseTypeDrop;
            var conditionTextbox;
            var choiceListBox;
            var dateBox;
            var choices;
            var systemPropDrop;
            var caseTypeValue;
            var systemPropValue;
            var initiateTaskDialog1;
            var grid;
            var initiateTaskDialog;
            var documentObj;
            var props = [];
            var isDateField;
            var isChoicelistField;
            var taskLayout;
            var clickCount = 400;
            var propsData = [];
            var folderPath = this.propertiesValue.folderPath;
            var documentClass = this.propertiesValue.docClass;
            var targetOS = this.propertiesValue.targetOS;
            var sysPropJson = [];
            var isDocumentAvailable = false;
            initiateTaskDialog = new BaseDialog({
                cancelButtonLabel: "Cancel",
                contentString: this.htmlTemplate,

                createGrid: function() {
                    var caseType = solution.getCaseTypes();
                    var caseTyepList = [];

                    var data = {
                        items: []
                    };

                    for (var i = 0; i < caseType.length; i++) {
                        caseTyepList.push({
                            id: caseType[i].id,
                            value: caseType[i].id
                        });
                    }

                    for (var l = 0; l < caseTyepList.length; l++) {
                        data.items.push(caseTyepList[l]);
                    }
                    var typeStore = new dojo.data.ItemFileWriteStore({
                        data: data
                    });



                    var displayName = (new Date()).getTime() + "primaryInputField";
                    caseTypeDrop = new FilteringSelect({
                        displayName: displayName,
                        name: "primaryInputField",
                        store: typeStore,
                        autoComplete: true,
                        onChange: lang.hitch(this, function(value) {
                            caseTypeValue = value;
                            ceQuery = ceQuery.replace("caseType", caseTypeValue);
                            if(systemPropDrop == null){
                                this.getSearchConditionPropData();
                            }else{
                            	systemPropDrop.destroy();
                            	this.getSearchConditionPropData();
                            }
                        }),
                        style: {
                            width: "250px"
                        },
                        placeHolder: 'Select Case Type',
                        required: true,
                        searchAttr: "value"
                    });

                    caseTypeDrop.placeAt(this.primaryInputField);
                    caseTypeDrop.startup();

                },
                getSearchConditionPropData: function() {
                    var caseTypes = solution.caseTypes;
                    var prefix = solution.prefix;
                    var sysPropData = {
                            items: []
                        };
                    for (var i = 0; i < caseTypes.length; i++) {
                        if (caseTypes[i].id == caseTypeValue) {
                            caseTypes[i].retrieveAttributeDefinitions(lang.hitch(this, function(retrievedAttributes) {
                                var rows = retrievedAttributes.length;
                                for (var i = 0; i < rows; i++) {
                                	var propSymbolicName = retrievedAttributes[i].symbolicName;
                                    if (propSymbolicName.includes("_")) {
                                        var propList = propSymbolicName.split("_");
                                        if (propList[0] == prefix) {
                                            sysPropData.items.push(retrievedAttributes[i]);
                                        }
                                    }
                                    if(propSymbolicName=="Creator" || propSymbolicName=="DateCreated" || propSymbolicName=="LastModifier" || 
                                    		propSymbolicName=="DateLastModified" || propSymbolicName=="CmAcmCaseIdentifier" || propSymbolicName=="CmAcmCaseState"){
                                    	sysPropData.items.push(retrievedAttributes[i]);
                                    }
                                    if (i == (rows - 1)) {
                                        this.createSearchConditionDrop(sysPropData);
                                    }
                                }
                            }));
                        }
                    }
                },
                createSearchConditionDrop: function(sysPropData) {
                	var sysPropsData = {
                            items: []
                        };
                    var sysPropTypeList = [];
                    for (var l = 0; l < sysPropData.items.length; l++) {
                        sysPropTypeList.push({
                            id: sysPropData.items[l].symbolicName,
                            value: sysPropData.items[l].name
                        });
                    }
                    for (var i = 0; i < sysPropTypeList.length; i++) {
                        sysPropsData.items.push(sysPropTypeList[i]);
                    }
                    var sysTypeStore = new dojo.data.ItemFileWriteStore({
                        data: sysPropsData
                    });
                    var displayName = (new Date()).getTime() + "primaryInputField1";
                    systemPropDrop = new FilteringSelect({
                        displayName: displayName,
                        name: "primaryInputField1",
                        store: sysTypeStore,
                        autoComplete: true,
                        onChange: lang.hitch(this, function(value) {
                            if (value != null && value != "") {
                                for (var z = 0; z < sysPropTypeList.length; z++) {
                                    if (sysPropTypeList[z].value == value) {
                                        systemPropValue = sysPropTypeList[z].id;
                                        ceQuery = ceQuery.replace("searchCondition", systemPropValue)
                                        break;
                                    }
                                }
                                for (var z = 0; z < sysPropData.items.length; z++) {
                                    if (sysPropData.items[z].name == value) {
                                    	if(sysPropData.items[z].choiceList != null){
                                    		isChoicelistField = true;
                                    		isDateField = false;
                                    		choices = sysPropData.items[z].choiceList.choices;
                                    		var choiceData = {
                                    				items:[]
                                    		};
                                    		var choicesList = [];
                                    		for (var l = 0; l < choices.length; l++) {
                                                choicesList.push({
                                                    id: choices[l].value,
                                                    value: choices[l].displayName
                                                });
                                            }
                                    		for (var i = 0; i < choicesList.length; i++) {
                                                choiceData.items.push(choicesList[i]);
                                            }
                                    		var choiceStore = new dojo.data.ItemFileWriteStore({
                                                data: choiceData
                                            });
                                    		break;
                                    	}
                                        if (sysPropData.items[z].dataType == "xs:timestamp") {
                                            isDateField = true;
                                            isChoicelistField = false;
                                            break;
                                        } else {
                                            isDateField = false;
                                            isChoicelistField = false;
                                            break;
                                        }
                                    }
                                }
                                if(dateBox!=null){
                            		dateBox.destroy();
                            	}
                                if(conditionTextbox!=null){
                            		conditionTextbox.destroy();
                            	}
                                if(choiceListBox != null){
                                	choiceListBox.destroy();
                                }
                                if(isDateField){
                                		this.createDateBox();
                                	}else if(isChoicelistField){
                                		this.createChoiceListBox(choiceStore);
                                	}else{
                                		this.createConditionBox();
                                	}
                            } else {
                                alert("Please Select any value");
                            }
                        }),
                        style: {
                            width: "250px"
                        },
                        placeHolder: 'Select Search Condition',
                        required: true,
                        searchAttr: "value"
                    });

                    systemPropDrop.placeAt(this.primaryInputField1);
                    systemPropDrop.startup();
                },
                createChoiceListBox: function(choiceStore){
                	var displayName = (new Date()).getTime() + "primaryInputField2";
                	choiceListBox = new FilteringSelect({
                		displayName: displayName,
                        name: "primaryInputField2",
                        store: choiceStore,
                        autoComplete: true,
                        style: {
                            width: "250px"
                        },
                        placeHolder: 'Select Choice',
                        required: true,
                        searchAttr: "value"
                	});
                	choiceListBox.placeAt(this.primaryInputField2);
                    choiceListBox.startup();
                },
                createDateBox: function(){
                	dateBox = new DateTextBox({
                		name: "primaryInputField2",
                		placeHolder: 'Select Search Condition Date',
                		style: {
                            width: "250px"
                        },
                        required: true
                    });
                	dateBox.constraints.datePattern = 'MM-dd-yyyy';
                	dateBox.placeAt(this.primaryInputField2);
                    dateBox.startup();
                },
                createConditionBox: function(){
                	conditionTextbox = new TextBox({
                        name: "primaryInputField2",
                        placeHolder: 'Enter Search Condition Value',
                        style: {
                            width: "250px"
                        },
                        required: true,
                    });
                    conditionTextbox.placeAt(this.primaryInputField2);
                    conditionTextbox.startup();
                },
                onExecute: function() {
                	if (isDateField) {
                    	var conditionValue = dateBox.value;
                    }else if(isChoicelistField){
                    	var conditionValue = choiceListBox.value;
                    }
                    else {
                    	var conditionValue = conditionTextbox.value;
                    }

                    if (conditionValue != null && conditionValue !== '') {
                        if (isDateField) {
                        	var conditionValue = dateBox.value;
                            var date1 = date.add(conditionValue, "day", 1);
                            var searchDate = ">";
                            searchDate += this.formatDate(conditionValue);
                            var nextDate = "<";
                            nextDate += this.formatDate(date1);
                            var returnDate = searchDate +" and "+systemPropValue+nextDate;
                            ceQuery = ceQuery.replace("conditionValue", returnDate);
                        }else if(isChoicelistField){
                        	var conditionValue = choiceListBox.value;
                        	for(var c=0;c<choices.length;c++){
                        		if(choices[c].displayName == conditionValue){
                        			conditionValue = choices[c].value;
                        			break;
                        		}
                        	}
                        	if (isNaN(conditionValue)) {
                                conditionValue = "= '" + conditionValue + "'";
                                ceQuery = ceQuery.replace("conditionValue", conditionValue);
                            } else {
                                ceQuery = ceQuery.replace("conditionValue", '= '+conditionValue);
                            }
                        }
                        else {
                        	var conditionValue = conditionTextbox.value;
                            if (isNaN(conditionValue)) {
                                conditionValue = "= '" + conditionValue + "'";
                                ceQuery = ceQuery.replace("conditionValue", conditionValue);
                            } else {
                                ceQuery = ceQuery.replace("conditionValue", '= '+conditionValue);
                            }
                        }
                    }
                    var propData = {
                        items: []
                    };
                    this.htmlTemplate = this.buildHtmlTemplate1();
                    initiateTaskDialog1 = new BaseDialog({
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
                            var caseTypes = solution.caseTypes;
                            var prefix = solution.prefix;
                            for (var i = 0; i < caseTypes.length; i++) {
                                if (caseTypes[i].id == caseTypeValue) {
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
                                            if(caseTypejson[symNamesArray[l]]=="xs:timestamp"){
                                                var val = jsonData[symNamesArray[l]];
                                                if(val!=null){
                                                	val = new Date(val);
                                                }
	                                            jsonData[displayNames[l]] = val;
	                                            delete jsonData[symNamesArray[l]];
                                            }else{
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
                                }else{
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
                    initiateTaskDialog1.setTitle(caseTypeValue);
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
                }

            });
            initiateTaskDialog.setTitle("Case Type and Search Criteria");
            initiateTaskDialog.createGrid();
            initiateTaskDialog.setSize(500, 500);
            initiateTaskDialog.addButton("Next <span style='font-size:25px;position: absolute;left: 295px;bottom: 24px;'>&#8594;</span>", initiateTaskDialog.onExecute, false, false);
            initiateTaskDialog.setResizable(true);
            initiateTaskDialog.show();

        },
        buildHtmlTemplate: function() {
            var dialogueBoxName = "Choose Case Type";
            var dialogueBoxName1 = "Choose Search Condition";
            var dialogueBoxName2 = "Enter Search Condition Value";
            var htmlstring = '<div class="fieldsSection"><div class="fieldLabel" id="mainDiv"><span style="color:red" class="mandatory">** </span><label for="primaryInputFieldLabel">' + dialogueBoxName +
                ':</label><div data-dojo-attach-point="primaryInputField"/></div><br><span style="color:red" class="mandatory">** </span><label for="primaryInputFieldLabel1">' + dialogueBoxName1 +
                ':</label><div data-dojo-attach-point="primaryInputField1"/></div><br><span style="color:red" class="mandatory">** </span><label for="primaryInputFieldLabel2">' + dialogueBoxName2 +
                ':</label><div id="conditionValue" data-dojo-attach-point="primaryInputField2"/></div></div></div>';
            return htmlstring;
        },

    });
});