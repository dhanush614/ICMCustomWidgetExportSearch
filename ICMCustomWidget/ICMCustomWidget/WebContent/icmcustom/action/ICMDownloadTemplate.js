define([
    "dojo/_base/declare",
    "icm/action/Action",
    "dojo/dom-style",
    "dijit/form/Button",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "icm/util/Coordination",
    "ecm/widget/dialog/BaseDialog",
    "ecm/widget/FilteringSelect",
    "dojo/data/ItemFileWriteStore",
    "dojox/form/Uploader",
    "dojox/form/uploader/FileList",
    "dojo/aspect",
    "icmcustom/js/FileSaver",
    "dojo/dom-attr",
    "dojo/request/xhr",
    "dojo/domReady!"
], function(declare, Action, domStyle, Button, declare, lang, Coordination, BaseDialog, FilteringSelect, ItemFileWriteStore, Uploader, FileList, aspect, FileSaver, domAttr, xhr) {

    return declare("icmcustom.action.ICMDownloadTemplate", [Action], {
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
           
            this.htmlTemplate = this.buildHtmlTemplate();
            var initiateTaskDialog;
            var caseTypeVal;
            var documentClass = this.propertiesValue.docClass;
            var targetOS = this.propertiesValue.targetOS;
            initiateTaskDialog = new BaseDialog({
                cancelButtonLabel: "Cancel",
                contentString: this.htmlTemplate,
                createGrid: function() {

                    var solution = ecm.model.desktop.currentSolution;
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
                    this.caseTypeDropDown = new FilteringSelect({
                        displayName: displayName,
                        name: "primaryInputField",
                        store: typeStore,
                        autoComplete: true,
                        style: {
                            width: "200px"
                        },
                       onChange: lang.hitch(this, function(value) {
                    	   caseTypeVal=value;
                        }),
                        placeHolder: 'Select the required Case Type',
                        required: true,
                        searchAttr: "value"
                    });
                    
                    this.caseTypeDropDown.placeAt(this.primaryInputField);
                    this.caseTypeDropDown.startup();
                    
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

                        var item = results.items[0];
                        var itemUrl = item.getContentUrl();

                        var request = new XMLHttpRequest();
                        request.open('GET', itemUrl, true);
                        request.responseType = 'blob';
                        request.onload = function(e) {
                            	var blob = e.target.response;
                            	var today = new Date();
                                var y = today.getFullYear();
                                var m = today.getMonth() + 1;
                                var d = today.getDate();
                                var h = today.getHours();
                                var mi = today.getMinutes();
                                var s = today.getSeconds();
                            	var fileName = fileNameValue+"_"+ d + "/" + m + "/" + y + "," + h + ":" + mi + ":" + s +".xlsx";
                                saveAs(blob, fileName);
                                initiateTaskDialog.destroy();
                        };
                        request.send();
                    }), sortBy, sortAsc, null, function(error) {
                        console.log(error);
                    });
                    

                },
                createQuery: function() {

                	var ceQuery = "SELECT * FROM ["+documentClass+"] WHERE [DocumentTitle] =" + "'" + caseTypeVal + "'"+" and IsCurrentVersion=true";
                    this.executeCESearch(targetOS, ceQuery, false, caseTypeVal);

                },
               

            });
            initiateTaskDialog.setTitle("Download Template");
            initiateTaskDialog.createGrid();
            initiateTaskDialog.setSize(450, 350);
            initiateTaskDialog.addButton("Download",initiateTaskDialog.createQuery, false, false);
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