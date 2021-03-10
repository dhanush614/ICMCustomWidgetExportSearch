define([
    "dojo/_base/declare", "icm/action/Action", "dojo/dom-style",
    "dijit/form/Button",
    "dojo/_base/lang", "dojo/_base/array",
    "dojo/parser", "dojox/grid/cells",
    "dijit/ToolbarSeparator", "icm/util/Coordination",
    "ecm/widget/dialog/BaseDialog",
    "ecm/widget/FilteringSelect", "dojox/grid/DataGrid",
    "dojox/grid/cells/dijit", "dojo/data/ItemFileWriteStore",
    "dijit/dijit",
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
    Coordination, BaseDialog, FilteringSelect, DataGrid,
    cellsDijit, ItemFileWriteStore, dijit, TabContainer, ContentPane,
    Layout, domConstruct,
    Toolbar, PropertyTable, domClass, ObjectStore,
    Memory, CellWidget, Row, Sort, aspect,
    domAttr, request, xhr, dom, on, mouse) {

    return declare("icmcustom.action.ICMGeneratePropertiesExcelAction", [Action], {

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
            var store;
            const xlsx = require('xlsx');
            var solution = ecm.model.desktop.currentSolution;
            this.htmlTemplate = this.buildHtmlTemplate();
            var caseTypeDrop;
            var caseTypeValue;
            var initiateTaskDialog1;
            var grid;
            var initiateTaskDialog;
            var documentObj;
            var props = [];
            var taskLayout;
            var reqProps = {
                items: []
            };
            var clickCount = 400;
            var propsData = [];
            var folderPath = this.propertiesValue.folderPath;
            var documentClass = this.propertiesValue.docClass;
            var targetOS = this.propertiesValue.targetOS;
            var nonReqProps = {
                items: []
            };
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
                    })
                    var displayName = (new Date()).getTime() + "primaryInputField";
                    caseTypeDrop = new FilteringSelect({
                        displayName: displayName,
                        name: "primaryInputField",
                        store: typeStore,
                        autoComplete: true,
                        onChange: lang.hitch(this, function(value) {
                            caseTypeValue = value;
                            this.initializeSearch(value);
                        }),
                        style: {
                            width: "200px"
                        },
                        placeHolder: 'Select Case Type',
                        required: true,
                        searchAttr: "value"
                    });

                    caseTypeDrop.placeAt(this.primaryInputField);
                    caseTypeDrop.startup();

                },
                initializeSearch: function(value) {

                    var ceQuery = "SELECT * FROM [" + documentClass + "] WHERE [DocumentTitle] =" + "'" + value + "'" + " and IsCurrentVersion=true";
                    this.executeCESearch(targetOS, ceQuery, false, value);

                },

                executeCESearch: function(repositoryId, ceQuery, execute, fileNameValue) {

                    this._repositoryId = repositoryId;
                    var repository = ecm.model.desktop.getRepositoryByName(repositoryId);
                    this._ceQuery = ceQuery;
                    var resultsDisplay = ecm.model.SearchTemplate.superclass.resultsDisplay;
                    resultsDisplay = [];
                    var sortBy = "";
                    var sortAsc = true;
                    var json = '{' + resultsDisplay + '}';
                    this._searchQuery = new ecm.model.SearchQuery();
                    var json = JSON.parse(json);
                    this._searchQuery.repository = repository;
                    this._searchQuery.resultsDisplay = json;
                    this._searchQuery.pageSize = 0;
                    this._searchQuery.query = ceQuery;
                    this._searchQuery.search(lang.hitch(this, function(results) {

                        if (results.items.length > 0) {
                            documentObj = results.items;
                            isDocumentAvailable = true;

                            var itemUrl = documentObj[0].getContentUrl();
                            var request = new XMLHttpRequest();
                            request.open('GET', itemUrl, true);
                            request.responseType = 'blob';
                            request.onload = function() {
                                var reader = new FileReader();
                                reader.readAsBinaryString(request.response);
                                reader.onload = function(e) {
                                    var workbook = xlsx.read(e.target.result, {
                                        type: 'binary'
                                    });
                                    var Sheet = workbook.SheetNames[0];
                                    var excelRows = xlsx.utils.sheet_to_csv(workbook.Sheets[Sheet]);
                                    props = excelRows.split(",");
                                };
                            };
                            request.send();
                        }
                    }), sortBy, sortAsc, null, function(error) {

                        console.log(error);
                    });
                },
                onExecute: function() {
                    var propData = {
                        items: []
                    };
                    this.htmlTemplate = this.buildHtmlTemplate1();
                    initiateTaskDialog1 = new BaseDialog({
                        cancelButtonLabel: "Cancel",
                        contentString: this.htmlTemplate,
                        onCancel: function() {
                            dijit.byId('addButton').destroy();
                            dijit.byId('remButton').destroy();
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

                            for (var y = 0; y < propData.items.length; y++) {
                                if (propData.items[y].required == true) {
                                    reqProps.items.push(propData.items[y]);
                                } else {
                                    nonReqProps.items.push(propData.items[y]);
                                }
                            }
                            for (var k = 0; k < props.length; k++) {
                                if (props[k].includes("*")) {
                                	props[k] = props[k].replace(/\* *\([^)]*\) */g, "").trim();    								
        						}
                                else
                                	{
                                	props[k] = props[k].replace(/\([^)]*\) */g, "").trim();
                                	}
                            }
                            for (var l = 0; l < propData.items.length; l++) {
                                if (props.includes(propData.items[l].name)) {
                                    propsData.push(propData.items[l].symbolicName);
                                }
                            }
                            var data = {
                                identifier: "id",
                                items: []
                            };
                            var idVal = 0;
                            var myNewItem;
                            if (propsData.length == 0) {
                                for (var x = 0; x < reqProps.items.length; x++) {
                                    if (reqProps.items[x].dataType == "xs:timestamp") {
                                        myNewItem = {
                                            id: ++idVal,
                                            pname: reqProps.items[x].id,
                                            sname: reqProps.items[x].symbolicName,
                                            isreq: reqProps.items[x].required,
                                            dtype: reqProps.items[x].dataType.replace("xs:timestamp", "datetime")
                                        };
                                        data.items.push(myNewItem);
                                    } else {
                                        myNewItem = {
                                            id: ++idVal,
                                            pname: reqProps.items[x].id,
                                            sname: reqProps.items[x].symbolicName,
                                            isreq: reqProps.items[x].required,
                                            dtype: reqProps.items[x].dataType.replace("xs:", "")
                                        };
                                        data.items.push(myNewItem);
                                    }
                                }
                            } else {
                                for (var x = 0; x < reqProps.items.length; x++) {
                                    if (!propsData.includes(reqProps.items[x].symbolicName)) {
                                        propsData.push(reqProps.items[x].symbolicName);
                                    }
                                }
                                for (var j = 0; j < propData.items.length; j++) {
                                    if (propsData.includes(propData.items[j].symbolicName)) {
                                        if (propData.items[j].dataType == "xs:timestamp") {
                                            myNewItem = {
                                                id: ++idVal,
                                                pname: propData.items[j].id,
                                                sname: propData.items[j].symbolicName,
                                                isreq: propData.items[j].required,
                                                dtype: propData.items[j].dataType.replace("xs:timestamp", "datetime")
                                            };
                                        } else {
                                            myNewItem = {
                                                id: ++idVal,
                                                pname: propData.items[j].id,
                                                sname: propData.items[j].symbolicName,
                                                isreq: propData.items[j].required,
                                                dtype: propData.items[j].dataType.replace("xs:", "")
                                            };
                                        }


                                        data.items.push(myNewItem);
                                    }
                                }
                            }


                            var stateStore = new Memory({
                                data: nonReqProps
                            });


                            var node = dom.byId("addButton");
                            on(node, "click", function() {
                                var myNewItem = {
                                    id: (++idVal),
                                    pname: "",
                                    sname: "",
                                    isreq: "",
                                    dtype: ""
                                };
                                store.newItem(myNewItem);                                
                                var lastRow = grid.store._arrayOfAllItems.length - 1;
                                //grid.scrollToRow(lastRow);
                                grid.scrollTo(clickCount);
                                clickCount+=50;
                            });
                            
                            var remnode = dom.byId("remButton");
                            on(remnode, "click", function() {
                                var items = grid.selection.getSelected();
                                if (items.length) {
                                    if (items[0].isreq[0]) {
                                        alert("Required Property cannot be deleted");
                                    } else {
                                        dojo.forEach(items, function(selectedItem) {
                                            if (selectedItem != null) {
                                                store.deleteItem(selectedItem);
                                                store.save();
                                            }
                                        })
                                    }
                                }
                            })
                            layoutProperties = [{
                                defaultCell: {
                                    width: 5,
                                    editable: false,
                                    type: cells._Widget
                                },
                                cells: [
                                    new dojox.grid.cells.RowIndex({
                                        name: "S.No",
                                        width: '35px'
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
                                                            store.setValue(item, 'isreq', '');
                                                            store.setValue(item, 'dtype', '');
                                                            grid.update();
                                                            break;
                                                        } else {
                                                            store.setValue(item, 'sname', this.item.symbolicName);
                                                            store.setValue(item, 'isreq', this.item.required);
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
                                                    store.setValue(item, 'isreq', '');
                                                    store.setValue(item, 'dtype', '');
                                                    grid.update();
                                                }
                                            }
                                        },
                                        searchAttr: "id",
                                        width: '132px',
                                        editable: true
                                    },
                                    {
                                        field: "sname",
                                        name: "Symbolic Name",
                                        width: '132px',
                                        height: '109px',
                                        editable: false
                                    },
                                    {
                                        field: "isreq",
                                        name: "isRequired? <span style='color:red;'>*</span>",
                                        width: '132px',
                                        height: '109px',
                                        editable: false
                                    },
                                    {
                                        field: "dtype",
                                        name: "DataType",
                                        width: '132px',
                                        height: '109px',
                                        editable: false
                                    },
                                ]
                            }];

                            store = new ItemFileWriteStore({
                                data: data
                            });

                            grid = new DataGrid({
                                id: 'grid',
                                store: store,
                                structure: layoutProperties,
                                canEdit: function() {
                                    var item = grid.getItem(grid.selection.selectedIndex);
                                    if (item.isreq[0] == false) {
                                        return true;
                                    } else {
                                        return false;
                                    }
                                },
                                rowSelector: '20px',
                                rowsPerPage: 200
                            });
                            grid.placeAt("gridDiv");
                            grid.setSortIndex(3, false);
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
                        onSave: function() {
                            var value = [];
                            var temp = "";

                            function completed(items, request) {

                                for (var i = 0; i < items.length; i++) {
                                    if (store.getValue(items[i], "pname") && store.getValue(items[i], "sname")) {
                                        if (store.getValue(items[i], "isreq") == true && store.getValue(items[i], "dtype") == "datetime") {
                                            temp += store.getValue(items[i], "pname");
                                            temp += " * (";
                                            temp += store.getValue(items[i], "dtype");
                                            temp += " mm/dd/yy)"
                                        } else if (store.getValue(items[i], "isreq") == true) {
                                            temp += store.getValue(items[i], "pname");
                                            temp += " * ("
                                            temp += store.getValue(items[i], "dtype");
                                            temp += " )";
                                        } else if (store.getValue(items[i], "dtype") == "datetime") {
                                            temp += store.getValue(items[i], "pname");
                                            temp += " ("
                                            temp += store.getValue(items[i], "dtype");
                                            temp += " mm/dd/yy)";
                                        } else {
                                            temp += store.getValue(items[i], "pname");
                                            temp += " ("
                                            temp += store.getValue(items[i], "dtype");
                                            temp += " )";
                                        }
                                        value.push(temp);
                                        temp = "";
                                    } else {
                                        store.deleteItem(items[i]);
                                    }
                                }
                            }
                            store.fetch({
                                query: {
                                    sname: "*",
                                    isreq: "*",
                                    dtype: "*",
                                },
                                onComplete: completed
                            });

                            var fileName = caseTypeValue;
                            fileName = fileName + ".xlsx";

                            var wb = xlsx.utils.book_new();

                            wb.SheetNames.push("Template", "Property Description", "Instructions");
                            var ws_data = [value];
                            var ws = xlsx.utils.aoa_to_sheet(ws_data);
                            wb.Sheets["Template"] = ws;
                            var readMe = [
                                          ['Columns with * notation are required'],
                                          ['Do not leave empty cells'],
                                          ['Do not leave empty rows'],
                                          ['Follow the datatype for the properties which are denoted'],
                                          ['Maximum number of rows per sheet is 50,000'],
                                          ['If number of rows is more than 50,000 then create new template with rest of the property data'],
                                          ['Do not skip rows']
                                          ];
                            var propertyDesc='[';
                            var finalProps = {
                            		items:[]
                            };
                            for (var k = 0; k < value.length; k++) {
                                if (value[k].includes("*")) {
                                	value[k] = value[k].replace(/\* *\([^)]*\) */g, "").trim();    								
        						}
                                else
                                	{
                                	value[k] = value[k].replace(/\([^)]*\) */g, "").trim();
                                	}
                            }
                            for(var l=0;l<propData.items.length;l++){
                            		if(value.includes(propData.items[l].name)){
                                	finalProps.items.push(propData.items[l]);
                                }
                            }
                            for(var len=0;len<finalProps.items.length;len++){
                            	propertyDesc +='{"DisplayName": "'+finalProps.items[len].name+'","SymbolicName": "'+finalProps.items[len].symbolicName+'"},';
                            }
                            propertyDesc = propertyDesc.replace(/,\s*$/, "");
                            propertyDesc+=']';
                            var wsp = xlsx.utils.json_to_sheet(JSON.parse(propertyDesc));
                            wb.Sheets["Property Description"] = wsp;
                            wb.Sheets["Instructions"] = xlsx.utils.aoa_to_sheet(readMe);
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

                            var fileObj = new File([blob], fileName);
                            var repositoryObj = ecm.model.desktop.getRepositoryByName(targetOS);

                            if (!isDocumentAvailable) {
                                this.addDocument(folderPath, repositoryObj, fileObj);
                            } else {
                                this.checkOutandCheckIn(repositoryObj, fileObj);
                            }
                            //}

                        },
                        addDocument: function(path, rep, file) {
                            rep.retrieveItem(path, lang.hitch(this, function(Folder) {
                                var parentFolder = Folder;
                                var objectStore = ecm.model.desktop.currentSolution.caseTypes[0].objectStore;
                                var templateName = documentClass;
                                var criterias = [{
                                    "name": "DocumentTitle",
                                    "value": caseTypeValue,
                                    "dataType": "xs:string",
                                    "label": "Document Title",
                                    "displayValue": caseTypeValue
                                }];
                                var contentSourceType = "Document";
                                var mimeType = file.type;
                                var filename = file.name;
                                var content = file;
                                var childComponentValues = [];
                                var permissions = [{
                                        "granteeName": "PEWorkflowSystemAdmin",
                                        "accessType": 1,
                                        "accessMask": 998903,
                                        "granteeType": 2001,
                                        "inheritableDepth": 0,
                                        "roleName": null
                                    },
                                    {
                                        "granteeName": ecm.model.desktop.userId,
                                        "accessType": 1,
                                        "accessMask": 998903,
                                        "granteeType": 2000,
                                        "inheritableDepth": 0,
                                        "roleName": null
                                    },
                                    {
                                        "granteeName": "#AUTHENTICATED-USERS",
                                        "accessType": 1,
                                        "accessMask": 131201,
                                        "granteeType": 2001,
                                        "inheritableDepth": 0,
                                        "roleName": null
                                    }
                                ];
                                var securityPolicyId = null;
                                var addAsMinorVersion = false;
                                var autoClassify = false;
                                var allowDuplicateFileNames = true;
                                var setSecurityParent = null;
                                var teamspaceId;
                                var isBackgroundRequest = true;
                                var compoundDocument = false;
                                var uploadProgress = true;
                                var applicationGroup = "";
                                var application = "";
                                var parameters;
                                var templateMetadataValues = [];
                                var fullPath = null;
                                rep.addDocumentItem(parentFolder, objectStore, templateName, criterias, contentSourceType, mimeType, filename, content, childComponentValues, permissions, securityPolicyId, addAsMinorVersion, autoClassify, allowDuplicateFileNames, setSecurityParent, teamspaceId, lang.hitch(this, function() {
                                    console.log("Success");
                                    var messageDialog = new ecm.widget.dialog.MessageDialog({
                                        text: "Template created successfully"
                                    });
                                    messageDialog.show();
                                    initiateTaskDialog1.destroy();
                                    dijit.byId('addButton').destroy();
                                    dijit.byId('remButton').destroy();
                                    dijit.byId('gridDiv').destroy();

                                }, isBackgroundRequest, null, compoundDocument, uploadProgress, applicationGroup, application, parameters, templateMetadataValues, fullPath));
                            }));
                        },

                        checkOutandCheckIn: function(repositoryObject, file) {
                            var returnVersion = "released";
                            repositoryObject.lockItems(documentObj, lang.hitch(this, function(updatedItems) {
                                var contentItem = ecm.model.ContentItem(updatedItems[0]);
                                var templateName = documentClass;
                                var criterias = [{
                                    "name": "DocumentTitle",
                                    "value": caseTypeValue,
                                    "dataType": "xs:string",
                                    "label": "Document Title",
                                    "displayValue": caseTypeValue
                                }];
                                var contentSourceType = "Document";
                                var mimeType = file.type;
                                var filename = file.name;
                                var content = file;
                                var childComponentValues = [];
                                var permissions = null;
                                var securityPolicyId = null;
                                var newVersion = null;
                                var checkInAsMinorVersion = false;
                                var autoClassify = false;
                                var isBackgroundRequest = true;
                                var uploadProgress = true;
                                var parameters;
                                var templateMetadata = [];
                                contentItem.repository = repositoryObject;
                                contentItem.checkIn(templateName, criterias, contentSourceType, mimeType, filename, content, childComponentValues, permissions, securityPolicyId, newVersion, checkInAsMinorVersion, autoClassify, lang.hitch(this, function(checkedInDoc) {
                                    console.log("checked in success");
                                    var messageDialog = new ecm.widget.dialog.MessageDialog({
                                        text: "Template updated successfully"
                                    });
                                    messageDialog.show();
                                    initiateTaskDialog1.destroy();
                                    dijit.byId('addButton').destroy();
                                    dijit.byId('remButton').destroy();
                                    dijit.byId('gridDiv').destroy();
                                }), isBackgroundRequest, uploadProgress, null, parameters, templateMetadata);
                            }));
                        },

                    });
                    initiateTaskDialog1.setTitle(caseTypeValue);
                    initiateTaskDialog1.getCaseTypePropData();
                    initiateTaskDialog1.addButton("Save Template", initiateTaskDialog1.onSave, false, false);
                    initiateTaskDialog1.setResizable(true);
                    initiateTaskDialog1.setSize(700, 500);
                    initiateTaskDialog1.show();                   

                },

                buildHtmlTemplate1: function() {
                    var htmlstring1 = '<div><div data-dojo-type="dijit/layout/TabContainer" style="width: 671px; height: 310px;">' +
                        '<div style="width: 671px; height: 310px;" id="gridDiv" data-dojo-type="dijit/layout/ContentPane" title="Properties" ></div>' +
                        '</div>' +
                        '<div class="pvrPropertyTable" id="toolBar1"><div class="pvrPropertyTableGrid" data-dojo-attach-point="_gridNode"></div>' +
                        '<div class="pvrPropertyTableToolbar pvrGridToolbar" data-dojo-type="dijit/Toolbar"  data-dojo-attach-point="_toolbar">' +
                        '<div data-dojo-type="dijit/form/Button" data-dojo-attach-point="_addButton" id="addButton"' +
                        'data-dojo-props="iconClass:\'addButton\', showLabel:false">add</div>' +
                        '<div data-dojo-type="dijit/form/Button" data-dojo-attach-point="_removeButton" id="remButton"' +
                        'data-dojo-props="iconClass:\'removeButton\', showLabel:false">remove</div></div></div></div>';
                    return htmlstring1;
                }


            });
            initiateTaskDialog.setTitle("Case Type");
            initiateTaskDialog.createGrid();
            initiateTaskDialog.setSize(500, 500);
            initiateTaskDialog.addButton("Next <span style='font-size:25px;position: absolute;left: 295px;bottom: 24px;'>&#8594;</span>", initiateTaskDialog.onExecute, false, false);
            initiateTaskDialog.setResizable(true);
            initiateTaskDialog.show();

        },
        buildHtmlTemplate: function() {
            var dialogueBoxName = "Choose Case Type";
            var htmlstring = '<div class="fieldsSection"><div class="fieldLabel" id="mainDiv"><span style="color:red" class="mandatory">**</span><label for="primaryInputFieldLabel">' + dialogueBoxName + ':</label><div data-dojo-attach-point="primaryInputField"/></div></div></div>';
            return htmlstring;
        },

    });
});