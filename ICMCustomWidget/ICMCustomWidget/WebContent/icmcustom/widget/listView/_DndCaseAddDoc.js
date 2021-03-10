define([
	"dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/dom-style",
	"dojo/aspect",
    "icm/base/Constants",
    "icm/model/Case",
	"icm/model/UpdatingBatch",
	"icm/model/ExternalDocumentReferenceEditable",
    "icmcustom/widget/listView/AddContentItemDialog",
	"ecm/widget/listView/gridModules/DndFromDesktopAddDoc"
], function(declare, lang, domStyle, aspect, Constants, Case, UpdatingBatch, ExternalDocumentReferenceEditable, AddContentItemDialog, DndFromDesktopAddDoc) {

	/**
	 * @private
	 * @name icm.widget.listView.DndCaseAddDoc
	 * @class Inherits from Navigator DnD module to support drag-n-drop add new document by drag-n-drop. 
	 * @augments ecm.widget.listview.grid.Modules.DndFromDesktopAddDoc
	 */
	return declare("icm.widget.listView.DndCaseAddDoc", DndFromDesktopAddDoc, {
		// summary:
		//		This module provides custom drag-n-drop feature also support filter doc types option.
		// description:

		
		displayDialog: function(files, targetItem, teamspace, defaultClass) {
			
			var callback = lang.hitch(this, function(caze) {
				var externalDocumentsAllowed;
				var repoList = null;
				var defaultFolder = null;
				var setFolderTargetCalled = false;
				var contentItemGeneralPane;
				var caseEditable = caze.createEditable();
				this.caseType = caseEditable.getCase().caseType;
				
				externalDocumentsAllowed = this.caseType.externalDocumentsAllowed;
				if (externalDocumentsAllowed === undefined) {
					externalDocumentsAllowed = false;
				}
				
				if (this.addContentItemDialog) {
					this.addContentItemDialog.destroyRecursive();
				}
				this.addContentItemDialog = new AddContentItemDialog();
				
				if (defaultClass) {
					this.addContentItemDialog.setDefaultContentClass(defaultClass);
				}
				this.addContentItemDialog.setFiles(files);
				
				contentItemGeneralPane = this.addContentItemDialog.addContentItemGeneralPane;
				
				// TODO: how do we know work item vs. case context?
				this.targetRepository = targetItem.repository;
				this.parentFolder = targetItem;
				if (externalDocumentsAllowed) {
					defaultFolder = this.parentFolder;
					this.parentFolder = this.targetRepository;	
					repoList = "cm,cmis,p8,box";
				}
				else {
					if(this.parentFolder.getContentClass().id != "CmAcmCaseSubfolder"){
						domStyle.set(contentItemGeneralPane._documentOnlyArea, "display", "none");
					}
					// no point to set repoList, we hide Save in selector anyway.
				}
				contentItemGeneralPane.contentSourceTypeChoices = [{
					value: "Document",
					label: ecm.messages.add_document_localfile_label
				}];
				// TODO; missing context for allowContentAsLink and allowNoContent
				
				if (externalDocumentsAllowed) {
					contentItemGeneralPane.showAllRepositories = true;
					if (defaultFolder) {
						aspect.after(this.addContentItemDialog.addContentItemPropertiesPane, "onCompleteRendering", function() {
							if (!setFolderTargetCalled) {
								setFolderTargetCalled = true;
								contentItemGeneralPane.setTargetLocation(defaultFolder, this.targetRepository, defaultFolder.objectStore, null, true, true, true);
							}
						});
					} 
				}
				else {
					contentItemGeneralPane.showAllRepositories = false;
				}
				
				var action = lang.hitch(this, function(contentItem) {
					var getRepositoryConnectionInfo = function(contentItem){
						var externalDocumentRepository = contentItem.repository;

						var repositoryConnectionInfo = externalDocumentRepository.serverName + "|";
						if(externalDocumentRepository._isP8()){
							repositoryConnectionInfo +=  contentItem.repository.domainId;
							
						}else if(externalDocumentRepository._isOnDemand()){
							repositoryConnectionInfo += contentItem.parent.id;  //Need to include CMOD Search folder name
						}else if(externalDocumentRepository._isCmis()){
							
						}
						return repositoryConnectionInfo;
					};
						
					var getRepositoryType = function(contentItem){
						var repositoryType = Constants.ExternalRepositories.P8;
						if(contentItem.repository.type =="cm")
							repositoryType = Constants.ExternalRepositories.CM8;
						else if(contentItem.repository.type =="od")
							repositoryType = Constants.ExternalRepositories.CMOD;
						else if(contentItem.repository.type =="cmis")
							repositoryType = Constants.ExternalRepositories.CMIS;
						return repositoryType;
					};	
						
					var copyExternalDocumentTitleAllowed = this.caseType.copyExternalDocumentTitleAllowed;
					var updatingBatch = UpdatingBatch.createNew(this.targetRepository);
					var currentRepository = false;
					var externalDocReference;
					
					if(contentItem.repository.id == targetItem.repository.id){
						currentRepository = true; //If documents are from current TOS, do not go through Batch Update to create proxies
						targetItem.addToFolder(contentItem);
					} else {
						var documentTitle = "External Document";
						if(copyExternalDocumentTitleAllowed) {
							documentTitle = contentItem.name;
						}
						var repositoryConnectionInfo = getRepositoryConnectionInfo(contentItem);
						var repositoryType = getRepositoryType(contentItem);
						externalDocReference = ExternalDocumentReferenceEditable.createNew(
						        targetItem,
						        contentItem,
								documentTitle);
						updatingBatch.addExternalDocument (externalDocReference);
						updatingBatch.updateBatch (lang.hitch(this, function (ub) {
							targetItem.refresh();
						}));
					}
				});
				
				var _dialogCallBack = externalDocumentsAllowed ? action : null;
				
				if (this.filterDocTypesOn) {
					var currSolution = this.solution;
					currSolution.retrieveDocumentTypes(lang.hitch (this, function (docTypes) {
							var dcList = null;
							if (docTypes && docTypes.length > 0) {
								dcList = new ecm.model.Teamspace ({
											repository: this.targetRepository,
											name: this.targetRepository.name,
											type: ecm.model.Teamspace.RUNTIME,
											addAllowAllClasses: false,
											contentClasses: docTypes,
											defaultClass: null
											});
							}
							this.addContentItemDialog.show(this.targetRepository, this.parentFolder, true, false, _dialogCallBack, dcList, false, null, true, repoList);
					}));
				}
				else {
					this.addContentItemDialog.show(this.targetRepository, this.parentFolder, true, false, _dialogCallBack, null, false, null, true, repoList);
				}
			});
			
			if (targetItem && targetItem.repository && targetItem.repository.type == "box") {
				// handle DnD add doc to box folder.
				if (this.addContentItemDialog) {
					this.addContentItemDialog.destroyRecursive();
				}
				this.addContentItemDialog = new AddContentItemDialog();
				if (defaultClass) {
					this.addContentItemDialog.setDefaultContentClass(defaultClass);
				}
				this.addContentItemDialog.setFiles(files);
				contentItemGeneralPane = this.addContentItemDialog.addContentItemGeneralPane;
				domStyle.set(contentItemGeneralPane._documentOnlyArea, "display", "none");				
				this.addContentItemDialog.show(targetItem.repository, targetItem, true, false, null, null, false, null, true, null);
			}
			else {
				// handle DnD add doc to P8 folder.
				var root = targetItem;
				while (!root.isRoot) {
					root = root.parent;
				}
				Case.fromContentItem(root, callback);
			}
		}
		
	});
});
