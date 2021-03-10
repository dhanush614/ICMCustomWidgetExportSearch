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
    'dijit/registry',
    "icmcustom/js/xlsx",
    "icmcustom/js/jszip",
    "dojo/dom-attr",
    "dojo/request/xhr",
    "dojo/domReady!"
], function(declare, Action, domStyle, Button, declare, lang, Coordination, BaseDialog, FilteringSelect, ItemFileWriteStore, Uploader, FileList, aspect, registry, xlsx, jszip, domAttr, xhr) {

    return declare("icmcustom.action.ICMBulkUploadAction", [Action], {
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
            var caseTypeValue ="";
            const xlsx = require('xlsx');
            this.htmlTemplate = this.buildHtmlTemplate();
            var workbook = xlsx.XLSX;
            var content = "";
            var createdCaseCount = 0;
            var totalRowsLength = 0;
            var caseTypeDropDown1;
            var folderPath = this.propertiesValue.folderPath;
            var documentClass = this.propertiesValue.docClass;
            var targetOS = this.propertiesValue.targetOS;
            this.initiateTaskDialog = new BaseDialog({
                cancelButtonLabel: "Cancel",
                contentString: this.htmlTemplate,
                onCancel: function() {
                    console.log("inside Cancel");
                    var uploadButtonId = dijit.byId("fileUpload");
                    uploadButtonId.destroy();
                },
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
                        placeHolder: 'Select Case Type',
                        onChange: function(value){
                        	if(value){
                        		caseTypeDropDown1.set('disabled',false);   
                        		caseTypeValue=value;
                        	}
                        	else{                        		
                        		caseTypeDropDown1.reset();
                        		caseTypeDropDown1.set('disabled',true);
                        	}
                        },
                        required: true,
                        searchAttr: "value"
                    });
                    caseTypeDropDown1 = new Uploader({
                        label: "Browse files",
                        id: "fileUpload",
                        multiple: false,
                        uploadOnSelect: false,
                    });
                    
                    this.fileList = new dojox.form.uploader.FileList({
                        uploader: caseTypeDropDown1
                    });
                    this.caseTypeDropDown.placeAt(this.primaryInputField);
                    this.caseTypeDropDown.startup();
                    caseTypeDropDown1.placeAt(this.primaryInputField1);
                    caseTypeDropDown1.startup();
                    caseTypeDropDown1.set('disabled',true);
                    this.fileList.placeAt(this.primaryInputField2);
                    this.fileList.startup();
                },

                onExecute: function() {
                    var fileUpload = dijit.byId("fileUpload");
                    if (fileUpload.getValue().length != 0) {
                        var regex = /^(.*?)(?:\((\d+)\))?\.(xlsx|xls)$/;
                        if (regex.test(fileUpload.getValue()[0].name.toLowerCase())) {
                            if (typeof(FileReader) != "undefined") {
                            	var repositoryObj = ecm.model.desktop.getRepositoryByName(targetOS);
                            	var fileObj=fileUpload._files[0];
                                this.addDocument(folderPath,repositoryObj,fileObj);
                            } else {
                                alert("This browser does not support HTML5.");
                                var uploadButtonId = dijit.byId("fileUpload");
                                uploadButtonId.destroy();
                            }
                        } else {
                            alert("Please upload a valid Excel file.");
                            var uploadButtonId = dijit.byId("fileUpload");
                            uploadButtonId.destroy();
                        }
                    } else {
                        alert("Please chose an Excel file.");
                        var uploadButtonId = dijit.byId("fileUpload");
                        uploadButtonId.destroy();
                    }
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
                                text: "File Uploaded successfully"
                            });
                            messageDialog.show();
                            var uploadButtonId = dijit.byId("fileUpload");
                            uploadButtonId.destroy();

                        }, isBackgroundRequest, null, compoundDocument, uploadProgress, applicationGroup, application, parameters, templateMetadataValues, fullPath));
                    }));
                }

            });
            this.initiateTaskDialog.setTitle("Upload Case Creation Template");
            this.initiateTaskDialog.createGrid();
            this.initiateTaskDialog.setSize(500, 450);
            this.initiateTaskDialog.addButton("Upload", this.initiateTaskDialog.onExecute, false, false);
            this.initiateTaskDialog.setResizable(true);
            this.initiateTaskDialog.show();

        },
        buildHtmlTemplate: function() {
            var dialogueBoxName = "Choose Case Type";
            var htmlstring = '<div class="fieldsSection"><div class="fieldLabel" id="mainDiv"><span style="color:red" class="mandatory">**</span><label for="primaryInputFieldLabel">' + dialogueBoxName + ':</label><div data-dojo-attach-point="primaryInputField"/></div><br><div data-dojo-attach-point="primaryInputField1"/></div><br><div data-dojo-attach-point="primaryInputField2"></div></div>';
            return htmlstring;
        },

    });
});