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
    "icmcustom/js/xlsx",
    "icmcustom/js/jszip",
    "dojo/dom-attr",
    "dojo/request/xhr",
    "dojo/domReady!"
], function(declare, Action, domStyle, Button, declare, lang, Coordination, BaseDialog, FilteringSelect, ItemFileWriteStore, Uploader, FileList, aspect, xlsx, jszip, domAttr, xhr) {

    return declare("icmcustom.action.ICMBulkCaseCreationAction", [Action], {
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
           
            const xlsx = require('xlsx');
            this.htmlTemplate = this.buildHtmlTemplate();
            var workbook = xlsx.XLSX;
            var createCaseCount=0;
            var caseTypeDropDown1;
            var initiateTaskDialog = new BaseDialog({
                cancelButtonLabel: "Cancel",
                contentString: this.htmlTemplate,
                onCancel: function() {
                    console.log("inside Cancel");
                    var uploadButtonId = dijit.byId("fileUpload");
                    uploadButtonId.destroy();
                },

                GetTableFromExcel: function(data) {
                    var workbook = xlsx.read(data, {
                        type: 'binary'
                    });
                    var Sheet = workbook.SheetNames[0];
                    var Sheet1 = workbook.SheetNames[1];
                    var excelRows = xlsx.utils.sheet_to_row_object_array(workbook.Sheets[Sheet]);
                    var excelRows1 = xlsx.utils.sheet_to_row_object_array(workbook.Sheets[Sheet1]);
                    var descKeys = [];
                    var descValues = [];
                    for(var el=0;el<excelRows1.length;el++){
                    	descKeys.push(excelRows1[el].DisplayName);
                    	descValues.push(excelRows1[el].SymbolicName);
                    }
                    this.createCaseMethod(excelRows, descKeys, descValues);

                },
                createCaseMethod: function(excelRows, descKeys, descValues) {

                    var solutionObj = ecm.model.desktop.currentSolution;
                    var excelKeyObj = [];
                    var excelValObj = [];
                    var totalRowsLength = excelRows.length;
                    for (var er = 0; er < excelRows.length; er++) {
                    	excelKeyObj = Object.keys(excelRows[er]);
                        excelValObj = Object.values(excelRows[er]);
                        var caseTypeValue = this.caseTypeDropDown.value;
                        if (caseTypeValue != null && caseTypeValue != "") {
                            this.assignMetadataForCaseCreation(solutionObj, caseTypeValue, excelKeyObj, excelValObj, totalRowsLength, descKeys, descValues);
                           
                        } else {
                            alert("Case Type is empty");
                            var uploadButtonId = dijit.byId("fileUpload");
                            uploadButtonId.destroy();
                        }
                    }
                },
                assignMetadataForCaseCreation: function(solutionObj, caseTypeVal, excelKeyObj, excelValObj, totalRowsLength, descKeys, descValues) {
                	solutionObj.createNewCaseEditable(caseTypeVal, function(newCaseEditable) {
                        for (var k = 0; k < excelKeyObj.length; k++) {
                            var propName = excelKeyObj[k];
                            var propVal = excelValObj[k];
                            if (propName.includes("*")) {
                            	if(propName.includes("datetime")){
                            		propVal = new Date(propVal);
                            	}
                            	propName = propName.replace(/\* *\([^)]*\) */g, "").trim();    								
    						}
                            else
                            	{
                            	if(propName.includes("datetime")){
                            		propVal = new Date(propVal);
                            	}
    							propName = propName.replace(/\([^)]*\) */g, "").trim();
                            	}
                            	var propIndex = descKeys.indexOf(propName);
                            	    propName = descValues[propIndex];
                            var casePropsHandler = newCaseEditable.propertiesCollection[propName];
                            if (casePropsHandler != undefined) {
                                casePropsHandler.setValue(propVal);
                            }
                        }

                        newCaseEditable.save(lang.hitch(this, function(savedCaseEditable) {
                        	createCaseCount=createCaseCount+1;
                        	 if (totalRowsLength == createCaseCount) {
                                 var uploadButtonId = dijit.byId("fileUpload");
                                 uploadButtonId.destroy();
                                 var messageDialog = new ecm.widget.dialog.MessageDialog({
                                     text: "Case Created Successfully"
                                 });
                                 messageDialog.show();
                             }
                        }));
                    });
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
                        placeHolder: 'Select the required Case Type',
                        required: true,
                        searchAttr: "value"
                    });
                    caseTypeDropDown1 = new Uploader({
                        label: "Select files",
                        id: "fileUpload",
                        multiple: false,
                        uploadOnSelect: false
                    });
					this.fileList = new dojox.form.uploader.FileList({uploader:caseTypeDropDown1});
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
                                var reader = new FileReader();

                                if (reader.readAsBinaryString) {
                                    reader.onload = lang.hitch(this, function(e) {
                                        this.GetTableFromExcel(e.target.result);
                                    });
                                    reader.readAsBinaryString(fileUpload._files[0]);
                                } else {
                                    reader.onload = lang.hitch(this, function(e) {
                                        var data = "";
                                        var bytes = new Uint8Array(e.target.result);
                                        for (var i = 0; i < bytes.byteLength; i++) {
                                            data += String.fromCharCode(bytes[i]);
                                        }
                                        this.GetTableFromExcel(data);
                                    });
                                    reader.readAsArrayBuffer(fileUpload._files[0]);
                                }
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
                    }
					else{
						 alert("Please chose an Excel file.");
                            var uploadButtonId = dijit.byId("fileUpload");
                            uploadButtonId.destroy();

					}

                }

            });
            initiateTaskDialog.setTitle("Create Case");
            initiateTaskDialog.createGrid();
            initiateTaskDialog.setSize(500, 450);
            initiateTaskDialog.addButton("Ok", initiateTaskDialog.onExecute, false, false);
            initiateTaskDialog.setResizable(true);
            initiateTaskDialog.show();

        },
        buildHtmlTemplate: function() {
            var dialogueBoxName = "Choose Case Type";
            //var htmlstring = '<div data-dojo-type="dijit/form/Button" data-dojo-attach-point="chooseButton"></div> <div id="taskSelectID" data-dojo-type="dijit/form/Button" data-dojo-attach-point="uploadButton"></div><br><br><div data-dojo-type="dijit/layout/ContentPane" data-dojo-attach-point="gridContainer" style="height: 360px;"></div>';
            //var htmlstring = '<form id="myForm" enctype="multipart/form-data" ><input name="uploadedfile" multiple="true" type="file" label="Select Some Files" id="fileUpload" /><button data-dojo-type="dijit/form/Button" id="uploadButton" type="button">Upload</button></form>';
            var htmlstring = '<div class="fieldsSection"><div class="fieldLabel" id="mainDiv"><span style="color:red" class="mandatory">**</span><label for="primaryInputFieldLabel">' + dialogueBoxName + ':</label><div data-dojo-attach-point="primaryInputField"/></div><br><div data-dojo-attach-point="primaryInputField1"/></div><br><div data-dojo-attach-point="primaryInputField2"></div></div>';
            return htmlstring;
        },

    });
});