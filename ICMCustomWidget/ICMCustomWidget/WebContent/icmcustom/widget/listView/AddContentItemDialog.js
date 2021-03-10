define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/_base/array",
	"dojo/_base/sniff",
	"dojo/aspect",
	"dojo/dom-class",
	"dojo/dom-style",
	"dojo/dom-attr",
	"dojo/dom-construct",
	"dojo/_base/json",
	"dojo/data/ItemFileWriteStore",
	"dojo/io/iframe",
	"dojo/store/DataStore",
	"dojo/aspect",
	"dojo/string",
	"dojo/query",
	"dijit/form/Select",
	"dijit/layout/BorderContainer",
	"dijit/layout/ContentPane",
	"dijit/layout/TabContainer",
	"idx/html",
	"idx/layout/TitlePane",
	"ecm/Messages",
	"ecm/model/Message",
	"ecm/widget/dialog/BaseDialog",
	"ecm/widget/dialog/BatchResultsDialog",
	"ecm/widget/dialog/BatchStatusDialog",
	"ecm/widget/AddContentItemGeneralPane",
	"ecm/widget/AddContentItemPropertiesPane",
	"ecm/widget/AddContentItemSecurityPane",
	"ecm/widget/_FolderSelectorDropDown",
	"ecm/widget/FolderSelectorCallback",
	"ecm/widget/CheckBox",
	"ecm/widget/FolderSelector",
	"ecm/widget/dialog/StartWorkflowDialog",
	//"ecm/model/FileTracker",
	"ecm/model/Request",
/*	"ecm/model/_entryTemplateUtils",
	"ecm/model/ContentItem",
	"dijit/ProgressBar",
	"../dialog/MessageDialog",*/ //
	"dojo/text!./templates/AddContentItemDialogContent.html"
],

function(declare, lang,array,has, aspect,domClass,domStyle,domAttr, domConstruct,dojojson, ItemFileWriteStore, iframe, DataStore, aspect,string,query, //
Select,BorderContainer,ContentPane, TabContainer,idxHtml, TitlePane,Messages,Message,BaseDialog,BatchResultsDialog,BatchStatusDialog,
AddContentItemGeneralPane, AddContentItemPropertiesPane,AddContentItemSecurityPane,_FolderSelectorDropDown,FolderSelectorCallback, //
CheckBox, //
FolderSelector, //
StartWorkflowDialog,
//FileTracker, //
Request, //
/*EntryTemplateUtils,//
ContentItem, //
ProgressBar, //
MessageDialog,*/ //
template) {

	/**
	 * @name ecm.widget.dialog.AddContentItemDialog
	 * @class Provides a dialog box that is used to add documents or folders to a repository. Users can use this dialog
	 *        box to specify all required parameters for adding documents or folders.
	 * @augments ecm.widget.dialog.BaseDialog
	 */
	return declare("icmcustom.widget.listView.AddContentItemDialog", [
		BaseDialog
	], {
		/** @lends ecm.widget.dialog.AddContentItemDialog.prototype */
		contentString: template,
		widgetsInTemplate: true,

		/**
		 * An instance of {@link ecm.model.Repository} representing the repository that is selected for this add.
		 * stored.
		 */
		repository: null,

		/**
		 * An instance of the parent folder {@link ecm.model.ContentItem} for this add.
		 */
		parentFolder: null,

		/**
		 * When the <code>parentFolder</code> is assigned, this boolean option overrides the default behavior for 
		 * whether or not the user is allowed to browse for a different folder.
		 * 
		 * When this option is not set, the default behavior is the user is only allowed to browse for a different 
		 * folder if no parentFolder is set or if the parentFolder is the root folder. 
		 */
		allowBrowseParentFolder: null,
		
		/**
		 * A boolean value that indicates whether or not file input selection should be limited to a single document
		 * only under HTML5 browsers.
		 * 
		 * @since 2.0.3.7
		 */
		singleDocumentSelect: false,

		/**
		 * Destroy this dialog when the entire add operation has finished or the add dialog has been cancelled.
		 * 
		 * @since 2.0.3.7
		 */
		destroyWhenFinished: false,
		
		/**
		 * A boolean value that indicates whether to show the name of the entry template when there's only one entry template available.
		 * 
		 * @since 3.0.6
		 */
		showEntryTemplateName: false,

		_messages: ecm.messages,
		_callback: null,
		_objectStore: null,
		_documentItem: null,
		_textBoxes: null,
		_fileName: null,
		_dialogTitle: "",
		_typeDocument: true,
		_virtualItems: false,
		_validationCallback: null, // Used by teamspace templates.
		_actionButton: null,
		_desktopFolder: null,
		_useTemplate: false,
		_entryTemplateIsFromFolder: false,
		_entryTemplate: null,
		_entryTemplates: null,
		_filterType: null,
		_checkin: false,
		_item: null,
		_showMultiRepoFolderSelector: false,
		_defaultContentClass: null,
		_useTeamspaceACL: true,
		_isWorkflowRunning: false,
		_repositoryTypes: null,
		_originalFolder: null,
		_appGrp: null, // Used by CMOD 
		_daejaContent: null,
		_daejaPartFileName: null,
		_statusMessage: null,
		_uploadViaAspera: false,		

		/**
		 * @private
		 */
		constructor: function(params) {
			if (!this._documentItem) {
				this._documentItem = [];
			}
			if (!this._textBoxes) {
				this._textBoxes = [];
			}
		},

		postCreate: function() {
			this.inherited(arguments);
			this.setMaximized(true);
			this.setSizeToViewportRatio(true);
			domAttr.set(this.addContentItemPropertiesTitlePane.containerNode, "role", "group");
			if (!this._checkin) {
				this._actionButton = this.addButton(this.messages.add_document_add_label, this._getAddFunctionName(), false, true, "ADD");
			}
			this.own(aspect.after(this, "onAddFinished", lang.hitch(this, function() {
				if (this.destroyWhenFinished) {
					setTimeout(lang.hitch(this, function() {
						this.destroyRecursive();
					}), 250);
				}
			})));
		},

		_getAddFunctionName: function() {
			return "onAdd";
		},

		/**
		 * This event is fired when the entire add operation has completed or the add dialog has been cancelled.
		 */
		onAddFinished: function() {
		},

		/**
		 * This event is fired when the add operation has failed.
		 */
		onAddFailed: function(response) {
		},

		/**
		 * Displays the Add dialog for adding documents and folders.
		 * 
		 * @param repository
		 *            The {@link ecm.model.Repository} for the add. May be overridden by entry template settings.
		 * @param parentFolder
		 *            The parent folder for added items. May be overridden by entry template settings. This may be a
		 *            {@link ecm.model.ContentItem}, {@link ecm.model.WorkItem} or {@link ecm.model.Repository}.
		 * @param typeDocument
		 *            A boolean value indicating if a document (<code>true</code>) or folder (<code>false</code>)
		 *            is being added.
		 * @param virtualItems
		 *            A boolean value indicating that the content item should not be created in the repository. The new
		 *            item is still passed to the callback method when the Add dialog is closed. This is used to define
		 *            folders in teamspace templates that are not created until a teamspace instance is created from the
		 *            teamspace template.
		 * @param callback
		 *            A function that is called after a content item is created. The new content item is passed to the
		 *            callback method.
		 * @param teamspace
		 *            The {@link ecm.model.Teamspace} for the add if working within a teamspace.
		 * @param useTemplate
		 *            A boolean value indicating if the entry template passed in the <code>entryTemplate</code>
		 *            parameter should be applied (<code>true</code>) when the add dialog is opened.
		 * @param entryTemplate
		 *            The value can either be an {@link ecm.model.EntryTemplate} object that should be applied
		 *            immediately (<code>useTemplate</code> is true), or an array of {@link ecm.model.EntryTemplate}
		 *            objects that are presented for the user to choose from. If an entry template is not already
		 *            retrieved then it is retrieved when it is applied to the add dialog.
		 * @param showMultiRepoFolderSelector
		 *            A boolean value indicating if the folder selector that supports choosing a folder from a
		 *            repository other than the current repository should be used (<code>true</code>).
		 * @param repositoryTypes
		 *            A comma separated string containing the list of repository types. Not required if only using
		 *            dialog in P8 (Since 2.0.3). Must set showMultiRepoFolderSelector parameter to true.
		 * @param repositoryDocumentMode
		 *            A boolean value indicating if the dialog should render in repository document content type mode.
		 * @since 2.0.3.6
		 * @param virtualItemObjects
		 *            An array of {@link ecm.model.ContentItem} that will be added from some repository.
		 */
		show: function(repository, parentFolder, typeDocument, virtualItems, callback, teamspace, useTemplate, entryTemplate, showMultiRepoFolderSelector, repositoryTypes, repositoryDocumentMode, virtualItemObjects) {
			var d = this.inherited(arguments);

			this.repository = repository;
			this.parentFolder = parentFolder || null;
			this._originalFolder = this.parentFolder;
			this._desktopFolder = this.parentFolder;
			this._typeDocument = typeDocument;
			this._virtualItems = virtualItems || null;
			this._repositoryDocumentMode = !!repositoryDocumentMode;
			this._virtualParent = parentFolder || null;
			this._callback = callback || null;
			this._teamspace = teamspace || null;
			this._useTemplate = !!useTemplate;
			this._repositoryTypes = repositoryTypes || null;
			this._virtualItemObjects = virtualItemObjects || null;

			var entryTemplateList = null;
			if (lang.isArray(entryTemplate)) {
				entryTemplateList = entryTemplate;
			} else {
				this._entryTemplate = entryTemplate || null;
			}
			// Clear any error message.
			this._clearErrorMessage();

			// Hide security if: 
			//			Virtual folders 
			//		or  there is an active entry template that does not override the class security and does not allow the user to change the security
			//		or	Not a P8 repository (changing security may be allowed on P8 when an entry template is not used)
			// Setting security is not supported on other repository types at this time. 
			this._alwaysHideSecurity = ((!typeDocument && virtualItems) || (this._entryTemplate && !this._entryTemplate.overrideClassSecurity && !this._entryTemplate.allowUserSetSecurity) || !repository._isP8());

			this.addContentItemGeneralPane._showMultiRepoFolderSelector = showMultiRepoFolderSelector ? showMultiRepoFolderSelector : false;
			this.addContentItemGeneralPane._repositoryTypes = this._repositoryTypes;
			this.addContentItemGeneralPane.singleDocumentSelect = this.singleDocumentSelect;

			if (typeDocument && !this._fileName) {
				if (this.addContentItemGeneralPane.hasMultipleDocuments()) {
					if (this._useTemplate) {
						this.set("title", this._messages.add_documents_using_template_dialog_title);
						this.setIntroTextRef(this._messages.learn_more, (ecm.model.desktop.getHelpUrl(true) || "") + "euche013.htm");
					} else {
						this.set("title", this._messages.add_documents_dialog_title);
					}
					this.setIntroText(this._messages.add_documents_context_info);
				} else {
					if (this._useTemplate) {
						this.set("title", this._messages.add_document_using_template_dialog_title);
						this.setIntroText(this._messages.add_document_using_template_context_info);
						this.setIntroTextRef(this._messages.learn_more, (ecm.model.desktop.getHelpUrl(true) || "") + "euche013.htm");
					} else {
						this.set("title", this._messages.add_document_dialog_title);
						this.setIntroText(this._messages.add_document_context_info);
					}
				}
				if (repository._isP8() || repository._isCmis()) {
					this.addContentItemGeneralPane.setAsMajorVersion(repository.addAsMajorVersion);
				}
				if (!this._filterType) {
					this._filterType = "createDocument";
				}

			} else {
				if (this._useTemplate) {
					this.set("title", this._messages.create_folder_using_template_dialog_title);
					this.setIntroText(this._messages.create_folder_using_template_context_info);
					this.setIntroTextRef(this._messages.learn_more, (ecm.model.desktop.getHelpUrl(true) || "") + "euche013.htm");
				} else {
					this.set("title", this._messages.create_folder_dialog_title);
					this.setIntroText(this._messages.create_folder_context_info);
				}
				if (!this._filterType) {
					this._filterType = "createFolder";
				}
			}

			if (this._alwaysHideSecurity) {
				domStyle.set(this.addContentItemSecurityTitlePane.domNode, "display", "none");
				domClass.add(this.ecmAddContentItemBorderContainer.domNode, "ecmAddContentItemDialogNoSecurityPane");
			} else {
				// Hide security until we determine it should be shown.
				domStyle.set(this.addContentItemSecurityTitlePane.domNode, "display", "none");
			}

			this.addContentItemGeneralPane.createRendering(this);
			this.addContentItemSecurityPane.setAddContentItemDialog(this);
			this.addContentItemPropertiesPane.setAddContentItemDialog(this);

			this.own(aspect.after(this.addContentItemPropertiesPane, "onChange", lang.hitch(this, "_onChangeProperties"), true));
			this.own(aspect.after(this.addContentItemPropertiesPane, "onMarkingPropertyChange", lang.hitch(this, "_onMarkingPropertyChange"), true));
			
						
			this.own(aspect.after(this.addContentItemPropertiesPane, "onCompleteRendering", lang.hitch(this, function() {
				this.addContentItemPropertiesPane.setDefaultDocumentTitle();
				if (this._repositoryDocumentMode) {
					this._copyCommonFieldValues();
					this.connect(this.addContentItemPropertiesPane._commonProperties, "onMetaDataTemplateChanged", lang.hitch(this, function(templateId) {
						this._copyCommonFieldValues(templateId);
					} ));
				}
				
				// Update the security.
				if (!this._doNotUpdateSecurity && (this.repository._isP8() || (this.repository._isCM() && this._entryTemplate && (this._entryTemplate.overrideClassSecurity || this._entryTemplate.allowUserSetSecurity)))) {
					this.addContentItemSecurityPane.setContentClass(this.addContentItemPropertiesPane._contentClass, this._typeDocument);
					if (this._entryTemplate) {
						this._onMarkingPropertyChange();
					}
				}
				delete this._doNotUpdateSecurity;

				this._onChangeProperties();
				this.addContentItemPropertiesPane.resizeCommonProperties();
				
				if (this.repository._isP8() && (ecm.model.desktop.uploadViaAspera && !ecm.model.desktop.AsperaConnectInstalled) && !this._addEditServiceTemplates) {
					this.setMessage( this.messages.aspera_adding_connect_not_installed_warning, "warning");
				}

				this.resize();
			}), true));
			this.own(aspect.after(this.addContentItemPropertiesPane, "onRetrySave", lang.hitch(this, "onAdd"), true));

			if (this.repository._isOnDemand()) {
				domStyle.set(this.addContentItemPropertiesPane._contentClassSelectorDiv, "display", "none");
				domStyle.set(this.addContentItemPropertiesPane._contentClassNameDiv, "display", "none");

				// Retrieve appGrpName for Ondemand repository
				var cb = lang.hitch(this, function(appGrp) {
					this._appGrp = appGrp; // Used by CMOD 
					this._setAppGroupNameSelector();
				});
				this.repository.retrieveODAppGroups(cb, this.parentFolder.id);
			}

			if (this.repository._isBox()) {
				domStyle.set(this.addContentItemPropertiesPane._contentClassSelectorDiv, "display", "none");
				domStyle.set(this.addContentItemPropertiesPane._contentClassNameDiv, "display", "none");
			}

			if (this._useTemplate) {
				// Display the class as read-only.
				domStyle.set(this.addContentItemPropertiesPane._contentClassSelectorDiv, "display", "none");
				domStyle.set(this.addContentItemPropertiesPane._contentClassNameDiv, "display", "");
				this._contentClassDiv = this.addContentItemPropertiesPane._contentClassNameDiv;

				// Show entry templates.
				domStyle.set(this.addContentItemGeneralPane._entryTemplateRow, "display", "");

				if (this._entryTemplate != null) {
					// The entry template was passed in. 
					this.applyEntryTemplate(false);
				} else {
					this._applyDesktopShowSecurity();

					// An entry template must be selected.
					domAttr.set(this.addContentItemGeneralPane._entryTemplateSelector, "required", true);

					// Disable while loading the templates list.
					this.addContentItemGeneralPane._entryTemplateSelector.set("disabled", true);
					this.addContentItemGeneralPane.folderSelector.set("disabled", true);
					this.addContentItemGeneralPane._contentSourceType.set("disabled", true);

					domAttr.set(this.addContentItemGeneralPane._fileInput, "disabled", true);
					this.addContentItemGeneralPane._majorVersion.set("disabled", true);
					domClass.add(this.addContentItemGeneralPane._majorVersionLabel, "labelReadOnly");
					this.addContentItemGeneralPane._autoClassify.set("disabled", true);
					domClass.add(this.addContentItemGeneralPane._autoClassifyLabel, "labelReadOnly");

					this.addContentItemGeneralPane._startOnWorkflow.set("disabled", true);
					this.addContentItemPropertiesTitlePane.set("disabled", true);
					this.addContentItemPropertiesPane._contentClassNameTextBox.set("disabled", true);
					this.addContentItemSecurityTitlePane.set("disabled", true);

					var cb = lang.hitch(this, function(entryTemplates) {
						this._entryTemplates = entryTemplates;
						var templateItems = [];
						for (var i = 0; i < entryTemplates.length; i++) {
							templateItems.push({
								// A non-empty display name must be set, otherwise when no value is entered and focus 
								// leaves the field the first entry template with a blank label will be selected.
								label: entryTemplates[i].name ? entryTemplates[i].name : entryTemplates[i].id,
								value: String(i),
								entryTemplateId: this.repository._isCM() ? entryTemplates[i].itemId : entryTemplates[i].id
							});
						}

						var templateItemsStore = new DataStore({
							"store": new ItemFileWriteStore({
								data: {
									identifier: "value",
									label: "label",
									items: templateItems
								}
							})
						});

						this.addContentItemGeneralPane._entryTemplateSelector.store = templateItemsStore;
						this.addContentItemGeneralPane._entryTemplateSelector.set("disabled", false);
						
						//if there is only one entry template to be listed, select it automatically.
						if( this._entryTemplates.length==1 ){
							this.addContentItemGeneralPane._entryTemplateSelector.set("value", 0);
						}
						this._onEntryTemplatesRetrieved(this._entryTemplates.length);
					});

					if (entryTemplateList) {
						// Load the provided entry template list.
						cb(entryTemplateList);
					} else {
						this.repository.retrieveEntryTemplates(cb, typeDocument ? "Document" : "Folder", null, null, null, lang.hitch(this, function() {
							this._onEntryTemplatesRetrieved(0);
						}));
					}
				}
			} else {
				this._applyDesktopShowSecurity();
			}

			var parentFolder = this.parentFolder;
			if (virtualItems && (parentFolder && parentFolder["isVirtual"] == true))
				parentFolder = null;

			// If no entry template, use the parent folder object store.
			if (!this._entryTemplate) {
				this._objectStore = (parentFolder && parentFolder.objectStore);
			}

			// Set this handler here, before the folder is selected below.
			this.own(aspect.after(this.addContentItemGeneralPane, "onFolderSelect", lang.hitch(this, "_onFolderSelect"), true));

			if (this._typeDocument) {
				if (repository._isCM()) {
					this.addContentItemGeneralPane._unfiledLabel.innerHTML = this._messages.add_document_save_document_as_unfiled_label;
					this.addContentItemGeneralPane._addUnfiledHoverHelp.set("message", this._messages.add_document_save_document_as_unfiled_hover);
				}
				// Initialize the folder selector control if there is no entry template.
				if (!this._entryTemplate) {
					if (this.hasDaejaContent()) {
						var choices = [ "DaejaDocument" ];
						this.addContentItemGeneralPane.addContentSourceTypeChoices(choices);
						domStyle.set(this.addContentItemGeneralPane._contentSourceTypeDiv, "display", "none");
						domStyle.set(this.addContentItemGeneralPane._fileInputArea, "display", "none");
					}

					var parent = parentFolder;
					if (this._teamspace && this._virtualParent) {
						parent = this._virtualParent;
					} else if (this._repositoryDocumentMode) {
						var choices = [];
						choices.push("RepositoryDocument");
						this.addContentItemGeneralPane.addContentSourceTypeChoices(choices);
						domStyle.set(this.addContentItemGeneralPane._contentSourceTypeDiv, "display", "none");
						domStyle.set(this.addContentItemGeneralPane._fileInputArea, "display", "none");
					}

					if (this.repository._isOnDemand()) {
						this.addContentItemGeneralPane.folderSelector.set("disabled", true);
						this.addContentItemGeneralPane.folderSelector.setLabel(this.parentFolder.name, false);
						this.parentFolder = null;
					} else {
						this.addContentItemGeneralPane.setParentFolder(parent, this.repository, this._objectStore, this._teamspace, this.allowBrowseParentFolder);
						if (!this._checkin) {
							this.addContentItemPropertiesPane.setParentFolder(parent);
						}
					}
				}
			} else {
				if (repository._isCM()) {
					this.addContentItemGeneralPane._unfiledLabel.innerHTML = this._messages.create_folder_save_folder_as_unfiled_label;
					this.addContentItemGeneralPane._addUnfiledHoverHelp.set("message", this._messages.create_folder_save_folder_as_unfiled_hover);
				}
				if (this._useTemplate) { // Adding a folder and templates are active
					// Initialize the folder selector control if there is no entry template.
					if (!this._entryTemplate) {
						this.addContentItemGeneralPane.setParentFolder(parentFolder, this.repository, this._objectStore, this._teamspace);
						if (!this._checkin) {
							this.addContentItemPropertiesPane.setParentFolder(parentFolder);
						}
					}
				} else { // Adding a folder and templates are not active...

					// Set permission to check for folder add.
					this.folderSelectorCallback = new FolderSelectorCallback();

					// Set the permission in the callback function needed to add a folder on each parent.
					this.folderSelectorCallback.isSelectableByPermission.permissionToCheck = "privAddLink";
					this.folderSelectorCallback.isSelectableByPermission.notSelectableTooltip = this._messages.no_permission_add_folder;
					this.addContentItemGeneralPane.folderSelector.setIsSelectableCallback(this.folderSelectorCallback.isSelectableByPermission);

					this.addContentItemGeneralPane.setParentFolder(parentFolder, this.repository, this._objectStore, this._teamspace, this.allowBrowseParentFolder);
					if (!this._checkin) {
						this.addContentItemPropertiesPane.setParentFolder(parentFolder);
					}

					if (parentFolder != null) {
						// Set the folder and disable the control.
						this.addContentItemGeneralPane.folderSelector.set("disabled", true);
						this.addContentItemGeneralPane.folderSelector.setTeamspace(teamspace);

						if (parentFolder.rootFolder) {
							// Add "Save as unfiled" checkbox if needed.
							if (repository._isCM()) {
								this.addContentItemGeneralPane._allowAddUnfiled(repository, null, null);
							} else {
								this.addContentItemGeneralPane.folderSelector.setRoot(repository);
							}
						} else {
							this.addContentItemGeneralPane.folderSelector.setRoot(parentFolder);
						}
					} else {
						if (teamspace != null) {
							this.addContentItemGeneralPane.folderSelector.setTeamspace(teamspace);
							if (teamspace.type != ecm.model.Teamspace.RUNTIME) {
								this.addContentItemGeneralPane.folderSelector.set("disabled", true);
								this.addContentItemGeneralPane.folderSelector.setRoot(this._virtualParent);
							} else {
								this.addContentItemGeneralPane.folderSelector.setRoot(teamspace);
							}
						} else {
							// Add "Save as unfiled" checkbox if needed.
							if (repository._isCM()) {
								this.addContentItemGeneralPane._allowAddUnfiled(repository, null, null);
							} else {
								this.addContentItemGeneralPane.folderSelector.setRoot(repository);
							}
						}
					}
				}
			}

			this.own(aspect.after(this.addContentItemGeneralPane, "onContentSourceTypeChange", lang.hitch(this, "_onChangeProperties"), true));
			this.own(aspect.after(this.addContentItemGeneralPane, "onFileInputChange", lang.hitch(this, "_onFileInputChange"), true));
			this.own(aspect.after(this.addContentItemGeneralPane, "onExternalURLChange", lang.hitch(this, "_onFileInputChange"), true));
			this.own(aspect.after(this.addContentItemGeneralPane, "onMajorCheckboxChange", lang.hitch(this, "_onMajorCheckboxChange"), true));
			this.own(aspect.after(this.addContentItemGeneralPane, "onEntryTemplateSelectorChange", lang.hitch(this, "_onEntryTemplateSelectorChange"), true));
			this.own(aspect.after(this.addContentItemGeneralPane, "onEntryTemplateSelectorBlur", lang.hitch(this, "_onEntryTemplateSelectorBlur"), true));
			this.own(aspect.after(this.addContentItemGeneralPane, "onAppGroupNameSelectorChange", lang.hitch(this, "_onAppGroupNameSelectorChange"), true));
			this.own(aspect.after(this.addContentItemGeneralPane, "onAppNameSelectorChange", lang.hitch(this, "_onAppNameSelectorChange"), true));
			this.own(aspect.after(ecm.model.desktop, "onChangeUploadProgress", lang.hitch(this, "_changeUploadProgress"), true));
			this.own(aspect.after(ecm.model.desktop, "onCompleteUploadProgress", lang.hitch(this, "_completeUploadProgress"), true));

			this.addContentItemPropertiesPane.filterType = this._filterType;
			this.addContentItemPropertiesPane.createRendering(parentFolder);

			// For the save Daeja content use case, disable the file selector.
			// The content for the new document is provided by Daeja.
			if (this.hasDaejaContent()) {
				this.addContentItemGeneralPane.onContentSourceTypeChange();
			}

			return d;
		},

		/**
		 * @private
		 */
		_onEntryTemplatesRetrieved: function(numberOfEntryTemplatesRetrieved) {
		},

		/**
		 * For the add Daeja content as a new document use case, this callback is called when new a content class is selected.
		 * Invoke _onFileInputChange to update the file name property with the file name retrieved from the original document.
		 */
		_onContentClassSelected: function() {
			if (this.hasDaejaContent()) {
				this._onFileInputChange();
			}
		},

		/**
		 * @private
		 */
		_onAppGroupNameSelectorChange: function() {
			this.addContentItemGeneralPane._appNameSelector.reset();
			// Retrieve appName for OnDemand repository
			var _appGrpSelected = this.addContentItemGeneralPane._appGroupNameSelector.get("value");

			var appNamestoreData = [];
			for (var i = 0; i < this._appGrp.length; i++) {
				var appList = this._appGrp[i].appList;

				if (this._appGrp[i].lable == _appGrpSelected) {
					for (var j = 0; j < appList.length; j++) {
						appNamestoreData.push({
							"value": appList[j],
							"label": appList[j]

						});
					}
				}
			}

			this.addContentItemGeneralPane._appNameSelector.store = new DataStore({
				"store": new ItemFileWriteStore({
					data: {
						identifier: 'value',
						label: 'label',
						items: appNamestoreData
					}
				})
			});
		},
		/**
		 * @private
		 */
		_onAppNameSelectorChange: function() {
			// Retrieve appName for OnDemand repository
			var _appGrpSelected = this.addContentItemGeneralPane._appGroupNameSelector.get("value");
			var _appSelected = this.addContentItemGeneralPane._appNameSelector.get("value");
			if (_appSelected && _appSelected != "" && this.addContentItemPropertiesPane._commonProperties) {

				this.addContentItemPropertiesPane._commonProperties.renderAttributes(this.addContentItemPropertiesPane._commonProperties.attributeDefinitions, null, "create", false);

				var fields = this.addContentItemPropertiesPane._commonProperties.getFields();
				for ( var i in fields) {
					var appGrpList = fields[i].attributeDefinition.application_group;
					if (array.some(appGrpList, function(appGrpList) {
						return appGrpList == _appGrpSelected
					})) {
						fields[i].setDisabled(false);
						if (fields[i].attributeDefinition.contentClass && fields[i].attributeDefinition.contentClass.edsIsEnabled && fields[i].attributeDefinition.updatedRequired)
							fields[i].required = fields[i].attributeDefinition.required;
						else
							fields[i].required = true;

					} else {
						fields[i].reset();
						//fields[i].set("value", "");
						fields[i].setDisabled(true);
						fields[i].required = false;
					}
				}
			}
		},
		/**
		 * @private
		 */
		_applyDesktopShowSecurity: function() {
			if (this._alwaysHideSecurity) {
				return;
			}
			if (this.repository._isP8() && ecm.model.desktop.showSecurity) {
				domStyle.set(this.addContentItemSecurityTitlePane.domNode, "display", "");
			}
		},

		/**
		 * Displays the Add dialog for adding documents and folders using an entry template.
		 * 
		 * @param repository
		 *            The {@link ecm.model.Repository} for the add. Can be overridden by the entry template settings.
		 * @param parentFolder
		 *            The {@link ecm.model.ContentItem} parent folder for added items. Can be overridden by the entry
		 *            template settings.
		 * @param typeDocument
		 *            A boolean value indicating if a document (<code>true</code>) or folder (<code>false</code>)
		 *            is being added. This will be overridden by the entry template setting.
		 * @param virtualItems
		 *            A boolean value indicating that the content item should not be created in the repository. The new
		 *            item is still passed to the callback method when the Add dialog is closed. This is used to define
		 *            folders in teamspace templates that are not created until a teamspace instance is created from the
		 *            teamspace template.
		 * @param callback
		 *            A function that is called after a content item is created. The new content item is passed to the
		 *            callback method.
		 * @param teamspace
		 *            The {@link ecm.model.Teamspace} for the add if working within a teamspace.
		 * @param selectedItem
		 *            The {@link ecm.model.ContentItem} for the entry template. If the content item is not an entry
		 *            template then the add proceeds with no entry template. The {@link ecm.model.EntryTemplate} object
		 *            for the entry template content item is retrieved before the add dialog is displayed.
		 */
		showUsingTemplateItem: function(repository, parentFolder, typeDocument, virtualItems, callback, teamspace, selectedItem) {
			var useSelectedTemplate = false;

			if (selectedItem != null) {
				if (selectedItem.isDocumentEntryTemplate() || selectedItem.isFolderEntryTemplate()) {
					useSelectedTemplate = true;

					var entryTemplateId = repository._isCM() ? selectedItem.itemId : selectedItem.id;
					var entryTemplate = repository.getEntryTemplateById(entryTemplateId, selectedItem.name, selectedItem.objectStore);
					if (repository._isCM() && !entryTemplate.isRetrieved) {
						entryTemplate.id = selectedItem.id;
					}
					var entryTemplateRetrievedHandler = lang.hitch(this, function(entryTemplate) {
						if (entryTemplate) {
							if(selectedItem.urlProperties){
								EntryTemplateUtils.applyEntryTemplateProperties(entryTemplate, selectedItem.urlProperties);
							}
							var folder = entryTemplate.folder;
							if (folder && !folder.hasPrivilege((entryTemplate.type == ecm.model.EntryTemplate.TYPE.FOLDER) ? "privAddLink" : "privAddToFolder") && !entryTemplate.allowUserSelectFolder) {
								var message = ecm.model.Message.createErrorMessage("entry_template_folder_restricted_error", [
									entryTemplate.name,
									folder.name
								]);
								if (message) {
									ecm.model.desktop.addMessage(message);
								}
							} else {
								this.show(repository, parentFolder, (entryTemplate.type == ecm.model.EntryTemplate.TYPE.DOCUMENT), false, callback, teamspace, true, entryTemplate);
							}
						} else {
							this.show(repository, parentFolder, typeDocument, false, callback, teamspace, true, entryTemplate);
						}
					});
					if (!entryTemplate.isRetrieved) {
						entryTemplate.retrieveEntryTemplate(entryTemplateRetrievedHandler, false, false);
					} else {
						entryTemplateRetrievedHandler(entryTemplate);
					}
				}
			}

			if (!useSelectedTemplate) {
				this.show(repository, parentFolder, typeDocument, virtualItems, callback, teamspace, true, null);
			}
		},

		_setErrorMessage: function(msg, desktopAddMessage, messagePart) {
			if (!msg) {
				return;
			}
			if (this._lastErrorMsgNumber != msg.number) {
				if (desktopAddMessage == undefined || desktopAddMessage == true) {
					ecm.model.desktop.addMessage(msg);
				}
				if (!messagePart)
					messagePart = "userResponse";
				this.setMessage(msg[messagePart], "error");
				this._lastErrorMsgNumber = msg.number;
			}
		},

		_clearErrorMessage: function(msg) {
			if (!msg || msg.number == this._lastErrorMsgNumber) {
				this.clearMessage();
				delete this._lastErrorMsgNumber;
			}
		},
		/**
		 * Sets a particular content class as the default content class for the add dialog. This is not required, but if
		 * needed must be called prior to calling one of the add dialog show methods.
		 * 
		 * @param defaultContentClass
		 *            The value can be the content class id string or {@link ecm.model.ContentClass} object.
		 */
		setDefaultContentClass: function(defaultContentClass) {
			this._defaultContentClass = defaultContentClass;
		},

		/**
		 * Sets the list of document files for the add. This is not required, but if needed must be called prior to
		 * calling one of the add dialog show methods.
		 * 
		 * @param files
		 *            A W3C File API FileList that contains one or more File objects. Some examples of sources for a
		 *            FileList include a drag and drop event or the input file control.
		 */
		setFiles: function(files) {
			this.addContentItemGeneralPane.setExternalFiles(files);
		},

		/**
		 * @private
		 */
		_onChangeProperties: function() {
			// Do not disable the action button if there is invalid input.
			// Instead, the user can click the action button and will be directed to the invalid input.
			this.isValid(false);
		},

		/**
		 * @private
		 */
		_onMarkingPropertyChange: function() {
			if (this.repository._isP8() && this.addContentItemPropertiesPane._commonProperties) {
				var properties = this.addContentItemPropertiesPane.getPropertiesJSON();
				this.addContentItemSecurityPane.setProperties(properties);
			}
		},

		/**
		 * @private
		 */
		_addDocumentItemMultiple: function() {
			if (this._documentItems && this._documentItems.length > 0) {
				// Ignore additional attempts to add this document if it is already being added.
				if (this._addingDocument) {
					return;
				}
				this._addingDocument = true;

				var documentItem = this._documentItems[0];
				
				if (documentItem && documentItem.content) {
					this._contentSize = documentItem.content.size;
				}

				var daejaContent = documentItem.contentSourceType == "DaejaDocument";
				var contentSourceParameters;
				var contentFormParameters;
				if (documentItem.contentSourceType == "RepositoryDocument") {
					contentSourceParameters = {
						"contentSourceRepositoryId": documentItem.contentSourceRepositoryId,
						"contentSourceDocId": documentItem.contentSourceDocId,
						"contentSourceDelete": documentItem.contentSourceDelete
					};
				} else if (daejaContent) {
					// Set the Daeja content if is available
					documentItem.contentSourceType = "Document";
					contentSourceParameters = {
						"daejaContent": JSON.stringify(this._daejaContent)
					}
				} else if (this._uploadViaAspera) {
				    
					var filePaths = [];
					var documentTitles = [];
					var asperaInputFiles = this.addContentItemGeneralPane.getAsperaPathArray();
					for (var i = 0; i < asperaInputFiles.length; i++){
						var file = asperaInputFiles[i];
						documentTitles.push(file.name.split('\\').pop().split('/').pop());
						filePaths.push(file.filePath);
					}
					
					contentFormParameters = {
							"filePaths": filePaths,
							"documentTitles": documentTitles,
					}
					
					contentSourceParameters = {}
			
				}

				// For teamspaces, we don't file the document but we have to pass in a root folder for the breadcrumb location in the UI.
				var parentFolder;
				var objectStore = null;
				if (!this._virtualItems) {
					parentFolder = this.parentFolder;
					objectStore = (parentFolder && parentFolder.objectStore);
				}
				if (!objectStore && this._objectStore) {
					objectStore = this._objectStore;
				}

				var request;

				var onAddDocumentRequestCompletedHandler = aspect.after(ecm.model.desktop, "onRequestCompleted", lang.hitch(this, function(completedRequest) {
					if (!request || !request.isSameRequestAs(completedRequest)) {
						return;
					}
					delete this._addingDocument;
					onAddDocumentRequestCompletedHandler.remove();
				}), true);

				var isBackgroundRequest = false;
				var uploadProgress = true;
				var onError;
				this._multiAddCurrFileName = documentItem.filename;

				if (this._multiAddProcessing) {

					// Update the batch status message.
					this._multiAddFileCount += 1;
					if (!this._uploadViaAspera) {
						this._multiAddUpdateStatusMsg(this.messages.add_documents_status_uploading_msg);					
					}
					isBackgroundRequest = true;
					// renew the progress bar for next document
					if (this._batchStatusDialog && this._batchStatusDialog.progressBar) {
						this._batchStatusDialog.progressBar.destroyRecursive();
						this._batchStatusDialog.progressBar = new ProgressBar();
						domConstruct.place(this._batchStatusDialog.progressBar.domNode, this._batchStatusDialog.statusNode, "first");
						domClass.add(this._batchStatusDialog.progressBar.domNode, "progressBarNode");
					}
					if (this._batchStatusDialog) {
						this._batchStatusDialog.showLoadingIcon(false);
					}
					if (this._multiAddAssignFileNameProperty) {
						this._multiAddAssignFileNameProperty.value = documentItem.filename;
					}

					// Capture any add error messages.
					onError = lang.hitch(this, function(response, errorMessages) {
						array.forEach(errorMessages, lang.hitch(this, function(errorMessage) {
							if (errorMessage && errorMessage.level >= 2) {
								if (this._multiAddMessages === undefined) {
									this._multiAddMessages = [];
								}
								this._multiAddMessages.push({
									name: this._multiAddCurrFileName,
									status: this.messages.add_documents_batch_results_status_error,
									statusMessage: errorMessage.text,
									message: errorMessage
								});
							}
						}));
						// Continue adding the rest of the documents.
						this._addDocumentItemCallback(null, null);
						this.onAddFailed(response);
					});
				} else {
					isBackgroundRequest = true;
					// Update the status message for adding single document.
					this._multiAddFileCount = 1;
					this._multiAddNumFiles = 1;
					if (!this._uploadViaAspera){
						this._multiAddUpdateStatusMsg(this.messages.add_documents_status_uploading_msg);				
					}
					onError = lang.hitch(this, function(response, errorMessages) {
						if (this._batchStatusDialog) {
							this._batchStatusDialog.hide();
						} else {
							this._hideStatusDialog();
						}
						array.forEach(errorMessages, lang.hitch(this, function(errorMessage) {
							if (!this._errorDialog) {
								this._errorDialog = new ErrorDialog();
							}
							this._errorDialog.showMessage(errorMessage);
						}));
						this.onAddFailed(response);
					});
				}
				
				if (this._uploadViaAspera && this._batchStatusDialog && this._batchStatusDialog.progressBar){
					this._batchStatusDialog.showProgressBar(false);
					this._batchStatusDialog.showLoadingIcon(true);
				}

				if (documentItem.inputForm) {
					request = this.repository.addDocumentItemUsingForm(parentFolder, objectStore, documentItem.templateName, documentItem.contentSourceType, documentItem.filename, documentItem.inputForm, documentItem.securityPolicyId, documentItem.addAsMinorVersion, documentItem.autoClassify, documentItem.allowDuplicateFileNames, documentItem.setSecurityParent, documentItem["teamspaceId"], lang.hitch(this, this._addDocumentItemCallback), isBackgroundRequest, onError, documentItem.compoundDocument);
				} else {
				    if (this._uploadViaAspera){
						onError = lang.hitch(this, function(response, errorMessages) {
							if (this._batchStatusDialog) {
								this._batchStatusDialog.hide();
							} else {
								this._hideStatusDialog();
							}
							array.forEach(errorMessages, lang.hitch(this, function(errorMessage) {
								if (!this._errorDialog) {
									this._errorDialog = new ErrorDialog();
								}
								this._errorDialog.showMessage(errorMessage);
							}));
							this.onAddFailed(response);
						});
						
						this._multiAddCurrFileName = "";
						this._multiAddUpdateStatusMsg(this.messages.aspera_adding_add_metadata_msg);
						this.repository.setupForAsperaAdd(parentFolder, objectStore, documentItem.templateName, documentItem.criterias, documentItem.contentSourceType, 
									documentItem.permissions, documentItem.securityPolicyId, 
									documentItem.addAsMinorVersion, documentItem.autoClassify, documentItem.allowDuplicateFileNames, documentItem.setSecurityParent, documentItem["teamspaceId"], 
									lang.hitch(this, this._uploadToAspera), isBackgroundRequest, onError, documentItem.compoundDocument, contentFormParameters, uploadProgress, documentItem.application_group, 
									documentItem.application, contentSourceParameters);	
					} 
					//if the content size is bigger than 2GB
					else if ((this.repository._isP8() || this.repository._isCM())&& documentItem.content && (documentItem.content.size >= 2147483648|| (documentItem.content.size >= 104857600 && has("mac") && has("safari")))) {
						request = this.repository.addLargeDocumentItem(parentFolder, objectStore, documentItem.templateName, documentItem.criterias, documentItem.contentSourceType, documentItem.mimetype, documentItem.filename, documentItem.content, documentItem.childComponentValues, documentItem.permissions, documentItem.securityPolicyId, documentItem.addAsMinorVersion, documentItem.autoClassify, documentItem.allowDuplicateFileNames, documentItem.setSecurityParent, documentItem["teamspaceId"], lang.hitch(this, this._addDocumentItemCallback), isBackgroundRequest, onError, documentItem.compoundDocument, uploadProgress, documentItem.application_group, documentItem.application, contentSourceParameters, documentItem.templateMetadataValues, documentItem.fullPath);
					} else if (this.repository._isBox() && this.repository.corsUploadEnabled && documentItem.content){
						request = this.repository.addDocumentItemUsingCORS(parentFolder, objectStore, documentItem.templateName, documentItem.criterias, documentItem.contentSourceType, documentItem.mimetype, documentItem.filename, documentItem.content, documentItem.childComponentValues, documentItem.permissions, documentItem.securityPolicyId, documentItem.addAsMinorVersion, documentItem.autoClassify, documentItem.allowDuplicateFileNames, documentItem.setSecurityParent, documentItem["teamspaceId"], lang.hitch(this, this._addDocumentItemCallback), isBackgroundRequest, onError, documentItem.compoundDocument, uploadProgress, documentItem.application_group, documentItem.application, contentSourceParameters, documentItem.templateMetadataValues);
					} else{
						request = this.repository.addDocumentItem(parentFolder, objectStore, documentItem.templateName, documentItem.criterias, documentItem.contentSourceType, documentItem.mimetype, documentItem.filename, documentItem.content, documentItem.childComponentValues, documentItem.permissions, documentItem.securityPolicyId, documentItem.addAsMinorVersion, documentItem.autoClassify, documentItem.allowDuplicateFileNames, documentItem.setSecurityParent, documentItem["teamspaceId"], lang.hitch(this, this._addDocumentItemCallback), isBackgroundRequest, onError, documentItem.compoundDocument, uploadProgress, documentItem.application_group, documentItem.application, contentSourceParameters, documentItem.templateMetadataValues, documentItem.fullPath);
					}
				}

				if (!request) {
					if (onAddDocumentRequestCompletedHandler) {
						onAddDocumentRequestCompletedHandler.remove();
					}
					delete this._addingDocument;
				}
			}
		},
		
		setShowWarnings: function(message) {
			if (!this._warningDialog) {
				this._warningDialog = new MessageDialog({
					buttonLabel: ecm.messages.warning_dialog_title,
					iconClass: "warningIcon",
					tooltip: ecm.messages.warning_dialog_title,
					keepContentAreaOverflowAuto: true
				});
			}
			this._warningDialog.showMessage(message);
		},
		
		_uploadToAspera: function(transferSpec){			
		    this._parentFolderNeedsRefresh = true;
			this._refreshParentFolder();
            this.transferId = transferSpec.destination_root;
            this.transferStarted = false;
            this.transferCancelled = false;
			var connectSettings = {
		        		"allow_dialogs": false
			    };	
			this._multiAddUpdateStatusMsg(this.messages.aspera_adding_upload_content_msg);
			
			this._asperaTransferEventsListener = lang.hitch(this, function(event, obj){
				if (obj.transfers.length > 0){
					//console.log(JSON.stringify(obj, null, 4));
					for (var i = obj.transfers.length - 1; i >=0; i--) {
						var transfer = obj.transfers[i];						
						var transferSpec = transfer.transfer_spec;						
						if (transferSpec && transferSpec.destination_root == this.transferId) {
							this.transfer = transfer;
							this.transferSpec = transferSpec;
							if ((transfer.status == "completed" || transfer.status == "running") && !this.transferCancelled) {
							    console.log("transfer started, status is " + transfer.status);
								if (transfer.status == "completed") {
									console.log("transfer completed,remove listner");
									ecm.model.desktop.asperaWeb.removeEventListener('transfer', this._asperaTransferEventsListener);
									//stop timer here
									if (this.timer) {
										clearInterval(this.timer);
									}
									this.transferCancelled = false;
								}
								if (!this.transferStarted) {
									console.log("start to checkin content from Aspera");
									var cookie = dojojson.fromJson(transferSpec.cookie);
									var documentItem = this._documentItems[0];	
									this.transferStarted = true;
									// Section for checkin
									var documentItemLookup = {}
								    for (docItemIdx in this._documentItems){
										var documentItem = this._documentItems[docItemIdx];
										documentItemLookup[documentItem.filename] = documentItem;
									}
								    // Loop through docs here - call checkin.
									var documentKeys = Object.keys(cookie.docNameAssociations);
									this._checkDocumentInFromAspera(cookie.docNameAssociations, documentKeys, 0, documentItemLookup, transferSpec.destination_root, transferSpec);	
									break;	    
									// End of section for checkin.
								}																			
							} else if (transfer.status == "cancelled"){
								console.log("transfer is cancelled");
								this.transferCancelled = true;						

							    this.count = 61;
							    this.timer = setInterval(lang.hitch(this, function() {
							    	--this.count;
							    	if (this.count <= 0) {
							    		if (this.timer) {
									    	clearInterval(this.timer);
									    }
						    		    //change the message
							    		if(this._warningDialog){
								    		this._warningDialog.destroy();
								    		delete this._warningDialog;
							    		}
							    		//this._multiAddUpdateStatusMsg(this.messages.aspera_checking_in_cancelled_msg);
							    		console.log("transfer is stopping.");
							    		this._removeTransfer();
							    	} else {
							    		this.checkinCancelledMsg = string.substitute(this.messages.aspera_checking_in_paused_msg, [
							    			this.count
										])
										if(this.count == 60)
											this.setShowWarnings(this.checkinCancelledMsg);
										else if(this._warningDialog.open)
											this._warningDialog.showMessage(this.checkinCancelledMsg);
							    		//this._multiAddUpdateStatusMsg(this.checkinCancelledMsg);
							    	}  				    	
							    }), 1000);							    						
							} else if (transfer.status == "failed") {
								console.log("transfer failed");
								//show message here.								
								var message = Message.createErrorMessage("aspera_transfer_error");
								ecm.model.desktop.addMessage(message);	
								
								ecm.model.desktop.asperaWeb.removeEventListener('transfer');
								if (this.timer) {
							    	clearInterval(this.timer);
							    }
								//stop checking in and reservation documents will be deleted. will not remove the transfer
								this._cancelCheckin();
							} else if (this.transferCancelled && (transfer.status == "initiating" ||transfer.status == "running")) {
								//resume the transfer
							    console.log("transfer resumed");
							    //stop the timer and change the message back
							    this.transferCancelled = false;	
							    if (this.timer) {
							    	clearInterval(this.timer);
							    }							    
//				    		    //change message back
							    if(this._warningDialog){
						    		this._warningDialog.destroy();
						    		delete this._warningDialog;
					    		}
//					    		if (this._multiAddFileCount && this._multiAddNumFiles && this._multiAddNumFiles > 1) {
//						        	this._multiAddUpdateStatusMsg(this.messages.aspera_adding_check_in_content_msg);
//						        } else {
//						        	this._multiAddUpdateStatusMsg(this.messages.aspera_checking_in_content_msg);
//						        }
							} else if (transfer.status == "removed") {
								  console.log("transfer is removed");
				        	  	  ecm.model.desktop.asperaWeb.removeEventListener('transfer', this._asperaTransferEventsListener);
					        	  	if(this._warningDialog){
							    		this._warningDialog.destroy();
							    		delete this._warningDialog;
						    		}
				        	      if (this.timer) {
								    	clearInterval(this.timer);
								   }	
								  this._cancelCheckin();				           
							} 
						}
					}
			   	} 
               //Transfer event listener will not be removed if transfers length is 0
	        });
			
		    this._removeTransfer = lang.hitch(this, function() {
				ecm.model.desktop.asperaWeb.removeTransfer(this.transfer.uuid, callbacks = {
			               error : lang.hitch(this, function(response){
				            	 //do nothing. fail to remove transfer.waiting for resume.
				           }),		               
				           success : lang.hitch(this, function(response){
				            	 //do nothing. will cancel check in in removed event
				           }),   	   
				    });
		    });
		    
		    this._cancelCheckin = lang.hitch(this, function(response){									        	      
          	  params = {
          			  repositoryId: this.repository.id,
            		  destinationRoot : this.transferSpec.destination_root,
				  };
          	      
          	if (ecm.model.desktop.asperaUploadingItems) {
				var index = ecm.model.desktop.asperaUploadingItems.indexOf(this.transferId);
				if (index > -1) {
					ecm.model.desktop.asperaUploadingItems.splice(index, 1);
				}
            	if (ecm.model.desktop.asperaUploadingItems.length == 0) {
            		ecm.model.desktop.isAsperaUploading = false;
            	}					
			} else {
				ecm.model.desktop.asperaUploadingItems =[];
				ecm.model.desktop.isAsperaUploading = false;
			}
          	//stop the check in process and delete content on Aspera server
          	ecm.model.Request.invokeService("cancelCheckinContentFromAspera", this.repository.type, params, lang.hitch(this, function(response) {
    			params.destinationRoot = this.transferSpec.destination_root;
				ecm.model.Request.invokeService("deleteAsperaContent", "", params, lang.hitch(this, function(response) {
                    //do nothing.
				
				}));
        	  }));
           }); 
		  
		    ecm.model.desktop.asperaWeb.addEventListener('transfer', this._asperaTransferEventsListener);		    
		    ecm.model.desktop.asperaWeb.startTransfer(transferSpec, connectSettings,  callbacks = {
		              error : lang.hitch(this, function(response){
		            	 // show message here.
		            	 var message = Message.createErrorMessage("aspera_transfer_error");
						 ecm.model.desktop.addMessage(message);	
						 //hide the status dialog
						 if (this._batchStatusDialog) {
								this._batchStatusDialog.hide();
						 } else {
								this._hideStatusDialog();
						 }
						 if(this.repository.statusDocUploading){
							 var cookie = dojojson.fromJson(transferSpec.cookie);
							 var docIDs = [];
							 var documentKeys = Object.keys(cookie.docNameAssociations);
							 for (var index = 0;index < documentKeys.length; index++) {
									fileName = documentKeys[index];
	                                docId = cookie.docNameAssociations[fileName];
									docIDs.push(docId);
							}
							 var params = {
								repositoryId:this.repository.id,
								docid:docIDs,
								template_name:this.addContentItemPropertiesPane.getDocumentType(),
								statusDocUploading:"4"
							 }
							 ecm.model.Request.invokeService("changeState", this.repository.type, params, lang.hitch(this, function(response) {
			                    //do nothing.
								 this.parentFolder.refresh();
							}));
						 }
		              }),
		              success : lang.hitch(this, function(response){
		            	if (!ecm.model.desktop.asperaUploadingItems) {
		            		ecm.model.desktop.asperaUploadingItems = [];
		            	}
		            	ecm.model.desktop.asperaUploadingItems.push(this.transferId); 
		            	if (!ecm.model.desktop.isAsperaUploading) {
		            		ecm.model.desktop.isAsperaUploading = true;
		            	}
		            	// Hide the status dialog
		  				if (this._batchStatusDialog) {
		  					this._batchStatusDialog.hide();
		  				} else {
		  					this._hideStatusDialog();
		  				}
		            	this.onCancel();
		              })
		    });
		},
		
		_checkDocumentInFromAspera: function(documentNameAssociations, documentKeys, index, documentItemLookup, destinationRoot, transferSpec){
			
			if (index >= documentKeys.length){
		        this._multiAddCurrFileName = "";
				//this._multiAddUpdateStatusMsg(this.messages.aspera_adding_delete_content_msg);
				this.startDeleteTime = new Date();
				params.destinationRoot = destinationRoot;
				this._multiAddDialogClosed = true;
				
				if (ecm.model.desktop.asperaUploadingItems) {
					var index = ecm.model.desktop.asperaUploadingItems.indexOf(this.transferId);
					if (index > -1) {
						ecm.model.desktop.asperaUploadingItems.splice(index, 1);
					}
	            	if (ecm.model.desktop.asperaUploadingItems.length == 0) {
	            		ecm.model.desktop.isAsperaUploading = false;
	            	}					
				} else {
					ecm.model.desktop.asperaUploadingItems =[];
					ecm.model.desktop.isAsperaUploading = false;
				}
					ecm.model.Request.invokeService("deleteAsperaContent", "", params, lang.hitch(this, function(response) {
				       	var deleteEndTime = new Date();
						var difference = deleteEndTime.getTime() - this.startDeleteTime.getTime();
						console.log("Time for deleting content from Aspera: " + difference);					
				       // this._multiAddProcessingFinished();
				        this.onCancel();
					}));
				this._documentItems = [];
				if (this.parentFolder) {
					this.parentFolder.onChange(this.parentFolder);
				}				
				this._multiAddProcessingFinished();
				return;
			}
			
			var fileName = documentKeys[index];
			var documentItem = documentItemLookup[fileName];
			var docId = documentNameAssociations[fileName];
        
	        var contentItem = new ContentItem({
	        	id: docId,
	        	repository: this.repository
	        });
	        
	        var parentFolderId;
	        if (this.parentFolder){
	        	parentFolderId = this.parentFolder.id;
	        }
	        if(documentItem){
		        var asperaPath = destinationRoot + "/" + documentItem.filename;
		        params = {
		        		"asperaPath": asperaPath,
		        		 "repositoryId": this.repository.id,
	        			"aspera": "true",
				        "folderDocid": parentFolderId,
				        "set_security_parent": documentItem.setSecurityParent,
				        "asperaContent":"true",
				        "fileSize": documentItem.content.size.toString(),
				        "destinationRoot": destinationRoot,
				        "cookie": transferSpec.cookie,
				        "isCheckin":this._checkin.toString()

		        }
		        this._multiAddCurrFileName = documentItem.filename;
//		        if (this._multiAddFileCount && this._multiAddNumFiles && this._multiAddNumFiles > 1) {
//		        	this._multiAddUpdateStatusMsg(this.messages.aspera_adding_check_in_content_msg);
//		        } else {
//		        	this._multiAddUpdateStatusMsg(this.messages.aspera_checking_in_content_msg);
//		        }
		        
		        if (documentKeys.length > 1) {
		        	onError = lang.hitch(this, function(response, errorMessages) {
		        		if (this.transferCancelled) {							
							var docIDs = [];
							//add the current doc
							docIDs.push(docId);
							++index;
							for (;index < documentKeys.length; ++index) {
								fileName = documentKeys[index];
                                docId = documentNameAssociations[fileName];
								docIDs.push(docId);
							}	
							var request = ecm.model.Request.invokeService("deleteItem", this.repository.type, {
								repositoryId: this.repository.id,
								docid: docIDs,
								include_all_versions: "true"
							}, lang.hitch(this, function(response) {
								if (this._batchStatusDialog) {
									this._batchStatusDialog.hide();
								} else {
									this._hideStatusDialog();
								}
								this.parentFolder.refresh();
							}));	
							return;
						}
						array.forEach(errorMessages, lang.hitch(this, function(errorMessage) {
							if (errorMessage && errorMessage.level >= 2) {
								if (this._multiAddMessages === undefined) {
									this._multiAddMessages = [];
								}
								this._multiAddMessages.push({
									name: this._multiAddCurrFileName,
									status: this.messages.add_documents_batch_results_status_error,
									statusMessage: errorMessage.text,
									message: errorMessage
								});
							}
						}));
						this._multiAddFileCount += 1;
						this._checkDocumentInFromAspera(documentNameAssociations, documentKeys, ++index, documentItemLookup, destinationRoot, transferSpec)
						this.onAddFailed(response);
					});		        	
		        } else {
		        	onError = lang.hitch(this, function(response, errorMessages) {
						if (this._batchStatusDialog) {
							this._batchStatusDialog.hide();
						} else {
							this._hideStatusDialog();
						}
						//stop checking in other documents and delete the reservation doc and refresh the content list 
						if (this.transferCancelled) {							
							var docIDs = [];
							docIDs.push(docId);
							if (this._checkin) {
								this.parentFolder.refresh();
							} else {
								var request = ecm.model.Request.invokeService("deleteItem", this.repository.type, {
									repositoryId: this.repository.id,
									docid: docIDs,
									include_all_versions: "true"
								}, lang.hitch(this, function(response) {
									this.parentFolder.refresh();
								}));
							}														
							return;
						}
						array.forEach(errorMessages, lang.hitch(this, function(errorMessage) {
							if (!this._errorDialog) {
								this._errorDialog = new ErrorDialog();
							}
							this._errorDialog.showMessage(errorMessage);
						}));
						this.onAddFailed(response);
					});
		        }

				this.startCheckinTime = new Date();
				this.checkinRequest = contentItem.checkIn(documentItem.templateName, documentItem.criterias, documentItem.contentSourceType, documentItem.mimetype, documentItem.filename,
					null, documentItem.childComponentValues, documentItem.permissions, documentItem.securityPolicyId, null, this._checkin? documentItem.checkInAsMinorVersion : documentItem.addAsMinorVersion,
				    documentItem.autoClassify, lang.hitch(this, function(item){
				       	var checkinEndTime = new Date();
						var difference = checkinEndTime.getTime() - this.startCheckinTime.getTime();
						console.log("Time for Aspera checkin (ms) for document " + documentItem.filename + ": " + difference);
						this._multiAddFileCount += 1;
						this._checkDocumentInFromAspera(documentNameAssociations, documentKeys, ++index, documentItemLookup, destinationRoot, transferSpec)

				    }), true, false, onError, params);
//						this.checkinRequest = ecm.model.Request.invokeService("asperaCheckin", "", params, lang.hitch(this, function(item){
//					       	var checkinEndTime = new Date();
//							var difference = checkinEndTime.getTime() - this.startCheckinTime.getTime();
//							console.log("Time for Aspera checkin (ms) for document " + documentItem.filename + ": " + difference);
//							this._multiAddFileCount += 1;
//							this._checkDocumentInFromAspera(documentNameAssociations, documentKeys, ++index, documentItemLookup, destinationRoot, transferSpec)
//
//						}),null,null,onError,true);
						//Add logoff handler to cancel checkin request if user is logoff. Current document will check in successful.
						this.logoffHandler = this.connect(ecm.model.desktop, "_logoffCompleted", lang.hitch(this, function() {
							this.logoffHandler.remove();
							this.logDebug("User logoff. Cancel request.");
							if(this.checkinRequest)
								this.checkinRequest.cancel();
						} ));
	        }
		},
		
		_multiAddProcessingFinished: function() {
			if (this._batchStatusDialog) {
				this._batchStatusDialog.hide();
			} else {
				this._hideStatusDialog();
			}
			// If the multi-add dialog has been closed, it ran normally.
			// Handle any documents that were not added.
			if (this._multiAddDialogClosed) {
				var message;
				// Add any remaining docs to the messages list with the status "Cancelled".
				for (var i = 0; i < this._documentItems.length; i++) {
					if (this._multiAddMessages === undefined) {
						this._multiAddMessages = [];
					}
					message = new Message({
						number: 0,
						level: 0,
						text: this.messages.add_documents_batch_results_status_cancelled_msg
					});
					this._multiAddMessages.push({
						name: this._documentItems[i].filename,
						status: this.messages.add_documents_batch_results_status_cancelled,
						statusMessage: message.text,
						message: message
					});
				}
				// If there are messages for any of the added documents then display the results dialog. 
				if (this._multiAddMessages && this._multiAddMessages.length > 0) {
					var resultColumns = [
						{
							field: "name",
							name: this.messages.add_documents_batch_results_dialog_filename_col_hdr,
							width: "40%"
						},
						{
							field: "status",
							name: this.messages.add_documents_batch_results_dialog_status_col_hdr,
							width: "10%"
						},
						{
							field: "statusMessage",
							name: this.messages.add_documents_batch_results_dialog_message_col_hdr,
							width: "50%"
						}
					];
					if (this._batchResults) {
						this._batchResults.destroyRecursive();
					}
					this._batchResults = new BatchResultsDialog({
						dialogTitle: this.messages.add_documents_batch_results_dialog_title,
						dialogIntro: this.messages.add_documents_batch_results_dialog_context_info,
						columns: resultColumns,
						statusItems: this._multiAddMessages
					});
					this._showingBatchResults = true;
					this._onHideBatchResults = aspect.after(this._batchResults, "onHide", lang.hitch(this, function() {
						delete this._showingBatchResults;
						this._onHideBatchResults.remove();
						delete this._onHideBatchResults;
						if (!this._showingWorkflow) {
							this._refreshParentFolder();
							this.onAddFinished();
						}
					}));
					this._batchResults.show();
				}
			} // Else the multi-add was interrupted at the first document, probably due to a field validation error. Reset the multi-add.
			this._multiAddCleanup();
		},

		/**
		 * @private
		 */
		_addDocumentItemCallback: function(newItem, fieldErrors, templateMetadataErrors) {
			// Go ahead and close the multi-add dialog if the only problem is the file name used for the title fails validation.
			// Files that fail for this reason will be listed in the final batch results dialog.
			var invalidMultiAddTitleOnly = this._multiAddProcessing && fieldErrors && fieldErrors.length == 1 && this._multiAddAssignFileNameProperty && fieldErrors[0].symbolicName == this._multiAddAssignFileNameProperty.name;

			if ((fieldErrors || templateMetadataErrors) && (!this._multiAddProcessing || !this._multiAddDialogClosed) && !invalidMultiAddTitleOnly) {
				// Clear any remaining items to upload
				this._documentItems = [];

				// If adding multiple documents, cleanup the batch processing and allow the user to correct the field value.
				if (this._multiAddProcessing) {
					this._multiAddProcessingFinished();
				} else {
					if (this._batchStatusDialog) {
						this._batchStatusDialog.hide();
					} else {
						this._hideStatusDialog();
					}
				}

				if (fieldErrors) {
					var fieldErrorMap = {};
					array.forEach(fieldErrors, function(fieldError) {
						this.addContentItemPropertiesPane.setFieldError(fieldError.symbolicName, fieldError.errorMessage, fieldError.invalidItems);
						fieldErrorMap[fieldError.symbolicName] = fieldError;
					}, this);
	
					// Set the focus to the first invalid field, in the layout order.
					var props = this.addContentItemPropertiesPane.getPropertiesJSON(true, true, false);
					array.some(props, function(prop) {
						if (fieldErrorMap[prop.name] == null) {
							return false;
						}
						this.addContentItemPropertiesPane.setFieldFocus(prop.name);
						return true;
					}, this);
				}
				
				if (templateMetadataErrors) {
					// Update fields with errors
					array.forEach(templateMetadataErrors, function(templateMetadataError) {
						array.forEach(templateMetadataError.fieldErrors, function(fieldError) {
							this.addContentItemPropertiesPane.setTemplateMetadataFieldError(templateMetadataError.id, fieldError.symbolicName, fieldError.errorMessage);
						}, this);
					}, this);

					// Set the focus on the first invalid field if there are no previous errors
					if (!fieldErrors)
						this.addContentItemPropertiesPane.setTemplateMetadataFieldFocus(templateMetadataErrors[0].id, templateMetadataErrors[0].fieldErrors[0].symbolicName);
				}

				// Handle the change in error state.
				this._onChangeProperties();
			} else {
				// If a new item was added...
				if (newItem) {
					if (this._callback) {
						this._callback(newItem, this._documentItems[0]);
					}
					// If there is a workflow, launch it.
					if (this._entryTemplate && this._entryTemplate.workflow) {
						this._startWorkflow(newItem);
					}
				}

				// EDS validation errors for documents added after the first mult-add document are added 
				// to the messages list, allowing the multi-add to proceed with the other documents.
				if (this._multiAddProcessing && fieldErrors) {
					if (this._multiAddMessages === undefined) {
						this._multiAddMessages = [];
					}
					var message = "";
					var contentClass;
					if (this._documentItems[0] && this._documentItems[0].templateName) {
						contentClass = this.repository.getContentClass(this._documentItems[0].templateName);
					}
					for (var i = 0; i < fieldErrors.length; i++) {
						var fieldError = fieldErrors[i];
						var fieldName = fieldError.symbolicName || "";
						if (contentClass && contentClass.attributeDefinitionsById[fieldError.symbolicName]) {
							fieldName = contentClass.attributeDefinitionsById[fieldError.symbolicName].name;
						}
						message += ((i > 0) ? "<br>" : "") + fieldName + ": " + (fieldError.errorMessage || "");
					}
					this._multiAddMessages.push({
						name: this._multiAddCurrFileName,
						status: this.messages.add_documents_batch_results_status_error,
						statusMessage: message,
					});
				}

				if (this._documentItems.length > 0) {
					this._documentItems.shift();
				}
				// Continue processing if there are more documents and if this is not a cancelled multiple document add.
				if (this._documentItems.length > 0 && !(this._multiAddProcessing && this._multiAddCancelled)) {
					if (this._multiAddProcessing && !this._multiAddDialogClosed) {
						this._multiAddDialogClosed = true;
						// Close the multi-add dialog now that one document has been successfully added using the entered property values.
						// The first add successfully passed the EDS final validation check (if any).
						this._cancelDialog();
						if (this._batchStatusDialog) {
							// Restart the batch status dialog as modeless while the remaining files are added.
							this._batchStatusDialog.hide();
							if (this._repositoryDocumentMode)
								this._createBatchStatusDialog(true, true, false, true);
							else
								this._createBatchStatusDialog(true, true, true, false);
						} else {
							this._hideStatusDialog();
						}
					}
					this._addDocumentItemMultiple();
				} else {
					if (this._multiAddProcessing) {
						if (!this._multiAddDialogClosed) {
							this._multiAddDialogClosed = true;
							this._cancelDialog();
						}
						this._multiAddProcessingFinished();
					} else {
						if (this._batchStatusDialog) {
							this._batchStatusDialog.hide();
						} else {
							this._hideStatusDialog();
						}
						// Close this add dialog. When adding multiple documents the add dialog is closed earlier. 
						this._cancelDialog();
					}
					// Postpone refreshing the parent folder results until all dialogs have closed.
					this._parentFolderNeedsRefresh = true;
					if (!this._showingBatchResults && !this._showingWorkflow) {
						this._refreshParentFolder();
						this.onAddFinished();
					}
				}
			}
		},

		/**
		 * @private
		 */
		_refreshParentFolder: function() {
			// Refresh the parent folder.
			if (this._parentFolderNeedsRefresh && this.parentFolder && !this._virtualItems) {
				if (this._entryTemplate && this._desktopFolder) {
					// If the entry template folder matches the currently open desktop folder, refresh the desktop folder
					// to show the new document or documents.
					if (this._desktopFolder.id == this.parentFolder.id) {
						this._desktopFolder.refresh();
					} else {
						// Do nothing, the entry template folder is not the currently opened folder in the desktop.
					}
				} else {
					this.parentFolder.refresh();
				}
			}
			delete this._parentFolderNeedsRefresh;
		},

		/**
		 * @private
		 */
		_isValidFolderName: function(folderName) {
			// Check for duplicate folders names with the same parent.
			var valid = true;
			if (this._validationCallback) {
				if (this._validationCallback(folderName) == false) {
					setTimeout(lang.hitch(this, function() {
						this.addContentItemPropertiesPane.setFolderUniqueNameEror(this._messages.workspacebuilder_folders_createfolder_dup);
					}), 2);
					valid = false;
				}
			}
			return valid;
		},

		/**
		 * @private
		 */
		_getSecurityPolicyId: function() {
			var securityPolicy = this.addContentItemSecurityPane.getSecurityPolicy();
			var securityPolicyId = null;
			if (securityPolicy) {
				securityPolicyId = securityPolicy.id;
			}

			return securityPolicyId;
		},

		/**
		 * @private
		 */
		_startWorkflow: function(newItem) {
			var workflow = this._entryTemplate.workflow;
			if (!workflow.promptToLaunchWorkflow || this.addContentItemGeneralPane.getStartOnWorkflow()) {
				if (this.repository._isP8()) {
					if (workflow.selectParticipant) {
						// Display the launch processor so that the user may add workflow participants.
						ecm.widget.dialog.stepProcessorWindow.launchFromEntryTemplate(newItem, workflow);
					} else {
						// This is an automatic launch with no user interaction.
						workflow.launchWorkflow(newItem);
					}
				} else if (this.repository._isCM()) {
					var items = [];
					items.push(newItem);
					if (workflow.selectParticipant || this._entryTemplate.allowChangeWorkflow) {
						// Display the start workflow dialog so that the user may select the user or priority
						var startWorkflowDialog = new StartWorkflowDialog({
							items: items,
							repository: this.repository,
							workflowName: workflow.workflowName,
							workflowReadOnly: !this._entryTemplate.allowChangeWorkflow
						});
						startWorkflowDialog._onHideStartWorkflow = aspect.after(startWorkflowDialog, "onHide", lang.hitch(this, function() {
							this._showingWorkflow -= 1;
							startWorkflowDialog._onHideStartWorkflow.remove();
							delete startWorkflowDialog._onHideStartWorkflow;
							if (!this._showingWorkflow) {
								delete this._showingWorkFlow;
								if (!this._showingBatchResults) {
									this._refreshParentFolder();
									this.onAddFinished();
								}
							}
							setTimeout(lang.hitch(this, function() {
								startWorkflowDialog.destroyRecursive();
								startWorkflowDialog = null;
							}), 200);
						}));
						this._showingWorkflow = this._showingWorkflow ? this._showingWorkflow + 1 : 1;
						startWorkflowDialog.show();
					} else {
						// This is an automatic launch with no user interaction.
						workflow.startWorkflow(items);
					}
				}
			}
		},

		/**
		 * @private
		 */
		_multiAddUpdateStatusMsg: function(msg) {
			if (!this._batchStatusDialog) {
				return;
			}
			var statusMsg = [];
			var message = msg ? msg : "";

			if (this._multiAddCancelled && !msg) {
				var display = domStyle.get(this._batchStatusDialog.progressBar.domNode, "display");
				if (display == "none") {
					message = this.messages.add_documents_status_adding_msg;
				} else {
					message = this.messages.add_documents_status_uploading_msg;
				}
			}

			statusMsg.push("<div>");
			statusMsg.push(idxHtml.escapeHTML(string.substitute(message, [
				this._multiAddFileCount,
				this._multiAddNumFiles
			])));
			statusMsg.push("</div>");

			statusMsg.push("<p><p><div>");
			statusMsg.push(idxHtml.escapeHTML(this._multiAddCurrFileName));
			statusMsg.push("</div>");

			var numErrors = this._multiAddMessages ? this._multiAddMessages.length : 0;
			if (numErrors > 0) {
				statusMsg.push("<p><p><div>");
				statusMsg.push(idxHtml.escapeHTML(string.substitute(this.messages.add_documents_batch_status_errors_msg, [
					numErrors
				])));
				statusMsg.push("</div>");
			}

			if (this._multiAddCancelled) {
				statusMsg.push("<p><p><div>");
				statusMsg.push(idxHtml.escapeHTML(this.messages.add_documents_batch_status_completing_msg));
				statusMsg.push("</div>");
			}

			this._batchStatusDialog.updateStatusMessage(statusMsg.join(""));
		},

		/**
		 * @private
		 */
		_changeUploadProgress: function(evt) {
			if (this._uploadViaAspera){
				return;
			}
			if (!this._batchStatusDialog) {
				return;
			}
			if (!evt) {
				return;
			}
			if (!ecm.model.desktop.uploadMap) {
				ecm.model.desktop.uploadMap = {};
			}
			ecm.model.desktop.uploadMap[evt.total] = evt.loaded;
			
			var total = 0;
			Object.keys(ecm.model.desktop.uploadMap).forEach(function(key) {
				var value = ecm.model.desktop.uploadMap[key];
				total = total + value;
			});

			var percent = Math.round(total * 100 / this._contentSize);
			this._batchStatusDialog.updateValueInProgressBar(percent);
			if (percent >= 100) {
				ecm.model.desktop.uploadMap = null;
				this._multiAddUpdateStatusMsg(this.messages.add_documents_status_adding_msg);
				this._batchStatusDialog.showProgressBar(false);
				this._batchStatusDialog.showLoadingIcon(true);
			}
		},

		/**
		 * @private
		 */
		_completeUploadProgress: function(evt) {
			// do something when load event is fired.
		},
	
		/**
		 * @private
		 */
		_multiAddCleanup: function() {
			delete this._multiAddDialogClosed;
			delete this._multiAddProcessing;
			delete this._multiAddCurrFileName;
			delete this._multiAddFileCount;
			delete this._multiAddNumFiles;
			delete this._multiAddAssignFileNameProperty;
			delete this._multiAddMessages;
			delete this._multiAddCancelled;
		},

		_createBatchStatusDialog: function(modeless, cancellable, withProgressBar, withLoadingIcon) {
			if (this._batchStatusDialog) {
				this._batchStatusDialog.destroyRecursive();
			}
			if (this._uploadViaAspera) {
				cancellable = false;
			}
			this._batchStatusDialog = new BatchStatusDialog({
				title: this.messages.add_documents_batch_status_title,
				cancellable: cancellable,
				modeless: modeless,
				withProgressBar: withProgressBar,
				withLoadingIcon: withLoadingIcon,
				fitContentArea: true
			});

			var onQuitHandler = aspect.after(this._batchStatusDialog, "onQuit", lang.hitch(this, function() {
				this._multiAddCancelled = true;
				this._multiAddUpdateStatusMsg();
				onQuitHandler.remove();							
			}), true);

			this._batchStatusDialog.show();
		},

		_showStatusDialog: function() {
			if (!this._statusDialog)
				this._statusDialog = new StatusDialog();

			this._statusDialog.requestStartedHandler({
				progressMessage: this._statusMessage || ecm.messages.progress_message_addItem,
				delay: 1
			});
		},

		_hideStatusDialog: function() {
			if (this._statusDialog)
				this._statusDialog.requestCompletedHandler({});
		},

		/**
		 * @private
		 */
		_coverBrowsermimetypewithICNdefined: function(file)
		{
			if(file.type && file.type.length > 0)
			{
			//cover browser's mime type definitions using ICN supported mime types
				var mimeTypes = [];
				var tempfilename = (file.fileName != null) ? file.fileName : file.name;
				var temp = [];
				if(tempfilename && tempfilename.length > 0)
					temp = tempfilename.split(/\./g);
				
				if (temp.length > 1) {  
					mimeTypes = this._getMimeTypesForExtension(temp[temp.length - 1]);
				}
				
				var i = 0;
				for(i = 0; i < mimeTypes.length; i++)
				{
					if(file.type == mimeTypes[i])
						return mimeTypes[i];
				}
				if( i == mimeTypes.length && mimeTypes.length > 0 )
					return mimeTypes[0];
				
				return file.type;
			}
			
			return null;
		},
		/**
		 * The Add button event handler.
		 */
		onAdd: function() {
			// Do not allow the add to continue if there is invalid input.
			// The isValid() check will direct the user to the invalid input.
			if (!this.isValid(true)) {
				return;
			}
			this._multiAddCleanup();
			this._titleProperty = null;
			var addAsMinorVersion = !this.addContentItemGeneralPane.getAsMajorVersion();
			var autoClassify = this.addContentItemGeneralPane.getAutoClassify();
			var compoundDocument = this._entryTemplate && this._entryTemplate.enableCompoundDocuments && this._entryTemplate.enableCompoundDocuments.on ? true : false;
			var documentType = this.addContentItemPropertiesPane.getDocumentType();
			var properties = this.addContentItemPropertiesPane.getPropertiesJSON();
			var childComponentValues = this.addContentItemPropertiesPane.getChildComponentValues();
			var templateMetadataValues = this.addContentItemPropertiesPane.getTemplateMetadataValues();
			var permissions = this.addContentItemSecurityPane.getPermissions();
			var appGrp = this.addContentItemGeneralPane._appGroupNameSelector && this.addContentItemGeneralPane._appGroupNameSelector.get("value");
			var appName = this.addContentItemGeneralPane._appNameSelector && this.addContentItemGeneralPane._appNameSelector.get("value");
			var allowDuplicateFileNames = true;
			var teamspaceId;
			if (this._entryTemplate) {
				allowDuplicateFileNames = this._entryTemplate.allowDuplicateFileNames;
			}
			if (this._teamspace && this._useTeamspaceACL) {
				// Pass the teamspace id so the ACL of the teamspace can be applied.
				teamspaceId = this._teamspace.id;
			}
			if (this._typeDocument) {
				var setSecurityParent = (this._teamspace && this.repository._isP8());
				if (!setSecurityParent && this._entryTemplate && this._entryTemplate.inheritSecurityFromParentFolder) {
					setSecurityParent = true;
				}
				var contentSourceType = this.addContentItemGeneralPane.getContentSourceType();
				if (contentSourceType == "Document" && ecm.model.desktop.uploadViaAspera && ecm.model.desktop.AsperaConnectInstalled && this.repository._isP8()){
					this._uploadViaAspera = true;
				}
				var inputFiles;
				if (this._uploadViaAspera){
					inputFiles = this.addContentItemGeneralPane.getAsperaPathArray();
				}
				else {
					inputFiles = this.addContentItemGeneralPane.getFileInputFiles();
				}
				this._multiAddProcessing = this.addContentItemGeneralPane.hasMultipleDocuments();
				// If there are input files... (HTML5 browser).
				if (inputFiles) {
					this._documentItems = [];
					if ((contentSourceType == "Document" || contentSourceType == "RepositoryDocument") && (inputFiles.length > 0)) {
						// Show the batch status dialog with progress bar when one or more documents are added.
						// The batch status dialog will be modal for the first add, even when multiple documents are added.
						// When there are multiple documents, it will be changed to modeless after the first document is successfully added.
						// The batch status dialog is cancellable if multiple documents are added.
						//if(!this._uploadViaAspera){
							if (this._repositoryDocumentMode)
								this._createBatchStatusDialog(false, this._multiAddProcessing, false, true);
							else
								this._createBatchStatusDialog(false, this._multiAddProcessing, true, false);
						//}
						if (this._multiAddProcessing) {
							// Check if the file name should be used for the title.
							this._multiAddAssignFileNameProperty = null;
							if (this.addContentItemPropertiesPane.useFileNameForMultiAdd(this.repository)) {
								var titlePropertyName = this.addContentItemPropertiesPane.getTitlePropertyName();
								array.some(properties, lang.hitch(this, function(property) {
									if (property.name == titlePropertyName) {
										this._multiAddAssignFileNameProperty = property;
										return true;
									}
								}));
							}
							this._multiAddFileCount = 0;
							this._multiAddNumFiles = inputFiles.length;
						}

						for (var i = 0; i < inputFiles.length; i++) {
							var file = inputFiles[i];
							if (file.filename) {
								file.fileName = file.filename;
							}
							
							if (this._uploadViaAspera){
								file.filePath = file.name;
								file.fileName = file.name.split('\\').pop().split('/').pop();
							}
													
							var fileType = this._coverBrowsermimetypewithICNdefined(file);
							
							var documentItem = {
								"templateName": documentType,
								"teamspaceId": teamspaceId,
								"contentSourceType": contentSourceType,
								"mimetype": fileType && fileType.length > 0 ? fileType: file.type,// file.type,
								"filename": (file.fileName != null) ? file.fileName : file.name,
								filePath: (file.filePath != null) ? file.filePath : null,
								"fullPath": (file.fullPath != null) ? file.fullPath: null,
								"securityPolicyId": this._getSecurityPolicyId(),
								"addAsMinorVersion": addAsMinorVersion,
								"autoClassify": autoClassify,
								"compoundDocument": compoundDocument,
								"allowDuplicateFileNames": allowDuplicateFileNames,
								"setSecurityParent": setSecurityParent,
								"application_group": appGrp,
								"application": appName
							};
							if (contentSourceType == "RepositoryDocument") {
								documentItem = lang.mixin(documentItem, {
									"contentSourceDocId": file["id"],
									"contentSourceRepositoryId": file["repository"] != null ? file.repository.id : null,
									"contentSourceDelete": this._propertiesMap.ecm_content_source_delete
								});
							}
							// IE10 will hang when uploading a zero size file unless an IFRAME is used.
							// At this time, IE10 will still hang if multiple documents are added and one is a zero-size file.
							if ((has("ie") == 10) && file.size == 0) {
								// Retrieve references to the form fields and set the data.
								var propertiesInput = this.addContentItemGeneralPane._getPropertiesInput();
								propertiesInput.value = dojojson.toJson(properties);
								var childComponentInput = this.addContentItemGeneralPane._getChildComponentInput();
								childComponentInput.value = dojojson.toJson(childComponentValues);
								var templateMetadataInput = this.addContentItemGeneralPane._getTemplateMetadataInput();
								templateMetadataInput.value = dojojson.toJson(templateMetadataValues);
								var permissionsInput = this.addContentItemGeneralPane._getPermissionsInput();
								permissionsInput.value = dojojson.toJson(permissions);

								lang.mixin(documentItem, {
									"inputForm": this.addContentItemGeneralPane.getFileInputForm()
								});
							} else {
								lang.mixin(documentItem, {
									"criterias": properties,
									"content": file,
									"childComponentValues": childComponentValues,
									"templateMetadataValues": templateMetadataValues,
									"permissions": permissions
								});
							}

							this._documentItems.push(documentItem);
						}
					} else { // Adding without file content.
						if (this.hasDaejaContent()) {
							this._showStatusDialog();
						} else {
							// When content is not uploaded from the client, the upload progress bar is not needed.
							if (this._repositoryDocumentMode)
								this._createBatchStatusDialog(false, this._multiAddProcessing, false, true);
							else
								this._createBatchStatusDialog(false, this._multiAddProcessing, true, false);
						}

						var fileName = this.getExternalContentFilename();
                        var fullPath = this.addContentItemGeneralPane.fullPath;
                        
						this._documentItems.push({
							"templateName": documentType,
							"teamspaceId": teamspaceId,
							"criterias": properties,
							"contentSourceType": contentSourceType,
							"mimetype": null,
							"filename": fileName,
							"content": null,
							"childComponentValues": childComponentValues,
							"templateMetadataValues": templateMetadataValues,
							"permissions": permissions,
							"securityPolicyId": this._getSecurityPolicyId(),
							"addAsMinorVersion": addAsMinorVersion,
							"autoClassify": autoClassify,
							"compoundDocument": compoundDocument,
							"allowDuplicateFileNames": allowDuplicateFileNames,
							"setSecurityParent": setSecurityParent
						});
					}
				} else { // This browser does not support HTML5.
					// Retrieve references to the form fields and set the data.
					var propertiesInput = this.addContentItemGeneralPane._getPropertiesInput();
					propertiesInput.value = dojojson.toJson(properties);
					var childComponentInput = this.addContentItemGeneralPane._getChildComponentInput();
					childComponentInput.value = dojojson.toJson(childComponentValues);
					var templateMetadataInput = this.addContentItemGeneralPane._getTemplateMetadataInput();
					templateMetadataInput.value = dojojson.toJson(templateMetadataValues);
					var permissionsInput = this.addContentItemGeneralPane._getPermissionsInput();
					permissionsInput.value = dojojson.toJson(permissions);

					var fileName;
					if (contentSourceType == "Document") {
						fileName = this.addContentItemGeneralPane.getInputFileName();
					} else if (contentSourceType == "ExternalURL") {
						fileName = this.addContentItemGeneralPane.getExternalURL();
					} else {
						fileName = null;
					}

					this._documentItems = [
						{
							"templateName": documentType,
							"teamspaceId": teamspaceId,
							"contentSourceType": contentSourceType,
							"filename": fileName,
							"inputForm": this.addContentItemGeneralPane.getFileInputForm(),
							"securityPolicyId": this._getSecurityPolicyId(),
							"addAsMinorVersion": addAsMinorVersion,
							"autoClassify": autoClassify,
							"compoundDocument": compoundDocument,
							"allowDuplicateFileNames": allowDuplicateFileNames,
							"setSecurityParent": setSecurityParent
						}
					];
				}
				this._addDocumentItemMultiple();
			} else {
				// Ignore additional attempts to add this folder if it is already being added.
				if (this._addingFolder) {
					return;
				}
				this._addingFolder = true;

				var folderName;
				var folderProperties = {};
				folderName = this.addContentItemPropertiesPane.getItemName();
				folderProperties.folderName = folderName;
				folderProperties.docid = this.parentFolder ? this.parentFolder.id : "";
				folderProperties.criterias = properties;
				folderProperties.childComponentValues = childComponentValues;
				folderProperties.documentType = documentType;

				if (this._virtualItems) {
					if (this._isValidFolderName(folderName)) {
						this.addFolderInMemory(folderProperties);
						this.onCancel();
					}
					delete this._addingFolder;
					return;
				}

				var request;

				var onAddFolderRequestCompletedHandler = aspect.after(ecm.model.desktop, "onRequestCompleted", lang.hitch(this, function(completedRequest) {
					if (!request || !request.isSameRequestAs(completedRequest)) {
						return;
					}
					delete this._addingFolder;
					onAddFolderRequestCompletedHandler.remove();
				}), true);

				var parentFolder = this.parentFolder;
				if (this.repository._isP8()) {
					var objectStore = (parentFolder && parentFolder.objectStore);

					if (!objectStore && this._objectStore) {
						objectStore = this._objectStore;
					}
					request = this.repository.addFolderItem(parentFolder, objectStore, documentType, folderProperties, [], permissions, this._getSecurityPolicyId(), teamspaceId, lang.hitch(this, this._addFolderItemCallback));
				} else {
					request = this.repository.addFolderItem(parentFolder, null, documentType, properties, childComponentValues, permissions, null, teamspaceId, lang.hitch(this, this._addFolderItemCallback), templateMetadataValues);
				}

				if (!request) {
					if (onAddFolderRequestCompletedHandler) {
						onAddFolderRequestCompletedHandler.remove();
					}
					delete this._addingFolder;
				}
			}
		},

		getExternalContentFilename: function() {
			var contentSourceType = this.addContentItemGeneralPane.getContentSourceType();
			var filename = null;
			if (contentSourceType == "ExternalURL") {
				filename = this.addContentItemGeneralPane.getExternalURL();
			} else if (this.hasDaejaContent()) {
				filename = this.getDaejaPartFileName();
			}

			return filename;
		},

		/**
		 * @private
		 */
		_addFolderItemCallback: function(newItem, fieldErrors, templateMetadataErrors) {
			if (fieldErrors) {
				for (var i = 0; i < fieldErrors.length; i++) {
					var fieldError = fieldErrors[i];
					this.addContentItemPropertiesPane.setFieldError(fieldError.symbolicName, fieldError.errorMessage, fieldError.invalidItems);
				}
				this.addContentItemPropertiesPane.setFieldFocus(fieldErrors[0].symbolicName);
				// Handle the change in error state.
				this._onChangeProperties();
			} else if (templateMetadataErrors) {
				// Update fields with errors
				array.forEach(templateMetadataErrors, function(templateMetadataError) {
					array.forEach(templateMetadataError.fieldErrors, function(fieldError) {
						this.addContentItemPropertiesPane.setTemplateMetadataFieldError(templateMetadataError.id, fieldError.symbolicName, fieldError.errorMessage);
					}, this);
				}, this);

				// Set the focus on the first invalid field if there are no previous errors
				if (!fieldErrors)
					this.addContentItemPropertiesPane.setTemplateMetadataFieldFocus(templateMetadataErrors[0].id, templateMetadataErrors[0].fieldErrors[0].symbolicName);
				
				// Handle the change in error states
				this._onChangeProperties();
			} else {
				// The add succeeded, close the Add dialog.
				this._cancelDialog();
				if (this._callback) {
					this._callback(newItem);
				}

				// If there is a workflow, launch it.
				if (this._entryTemplate && this._entryTemplate.workflow) {
					this._startWorkflow(newItem);
				}

				if (this.parentFolder) {
					if (this._entryTemplate) {
						// If the entry template folder matches the currently open desktop folder,  the desktop folder
						// to show the new folder.
						if (this._desktopFolder && (this._desktopFolder.id == this.parentFolder.id)) {
							this._desktopFolder.refresh();
						} else {
							// Do nothing, the entry template folder is not the currently opened folder in the desktop.
						}
					} else {
						this.parentFolder.refresh();
					}
				}
				this.onAddFinished();
			}
		},

		/**
		 * This event is called by the add dialog when processing the add for a virtual folder (<code>virtualItems</code>
		 * is <code>true</code>). A virtual folder is not created by the add dialog; instead, the folder properties
		 * are stored by the <code>addFolderInMemory</code> event listener for creating the folder at another time.
		 * 
		 * @param folderProperties
		 *            An object that contains the following properties:
		 *            <ul>
		 *            <li>folderName - Name of the folder (string)</li>
		 *            <li>docid - Parent folder doc Id (string)</li>
		 *            <li>criterias - Folder property values</li>
		 *            <li>childComponentValues - Folder child component values</li>
		 *            <li>documentType - Content class Id (string)</li>
		 *            </ul>
		 */
		addFolderInMemory: function(folderProperties) {
		},

		/**
		 * @private
		 */
		_setAppGroupNameSelector: function() {
			var storeData = [];
			for (var i = 0; i < this._appGrp.length; i++) {
				storeData.push({
					"value": this._appGrp[i].lable,
					"label": this._appGrp[i].lable
				});
			}

			this.addContentItemGeneralPane._appGroupNameSelector.store = new DataStore({
				"store": new ItemFileWriteStore({
					data: {
						identifier: 'value',
						label: 'label',
						items: storeData
					}
				})
			});
		},

		/**
		 * @private
		 */
		_getFileTypesForInputFiles: function() {
			var files = this.addContentItemGeneralPane.getSelectedFiles();
			var fileTypes = [];
			this._hasNotFoundFileTypeFile = false;
			for (var i = 0; i < files.length; i++) {
				var mimeTypes = [];
				if (files[i].type && files[i].type.length > 0) {
					var filetype = this._coverBrowsermimetypewithICNdefined(files[i]);
					if(filetype && filetype.length > 0)
						mimeTypes.push(filetype);
					else
						mimeTypes.push(files[i].type);
				} else {
					var fileName = files[i].name;
					if (!fileName) {
						fileName = files[i].fileName;
					}
					var temp = fileName.split(/\./g);
					if (temp.length > 1) {
						mimeTypes = this._getMimeTypesForExtension(temp[temp.length - 1]);
					}
					;
				}
				var fileType = this._getFileTypeForMimeType(mimeTypes);
				if (fileType) {
					fileTypes.push(fileType);
				} else {
					fileTypes.push("++NotFound++");
					this._hasNotFoundFileTypeFile = true;
				}

			}
			return fileTypes;
		},

		/**
		 * @private
		 */
		_getFileTypesForVirtualItemObjects: function() {
			var fileTypes = [];
			if (this._virtualItemObjects && this._virtualItemObjects.length) {
				this._hasNotFoundFileTypeFile = false;
				for (var i = 0; i < this._virtualItemObjects.length; i++) {
					var mimeTypes = [];
					if (this._virtualItemObjects[i] && this._virtualItemObjects[i].mimetype) {
						mimeTypes.push(this._virtualItemObjects[i].mimetype);
					}
					var fileType = this._getFileTypeForMimeType(mimeTypes);
					if (fileType) {
						fileTypes.push(fileType);
					} else {
						fileTypes.push("++NotFound++");
						this._hasNotFoundFileTypeFile = true;
					}

				}
			}
			return fileTypes;
		},

		/**
		 * @private
		 */
		_getMimeTypesForExtension: function(extension) {
			var result = [];
			var mimeTypeDefs = ecm.model.desktop._mimeTypeDefs;
			for (var i = 0; i < mimeTypeDefs.length; i++) {
				for (var j = 0; j < mimeTypeDefs[i].extensions.length; j++) {
					if (extension == mimeTypeDefs[i].extensions[j]) {
						return mimeTypeDefs[i].mimeTypes;
					}
				}
			}
			return result;
		},
		/**
		 * @private
		 */
		_getFileTypeForMimeType: function(mimeTypes) {
			var sysFileTypes = ecm.model.desktop.fileTypes;
			for (var i = 0; i < sysFileTypes.length; i++) {
				var findMimeType = false;
				for (var j = 0; j < sysFileTypes[i]._attributes.contentTypes.length; j++) {
					var sysMimeType = sysFileTypes[i]._attributes.contentTypes[j];
					for (var k = 0; k < mimeTypes.length; k++) {
						if (sysMimeType == mimeTypes[k]) {
							findMimeType = true;
							break;
						}
					}
				}
				if (findMimeType) {
					return sysFileTypes[i];
				}
			}
			//don't find the mimetype
			return null;
		},
		/**
		 * @private
		 */
		_setNoFileTypeRestrictionETsOnly: function() {
			if (this._entryTemplates && this._entryTemplates.length > 0) {
				var noRestrictionEntryTemplates = [];
				for (var i = 0; i < this._entryTemplates.length; i++) {
					var fileTypeString = this._getFileTypeStringForEntryTemplate(this._entryTemplates[i].fileTypes);
					if (fileTypeString.length == 0) {
						noRestrictionEntryTemplates.push(this._entryTemplates[i]);
					}
				}
				this._setEntryTemplateSelectorStore(noRestrictionEntryTemplates);
				if (this._entryTemplate) {
					var fileTypeString = this._getFileTypeStringForEntryTemplate(this._entryTemplate.fileTypes);
					if (fileTypeString.length > 0) {
						this._unloadEntryTemplate();
					}
				}
			}
		},

		/**
		 * @private
		 */
		_setEntryTemplateSelectorStore: function(entryTemplates) {
			if (entryTemplates) {
				this._changedEntryTemplates = entryTemplates;
				var templateItems = [];
				for (var i = 0; i < entryTemplates.length; i++) {
					templateItems.push({
						// A non-empty display name must be set, otherwise when no value is entered and focus 
						// leaves the field the first entry template with a blank label will be selected.
						label: entryTemplates[i].name ? entryTemplates[i].name : entryTemplates[i].id,
						value: String(i),
						entryTemplateId:  this.repository._isCM() ? entryTemplates[i].itemId : entryTemplates[i].id
					});
				}

				var templateItemsStore = new DataStore({
					"store": new ItemFileWriteStore({
						data: {
							identifier: "value",
							label: "label",
							items: templateItems
						}
					})
				});

				this.addContentItemGeneralPane._entryTemplateSelector.store = templateItemsStore;
				if (templateItems.length == 0) {
					this.addContentItemGeneralPane._entryTemplateSelector.set("placeHolder", ecm.messages.add_document_no_entry_template_to_use);
					this.addContentItemGeneralPane._entryTemplateSelector.set('value', null);
				} else {
					this.addContentItemGeneralPane._entryTemplateSelector.set("placeHolder", ecm.messages.add_document_select_entry_template);
				}
			}
		},

		_checkFileTypesForETFolderAssociation: function(entryTemplate, fileTypes) {
			//if entryTemlate file types contains all fileTypes, return true
			//if not, return false;

			var fileTypeString = this._getFileTypeStringForEntryTemplate(entryTemplate.fileTypes);
			//no restrinction
			if (fileTypeString.length == 0) {
				return true;
			}

			var findAllFileTypes = [];
			for (var k = 0; k < fileTypes.length; k++) {
				var findFileType = false;

				for (var j = 0; j < entryTemplate.fileTypes.length; j++) {
					if (fileTypes[k] != "++NotFound++" && fileTypes[k]._attributes.name == entryTemplate.fileTypes[j]) {
						findFileType = true;
						break;
					}
				}
				findAllFileTypes.push(findFileType);
			}
			var findAll = true;
			for (var l = 0; l < findAllFileTypes.length; l++) {
				findAll = findAll && findAllFileTypes[l];
			}

			return findAll;
		},
		//during run time, the entry template association filetypes may be invalid.
		//use this method to get the valid string of file types settings.
		_getFileTypeStringForEntryTemplate: function(fileTypes) {
			var result = "";
			if (fileTypes && fileTypes.length != 0) {
				result = fileTypes.toString();
			}
			return result;
		},

		/**
		 * @private
		 */
		_setEntryTemplateForFiles: function() {
			if (this.addContentItemGeneralPane.getSelectedFiles().length == 0 && this.addContentItemGeneralPane.getContentSourceType() == "Document") {
				this._setEntryTemplateSelectorStore(this._entryTemplates);
			} else if (this.addContentItemGeneralPane.getContentSourceType() == "Document" || this.addContentItemGeneralPane.getContentSourceType() == "RepositoryDocument") {
				// check if file types are valid for the associated entry templates
				var fileTypes = this._getFileTypesForInputFiles();
				if (this._repositoryDocumentMode && this._virtualItemObjects) {
					fileTypes = this._getFileTypesForVirtualItemObjects();
				}
				var findFileTypesEntryTemplates = [];
				var noRestrictionEntryTemplates = [];
				if (this._entryTemplates) {
					for (var i = 0; i < this._entryTemplates.length; i++) {
						var fileTypeString = this._getFileTypeStringForEntryTemplate(this._entryTemplates[i].fileTypes);
						if (fileTypeString.length == 0) {
							noRestrictionEntryTemplates.push(this._entryTemplates[i]);
						} else {
							var findAll = this._checkFileTypesForETFolderAssociation(this._entryTemplates[i], fileTypes);
							if (findAll) {
								findFileTypesEntryTemplates.push(this._entryTemplates[i]);
							}
						}
					}
				}
				var ifFileTypeFindInEntryTemplateAssociation = [];
				for (var i = 0; i < fileTypes.length; i++) {
					var fileType = fileTypes[i];
					ifFileTypeFindInEntryTemplateAssociation[i] = false;
					for (var j = 0; j < this._entryTemplates.length; j++) {
						if (this._getFileTypeStringForEntryTemplate(this._entryTemplates[j].fileTypes).length > 0 //
								&& this._checkFileTypesForETFolderAssociation(this._entryTemplates[j], [
									fileType
								])) {
							ifFileTypeFindInEntryTemplateAssociation[i] = true;
							break;
						}
					}
				}

				var ifAnyFileTypesFindInEntryTemplateAssociation = false;
				for (var i = 0; i < ifFileTypeFindInEntryTemplateAssociation.length; i++) {
					ifAnyFileTypesFindInEntryTemplateAssociation = ifAnyFileTypesFindInEntryTemplateAssociation || ifFileTypeFindInEntryTemplateAssociation[i];
				}

				var etList;
				if (!ifAnyFileTypesFindInEntryTemplateAssociation) {
					etList = noRestrictionEntryTemplates;
					this._setEntryTemplateSelectorStore(noRestrictionEntryTemplates);
				} else {
					etList = findFileTypesEntryTemplates;
					this._setEntryTemplateSelectorStore(findFileTypesEntryTemplates);
				}

				if (this._entryTemplate) {
					//if it is in the current ets list?
					var findET = false;
					for (var i = 0; i < etList.length; i++) {
						if (etList[i].id == this._entryTemplate.id) {
							findET = true;
							break;
						}
					}
					if (!findET) {
						this._actionButton.set("disabled", true);
						this._entryTemplateAssociationFileTypeError = true;
						this._unloadEntryTemplate();
						
						this._resetEntryTemplateSelectValue( etList );
					} else {
						this._entryTemplateAssociationFileTypeError = false;
						this._onChangeProperties();
					}
				} else {
					this._resetEntryTemplateSelectValue( etList );
				}
			}

		},
		
		_resetEntryTemplateSelectValue: function( etList ){
			var value = null;
			for ( var i = 0; i < etList.length; i++) {
				if (etList[i].isDefault) {
					value = i;
					break;
				}
			}
			
			if( etList.length == 1 ){
				value = 0;
			}
			
			this.addContentItemGeneralPane._entryTemplateSelector.set('value', value);
		},
		
		/**
		 * @private
		 */
		_copyCommonFieldValues: function(templateId) {

			var inputFiles = this.addContentItemGeneralPane.getFileInputFiles();
			if (inputFiles && inputFiles.length == 1) {
				if (this._propertiesMap && this.addContentItemPropertiesPane._commonProperties) {

					var fields = this.addContentItemPropertiesPane._commonProperties.getFields();
					var ecmNamePropertyValue = this._propertiesMap["ecm_name_property"];
					var item = this._propertiesMap["ecm_item_property"];
					var nameProp = this.addContentItemPropertiesPane.getTitlePropertyName();
					if (!this.addContentItemPropertiesPane.getPropertyValue(nameProp) || this.addContentItemPropertiesPane.getPropertyValue(nameProp).length == 0) {
						this.addContentItemPropertiesPane.setPropertyValue(nameProp, ecmNamePropertyValue);
					}

					array.forEach(fields, function(field) {
						if (field.name != nameProp) {
							var mapValue = this._propertiesMap[field.name.toLowerCase().toLowerCase()];
							if (mapValue) {
								this.addContentItemPropertiesPane.setPropertyValue(field.name, mapValue);
							}
						}
					}, this);
					
					// from Box case metadata template mapping
					if(this._propertiesMap["templateMetadata"]  && this._propertiesMap.templateMetadata.length > 0){
						array.forEach(this._propertiesMap.templateMetadata, function(template) {
							if (template["attributeDefinitions"]) {
								array.forEach(template.attributeDefinitions, function(field) {
									// Need to get the propertyId so the value can be set using the proper case
									var attrDef = this.addContentItemPropertiesPane.hasProperty(field.name);
									if (field.name != nameProp && attrDef && attrDef["id"]) {
										var fieldValue = field.defaultValue[0];
										if (fieldValue) {
											if(this._valdiateBoxTypesMatch(field.dataType, attrDef, true, fieldValue)){
												if(attrDef.dataType == "xs:time" || attrDef.dataType == "xs:timestamp" || attrDef.dataType == "xs:date"){
													// the getDisplayValue can handle time zone offsets and formatting. 
													 fieldValue =template.getDisplayValue(field.id);
													 fieldValue = new Date(fieldValue).getTime();
												}
												this.addContentItemPropertiesPane.setPropertyValue(attrDef.id, fieldValue);
											}
										}
									}
								}, this);
							}
						}, this);
					}
				}
				
				
				// To Box case metadata template mapping
				if(templateId){
					var templateMetadataValues = this.addContentItemPropertiesPane.getTemplateMetadataValues();
					array.forEach(templateMetadataValues, function(value) {
						if (value && value["id"] != null) {
							array.forEach(value.criterias, function(criteria) {
								var mapValue = this._propertiesMap[criteria.name.toLowerCase()];
								var attributeType;
								
								if(mapValue && lang.isArray(mapValue)) // box only support single values
									mapValue = mapValue[0];
								if (mapValue) {
									attributeType =  this._propertiesMap.attributeTypes[criteria.name.toLowerCase()];
									if(attributeType == "xs:timestamp" || attributeType == "xs:time"  || attributeType == "xs:date"){
										mapValue = !item ? mapValue : item.getDisplayValue(criteria.name.toLowerCase());
										var attrDate = new Date(mapValue).getTime();
										mapValue = attrDate;
									}
									if(this._valdiateBoxTypesMatch(attributeType, criteria, false, mapValue))
										this.addContentItemPropertiesPane._commonProperties.setTemplateMetadataPropertyValue(templateId, criteria.name, mapValue);
								} else if (!mapValue){							
									mapValue = this._propertiesMap[criteria.label.toLowerCase()];
									if(mapValue  && lang.isArray(mapValue)) // box only support single values
										mapValue = mapValue[0];
									if(mapValue){
										attributeType =  this._propertiesMap.attributeTypes[criteria.label.toLowerCase()];
										if(attributeType == "xs:timestamp" || attributeType == "xs:time"  || attributeType == "xs:date"){
											mapValue = !item ? mapValue: item.getDisplayValue(criteria.label.toLowerCase());
											var attrDate = new Date(mapValue).getTime();
											mapValue = attrDate;
										}										
										if(this._valdiateBoxTypesMatch(attributeType, criteria, false, mapValue))
											this.addContentItemPropertiesPane._commonProperties.setTemplateMetadataPropertyValue(templateId, criteria.name, mapValue);
									}
								}
							}, this);
	
						}
					
					}, this );
				}
			}

		},
		
		/**
		 * @private
		 */
		_valdiateBoxTypesMatch : function(attrType,  attributeDef, isSrcRepoBox, value) {
			// Check that the type match.
			var typeMatch = false;
			if (attrType == attributeDef.dataType){
				typeMatch = true;
			} else if (isSrcRepoBox && attrType == "xs:double"){ // all Box numeric types come back as double
				
				if(lang.isFloat(value) && (attributeDef.dataType == "xs:decimal" || attributeDef.dataType == "xs:float")){
					typeMatch = true;
				}
				else if (lang.isInteger(value) && (attributeDef.dataType == "xs:integer"  || attributeDef.dataType == "xs:long")){
					typeMatch = true;
				}
			}
			else if ((attrType == "xs:integer" ||
					attrType == "xs:decimal" ||
					attrType == "xs:float" ||
					attrType == "xs:double" ||
					attrType == "xs:long")
					&& attributeDef.dataType == "xs:double"){
				
				typeMatch = true;
			}			
			else if ((attrType == "xs:guid" ||
					attrType == "xs:string:alphanum" ||
					attrType == "xs:string:alpha" ||
					attrType == "xs:string:ext" ||
					attrType == "xs:string:num")
					&& attributeDef.dataType == "xs:string"){
				
				typeMatch = true;
			}
			else if (attrType == "xs:timestamp" && attributeDef.dataType == "xs:date"){
				typeMatch = true;
			}
			else if (attrType == "xs:date" && (attributeDef.dataType == "xs:timestamp" || attributeDef.dataType == "xs:time")){
				typeMatch = true;
			}
			return typeMatch;

		},
		/**
		 * @private
		 */
		_unloadEntryTemplate: function() {
			this.addContentItemPropertiesPane._contentClassNameTextBox.set("value", "");
			if (this.addContentItemPropertiesPane._commonProperties) {
				this.addContentItemPropertiesPane._commonProperties.clearRendering();
			}

			domStyle.set(this.addContentItemPropertiesPane._contentClassSelectorDiv, "display", "none");
			domStyle.set(this.addContentItemPropertiesPane._contentClassNameDiv, "display", "");
			this._contentClassDiv = this.addContentItemPropertiesPane._contentClassNameDiv;

			if (this.addContentItemPropertiesPane._contentClassTooltip) {
				this.addContentItemPropertiesPane._contentClassTooltip.set("label", "");
			}
			this.addContentItemPropertiesPane.setContentClass(null);
			// Clear the security pane until a template is selected.
			this.addContentItemSecurityPane._contentClass = null;
			this.addContentItemSecurityPane._securityPane.reset();
			domStyle.set(this.addContentItemSecurityTitlePane.domNode, "display", "none");
			this._entryTemplate = null;
			this.addContentItemGeneralPane._entryTemplateSelector.reset();
		},

		/**
		 * @private
		 */
		_onFileInputChange: function() {
			if (this._entryTemplateIsFromFolder) {
				this._setEntryTemplateForFiles();
			}
			if (!this.disableAutoNameUpdate && this.repository && (!this.repository._isCM() && !this.repository._isOnDemand() || this.repository._isCM() && this.repository.docNamePropSetWithFileName)) {
				var fileName = this.addContentItemGeneralPane.getInputFileName().split('\\').pop().split('/').pop();
				var titlePropertyName = this.addContentItemPropertiesPane.getTitlePropertyName();
				if (titlePropertyName && this.addContentItemPropertiesPane._commonProperties) {
					var currValue = this.addContentItemPropertiesPane.getPropertyValue(titlePropertyName);
					if (this.repository.type == "box" || !currValue || currValue.length == 0 || (this.previousFileName && this.previousFileName == currValue)) {
						var attrDef = this.addContentItemPropertiesPane._commonProperties.attributeDefinitionsById[titlePropertyName];
						if (attrDef) {
							var handled = false;

							// If the repsitory type is Box, this is a checkin, a file is selected, and the field is readonly -  
							// then verify that the selected file's extension matches the current document title/file name extension.
							// Here we are using read only as an indicator that Box will not allow the user to change the document name,
							// in which case the user should not be able to check in a different kind of file (different extension).
							if (this.repository.type == "box" && this._checkin && fileName && attrDef.readOnly) {
								// The getPropertyEditors() method is only supported by the ICN CommonPropertiesPane widget, not the LayoutPropertiesPane widget
								// that may be used with an entry template. Also, this code expects the title property field to support getExtension().
								// When entry template support is added to box, this code will have to be updated.
								if (this.addContentItemPropertiesPane._commonProperties.getPropertyEditors) {
									var field = this.addContentItemPropertiesPane._commonProperties.getPropertyEditors().getFieldWithName(titlePropertyName);
									if (field) {
										var fileExtension = "";
										var index = fileName.lastIndexOf(".");
										if (index > -1) {
											fileExtension = fileName.substring(index).toLowerCase();
										}
										var fieldExtension = field.getExtension();
										if (fieldExtension) {
											fieldExtension = fieldExtension.toLowerCase();
										}
										if (fieldExtension != fileExtension) {
											if (!this._extensionErorDialog) {
												this._extensionErorDialog = new ErrorDialog();
												this._extensionErorDialog.messageProductId = " ";
											}
											this._extensionErorDialog.showMessage({
												text: this.messages.extension_changed,
												explanation: this.messages.extension_changed,
												number: ""
											});
											this.addContentItemGeneralPane._resetFileInput();
											fileName = "";
											handled = true;
										}
									}
								}
							}

							// If the file input change was not already handled above, and the document title property is 
							// a string, then assign the file name to the document title.
							if (!handled && (!attrDef.dataType || (attrDef.dataType.indexOf && attrDef.dataType.indexOf("xs:string") > -1))) {
								// For Box, clear the extension in the field before assigning the new file name.
								// The getPropertyEditors() method is only supported by the ICN CommonPropertiesPane widget, not the LayoutPropertiesPane widget
								// that may be used with an entry template. Also, this code expects the title property field to support clearExtension().
								// When entry template support is added to box, this code will have to be updated.
								if (this.repository.type == "box" && this.addContentItemPropertiesPane._commonProperties.getPropertyEditors) {
									var field = this.addContentItemPropertiesPane._commonProperties.getPropertyEditors().getFieldWithName(titlePropertyName);
									if (field && field.clearExtension) {
										field.clearExtension();
									}
								}
								this.addContentItemPropertiesPane.setPropertyValue(titlePropertyName, fileName);
								// defect 45363 BIDI: Run Add Document wizard with Hebrew and filename field does not display correctly.(RTL)
								var inputs = query('[name]');
								array.forEach(inputs, function(input) {
									if (input.name === titlePropertyName && input.dir === "rtl") {
										input.dir = "ltr";
										domStyle.set(input, "text-align", "right");
									}
								});
							}
						}
					}
				}
				this.previousFileName = fileName;
			}
			this._onChangeProperties();
		},

		/**
		 * @private
		 */
		_setToDocumentDrivenMode: function(entryTemplates) {
			if (entryTemplates) {
				this._documentDrivenMode = false;
				for (var i = 0; i < entryTemplates.length; i++) {
					//need to filter invalid file types out.
					var fileTypeString = this._getFileTypeStringForEntryTemplate(entryTemplates[i].fileTypes);
					if (fileTypeString.length > 0) {
						this._documentDrivenMode = true;
						break;
					}
				}
				if (this._documentDrivenMode) {
					var fileCategory = this.addContentItemGeneralPane._contentSourceTypeDiv;
					var fileInput = this.addContentItemGeneralPane._fileInputArea;
					var externalInput = this.addContentItemGeneralPane._externalFileNamesDiv;
					var externalURLDiv = this.addContentItemGeneralPane._externalURLDiv;
					this.addContentItemGeneralPane._contentTable.insertBefore(fileInput, this.addContentItemGeneralPane._contentTable.children[0]);
					this.addContentItemGeneralPane._contentTable.insertBefore(externalURLDiv, this.addContentItemGeneralPane._contentTable.children[0]);
					this.addContentItemGeneralPane._contentTable.insertBefore(externalInput, this.addContentItemGeneralPane._contentTable.children[0]);
					this.addContentItemGeneralPane._contentTable.insertBefore(fileCategory, this.addContentItemGeneralPane._contentTable.children[0]);
				}
			}
		},

		_setViewClassAndCommonProperties: function(show) {
			if (show) {
				if (this.addContentItemPropertiesPane._commonProperties) {
					domStyle.set(this.addContentItemPropertiesPane._commonProperties.domNode, "display", "");
				}
				if (this.addContentItemPropertiesPane._contentClassSelector.domNode) {
					domStyle.set(this._contentClassDiv || this.addContentItemPropertiesPane._contentClassSelectorDiv, "display", "");
				}
			} else {
				if (this.addContentItemPropertiesPane._commonProperties) {
					domStyle.set(this.addContentItemPropertiesPane._commonProperties.domNode, "display", "none");
				}
				if (this.addContentItemPropertiesPane._contentClassSelector.domNode) {
					domStyle.set(this._contentClassDiv || this.addContentItemPropertiesPane._contentClassSelectorDiv, "display", "none");
				}
			}
		},

		/**
		 * @private
		 */
		_loadFolderEntryTemplatesCheck: function(folder) {
			// Only look for entry templates associated with the folder when:
			//   - Adding (not at checkin)
			//   - An entry template has not been provided already
			// 	 - The repository type is P8, or - the repository type is CM, entry templates are enabled, and the folder is hierarchical.

			if (this._checkin || this._useTemplate) {
				return;
			}

			if (this.repository._isP8()) {
				this._loadFolderEntryTemplates(folder);
			} else if (this.repository._isCM() && this.repository.entryTemplatesEnabled) {
				// The class settings may not be retrieved yet, so retrieve them before testing for hierarchical.
				folder.getContentClass().retrieveAttributeDefinitions(lang.hitch(this, function(attributes) {
					var unfile = false;
					if (this.addContentItemGeneralPane && this.addContentItemGeneralPane._unfiled && this.addContentItemGeneralPane._unfiled.checked) {
						unfile = true;
					}
					if (!unfile) {
						this._setViewClassAndCommonProperties(false);
						this._loadFolderEntryTemplates(folder);
					} else {
						// Not searching for folder entry templates. Load the class selector.
						this._setViewClassAndCommonProperties(true);
						this.addContentItemPropertiesPane._renderClassSelector(this.repository, this._objectStore, this._filterType);
						this._onEntryTemplatesRetrieved(0);
					}
				}), false, lang.hitch(this, function() {
					this._onEntryTemplatesRetrieved(0);
				}));
			} else {
				this._onEntryTemplatesRetrieved(0);
			}
		},

		/**
		 * @private
		 */
		_loadFolderEntryTemplates: function(folder) {
			// Update the original folder.
			this._originalFolder = folder;

			// Hide entry template controls.
			domStyle.set(this.addContentItemGeneralPane._entryTemplateRow, "display", "none");
			domStyle.set(this.addContentItemGeneralPane._entryTemplateSelector.domNode, "display", "none");
			domStyle.set(this.addContentItemGeneralPane._entryTemplateNameTextBox.domNode, "display", "none");

			// Clear the entry template selector.
			this.addContentItemGeneralPane._entryTemplateSelector.reset();
			this.addContentItemGeneralPane._entryTemplateSelector.store = null;

			// Disable while checking for entry templates.
			this.addContentItemGeneralPane._majorVersion.set("disabled", true);
			domClass.add(this.addContentItemGeneralPane._majorVersionLabel, "labelReadOnly");
			this.addContentItemGeneralPane._autoClassify.set("disabled", true);
			domClass.add(this.addContentItemGeneralPane._autoClassifyLabel, "labelReadOnly");

			this.addContentItemGeneralPane._startOnWorkflow.set("disabled", true);
			this.addContentItemPropertiesTitlePane.set("disabled", true);
			this.addContentItemPropertiesPane._contentClassSelector.set("disabled", true);
			this.addContentItemPropertiesPane._contentClassNameTextBox.set("disabled", true);
			this.addContentItemSecurityTitlePane.set("disabled", true);

			this.repository.retrieveEntryTemplates(lang.hitch(this, function(entryTemplates, document_ET_count, folder_ET_count) {
				//remove folder et when adding documents.
				//remove document et when adding folders

				// Clear the old filtered entry template list.
				delete this._changedEntryTemplates;
				
				this._setViewClassAndCommonProperties(true);
				this.clearMessage();
				var resultEntryTemplates = [];
				for (var i = 0; i < entryTemplates.length; i++) {
					var tempEntryTemplate = entryTemplates[i];
					if (tempEntryTemplate && ((tempEntryTemplate.type == "DOCUMENT" && this._typeDocument) || (tempEntryTemplate.type == "FOLDER" && !this._typeDocument))) {
						resultEntryTemplates.push(tempEntryTemplate);
					}
				}
				this._entryTemplates = resultEntryTemplates;
				entryTemplates = resultEntryTemplates;
				this._entryTemplate = null;

				var templateCount = 0;
				if (this._typeDocument) {
					templateCount = document_ET_count;
				} else {
					templateCount = folder_ET_count;
				}
				if (!templateCount) {
					templateCount = 0;
				}

				if ((!entryTemplates || entryTemplates.length == 0) && templateCount == 0) {
					// No associated entry templates - enable regular Add behavior. 
					this._entryTemplateIsFromFolder = false;
					this._setControlStateDefaults();
					this._contentClassDiv = this.addContentItemPropertiesPane._contentClassSelectorDiv;
					this.addContentItemPropertiesPane._renderClassSelector(this.repository, this._objectStore, this._filterType);
				} else {
					//using associated entry templates.
					//hide the unfile checkbox
					if (this.addContentItemGeneralPane && this.addContentItemGeneralPane._allowUnfiledRow) {
						domStyle.set(this.addContentItemGeneralPane._allowUnfiledRow, "display", "none");
					}

					this.addContentItemGeneralPane.folderSelector.setDisabled(true);

					if (entryTemplates.length == 0 && templateCount > 0) {
						this.addContentItemGeneralPane._entryTemplateSelector.set("placeHolder", ecm.messages.add_document_no_permission_to_associations);
						this.setMessage(ecm.messages.add_document_no_entry_template_itemtype_permission);
					}
					this.addContentItemPropertiesPane._contentClassNameTextBox.set("value", "");
					if (this.addContentItemPropertiesPane._commonProperties) {
						this.addContentItemPropertiesPane._commonProperties.clearRendering();
					}

					domStyle.set(this.addContentItemPropertiesPane._contentClassSelectorDiv, "display", "none");
					domStyle.set(this.addContentItemPropertiesPane._contentClassNameDiv, "display", "");
					this._contentClassDiv = this.addContentItemPropertiesPane._contentClassNameDiv;
					this.addContentItemPropertiesPane.setContentClass(null);
					// Clear the security pane until a template is selected.
					this.addContentItemSecurityPane._contentClass = null;
					this.addContentItemSecurityPane._securityPane.reset();

					this._entryTemplateIsFromFolder = true;
					this._entryTemplates = entryTemplates;
					var templateItems = [];
					var defaultET = "";
					for (var i = 0; i < entryTemplates.length; i++) {
						templateItems.push({
							// A non-empty display name must be set, otherwise when no value is entered and focus 
							// leaves the field the first entry template with a blank label will be selected.
							label: entryTemplates[i].name ? entryTemplates[i].name : entryTemplates[i].id,
							value: String(i),
							entryTemplateId: this.repository._isCM() ? entryTemplates[i].itemId : entryTemplates[i].id
						});

						// If adding under a teamspace, check for the teamspace's default entry template. 
						if (this._teamspace && this._teamspace.defaultEntryTemplates ) {
							if( array.some(this._teamspace.defaultEntryTemplates, function(entryTemplateId) {
								return entryTemplates[i].id == entryTemplateId || entryTemplates[i].vsId == entryTemplateId;
							})){
								defaultET = String(i);
							}
						} else if (entryTemplates.length > 1 && entryTemplates[i].isDefault) {
							defaultET = String(i);
						}
					}

					var templateItemsStore = new DataStore({
						"store": new ItemFileWriteStore({
							data: {
								identifier: "value",
								label: "label",
								items: templateItems
							}
						})
					});

					this.addContentItemGeneralPane._entryTemplateSelector.store = templateItemsStore;
					this.addContentItemGeneralPane._entryTemplateSelector.set("disabled", false);
					if (defaultET) {
						this.addContentItemGeneralPane._entryTemplateSelector.set("value", defaultET);
					}

					// Show the entry template selector.
					this.addContentItemGeneralPane.showEntryTemplateSelector();
					if (entryTemplates.length == 1) {

						domStyle.set(this.addContentItemPropertiesPane._contentClassSelectorDiv, "display", "none");
						domStyle.set(this.addContentItemPropertiesPane._contentClassNameDiv, "display", "");
						this._contentClassDiv = this.addContentItemPropertiesPane._contentClassNameDiv;
						this._entryTemplateIsFromFolder = true;
						this._entryTemplate = entryTemplates[0];
						this.addContentItemGeneralPane._entryTemplateSelector.set("value", 0);
						this.addContentItemGeneralPane._entryTemplateSelector.set("disabled", true);
						// Retrieve the full entry template.	
						this._entryTemplate.retrieveEntryTemplate(lang.hitch(this, function(entryTemplate) {
							this.applyEntryTemplate(true);
						}), false, false);
					} else {
						this._setToDocumentDrivenMode(this._entryTemplates);
					}
					this._setEntryTemplateForFiles();
					
					//check DnD folders and folder entry template
					if( folder_ET_count > 0 && this._checkFolders( this.addContentItemGeneralPane.getSelectedFiles() ) ){
						this._setErrorMessage( ecm.model.Message.createErrorMessage("entry_template_folder_dnd_error", []) );
						this._actionButton.set("disabled", true);
					}
				}
				this._onEntryTemplatesRetrieved(this._entryTemplates.length);
			}), this._typeDocument ? "Document" : "Folder", folder.id, this._teamspace ? this._teamspace.id : null, folder.objectStore, lang.hitch(this, function() {
				this._onEntryTemplatesRetrieved(0);				
			}));
		},
		
		/**
		 * @private Sets the default state of controls to enable the standard behavior in the absence of an entry template.
		 */
		_setControlStateDefaults: function() {
			this.addContentItemGeneralPane._majorVersion.set("disabled", false);
			domClass.remove(this.addContentItemGeneralPane._majorVersionLabel, "labelReadOnly");
			this.addContentItemGeneralPane._startOnWorkflow.set("disabled", false); // no auto-classify without an ET
			this.addContentItemPropertiesTitlePane.set("disabled", false);
			domStyle.set(this.addContentItemPropertiesPane._contentClassNameDiv, "display", "none");
			this.addContentItemPropertiesPane._contentClassSelector.set("disabled", false);
			domStyle.set(this.addContentItemPropertiesPane._contentClassSelectorDiv, "display", "");
			this.addContentItemSecurityTitlePane.set("disabled", false);
		},

		/**
		 * @private
		 */
		_checkFolders: function( files ) {
			var findFolder = false;
			for( var i = 0; i < files.length; i ++ ){
				if( files[i].fullPath && files[i].name && files[i].fullPath != files[i].name ){
					findFolder = true;
					break;
				}
			}
			return findFolder;
		},		


		
		/**
		 * @private
		 */
		_onFolderSelect: function(/*ecm.model.SelectedFolder*/folder) {
			// skip teamspace template virtual folders
			if (folder && folder.item && folder.item.isVirtual) {
				return;
			}
			
			var _this = this;
			var folderChangedHandler = function(folder, refresh) {
				// If this is a document add, and an unfiled add is allowed, and a P8 repository root was selected - then clear 
				// the parentFolder since the document will be unfiled instead of being filed under the repository root.
				if (_this._typeDocument && (_this.addContentItemGeneralPane._allowUnfiledAdd == true || _this._entryTemplate) && folder.item.repository._isP8() && folder.item.rootFolder) {
					// Treat selecting the repository as adding an unfiled document.
					_this.parentFolder = null;
				} else {
					_this.parentFolder = folder.item;
				}

				if (refresh) {
					var repositoryTypeChanged = _this.repository.type != folder.item.repository.type;

					// Different repository selected, need to reload properties pane and class hierarchy
					_this.repository = folder.item.repository; // must be set before rendering
					_this.addContentItemPropertiesPane.createRendering(folder.item);
					// Need to reload security pane 
					_this.addContentItemSecurityPane._contentClass = null;
					_this.addContentItemSecurityPane._securityPane.reset();

					// Set the content type list per repository type
					if (repositoryTypeChanged) {
						if (_this.repository._isP8()) {
							for ( var choiceNdx in _this.addContentItemGeneralPane.contentSourceTypeChoices) {
								var choice = _this.addContentItemGeneralPane.contentSourceTypeChoices[choiceNdx];
								if (choice.value == "ExternalURL") {
									// Add in the ExternalURL option.
									_this.addContentItemGeneralPane._contentSourceType.addOption(choice);
									break;
								}
							}

							_this._applyDesktopShowSecurity();
						} else {
							var setDefaultSelection = false;
							for ( var choiceNdx in _this.addContentItemGeneralPane.contentSourceTypeChoices) {
								var choice = _this.addContentItemGeneralPane.contentSourceTypeChoices[choiceNdx];
								if (choice.value == "ExternalURL") {
									if (choice.selected == true) {
										setDefaultSelection = true;
									}
									// Remove the ExernalURL option.
									_this.addContentItemGeneralPane._contentSourceType.removeOption(choice);
									break;
								}
							}
							if (setDefaultSelection) {
								_this.addContentItemGeneralPane.onContentSourceTypeChange();
							}
							// Security pane is only visible for P8 or CM with entry template.
							domStyle.set(_this.addContentItemSecurityTitlePane.domNode, "display", "none");
							domClass.add(_this.ecmAddContentItemBorderContainer.domNode, "ecmAddContentItemDialogNoSecurityPane");
							// Hide the class select box and class text box.
							if (_this.repository._isBox()) {
								domStyle.set(_this.addContentItemPropertiesPane._contentClassSelectorDiv, "display", "none");
								domStyle.set(_this.addContentItemPropertiesPane._contentClassNameDiv, "display", "none");
							} else {
								_this._setViewClassAndCommonProperties(true);
							}
						}
					}

					// Show the major version setting for P8 and CMIS, otherwise hide it.
					domStyle.set(_this.addContentItemGeneralPane._majorVersionStartWorkflowDiv, "display", _this.repository._isP8Like() ? "" : "none");
				} else {
					_this.repository = folder.item.repository;
				}

				_this.addContentItemSecurityPane.updateParentFolder();
				if (!_this._checkin) {
					_this.addContentItemPropertiesPane.setParentFolder(_this.parentFolder);
				}

				_this._onChangeProperties();

				// Load the folder entry templates for the folder item.
				if (!_this._entryTemplateIsFromFolder && !_this._useTemplate) {
					_this._loadFolderEntryTemplatesCheck(folder.item);
				}
			}

			// Render the properties and security page again to pick up new classes and security when selected folder is different
			if (!_this.parentFolder || _this.parentFolder.id != folder.item.id) {
				if (folder.isTeamspaceSubFolder) { // Teamspace selection
					folder.item.retrieveTeamspace(lang.hitch(_this, function(teamspace) {
						// New teamspace selected
						if (_this._teamspace == null || _this._teamspace.id != teamspace.id) {
							_this._teamspace = teamspace;
							// Reset the content class selector so it will get reload with new data from the teamspace definition and clear out the default repository classes
							_this.addContentItemPropertiesPane._contentClassSelector.rootClassId = null;
							_this.addContentItemPropertiesPane._contentClassSelector.setRepository(folder.item.repository, true);
							if (!folder.item.privileges) {
								// Needs to this to get the real template name for the selected node is the root teamspace node.
								// The root teamspace node has a pseudo template name called "Template".  For CM, the add wizard will try to get the default template class
								// for the selected folder and "Template" template class name is invalid.  The retrieveAttributes call will update the selected node template class to a 
								// real "ICMTeamspace" name.
								folder.item.retrieveAttributes(lang.hitch(this, function() {
									folderChangedHandler(folder, true);
								}));
							} else {
								folderChangedHandler(folder, true);
							}
						} else {
							folderChangedHandler(folder, false); // new folder  in the same teampspace selected so no need to rerender the properties and security panes
						}
					}));
				} else {
					if (_this._teamspace) { // From a teamspace add to a repository add
						if (folder.item._teamspaceId == null) {
							_this._teamspace = null;
							// Reset the content class selector so it will get reload with new data from the repository and clear out the teamspace classes
							_this.addContentItemPropertiesPane._contentClassSelector.rootClassId = null;
							_this.addContentItemPropertiesPane._contentClassSelector.setRepository(folder.item.repository, true);
							folderChangedHandler(folder, true); // Force a refresh even if the repository id is the same since we are going from a teamspace add to a repository add.
						}
						else
						{
							folderChangedHandler(folder, false);
						}
					} else {
						folderChangedHandler(folder, _this.repository.id != folder.item.repository.id);
					}
				}
			} else {
				folderChangedHandler(folder, false);
			}
		},

		/**
		 * @private
		 */
		_onMajorCheckboxChange: function() {
			if (this.repository._isP8()) {
				this.addContentItemSecurityPane.updateSecurityPolicyTemplate();
			}
		},

		/**
		 * Updates the add dialog using the currently selected entry template settings.
		 * 
		 * @param renderProperties
		 *            A boolean value indicating whether a call should be made to render the property table widget
		 */
		applyEntryTemplate: function(renderProperties) {
			var entryTemplateSelected = this._entryTemplate ? true : false;
			// These fields are left alone by entry templates associated with folders.
			if (!this._entryTemplateIsFromFolder) {
				this.addContentItemGeneralPane.folderSelector.set("disabled", !entryTemplateSelected);
				this.addContentItemGeneralPane._contentSourceType.set("disabled", !entryTemplateSelected);
				domAttr.set(this.addContentItemGeneralPane._fileInput, "disabled", !entryTemplateSelected);
			} else {
				if (this._entryTemplate && this._entryTemplate.currentFolderAsParent) {
					this.parentFolder = this._originalFolder;
				}
			}
			if (this.repository._isP8()) {
				this.addContentItemGeneralPane._majorVersion.set("disabled", !entryTemplateSelected);
				if (entryTemplateSelected) {
					domClass.remove(this.addContentItemGeneralPane._majorVersionLabel, "labelReadOnly");
				} else {
					domClass.add(this.addContentItemGeneralPane._majorVersionLabel, "labelReadOnly");
				}
			}

			if (this._entryTemplate) {
				if (this.repository._isP8() || this.repository._isCM()) {
					var workflow = this._entryTemplate.workflow;
					if (workflow) {
						if (workflow.promptToLaunchWorkflow && !this._isWorkflowRunning) {
							domStyle.set(this.addContentItemGeneralPane._majorVersionStartWorkflowDiv, "display", "");
							this._displayEntryTemplatePromptLaunchWorkflow("", false);
							this.addContentItemGeneralPane.setStartOnWorkflow(true);
						} else {
							this._displayEntryTemplatePromptLaunchWorkflow("none", true);
						}
					} else {
						this._displayEntryTemplatePromptLaunchWorkflow("none", true);
					}
				}

				if (this._entryTemplate.type != ecm.model.EntryTemplate.TYPE.FOLDER) {
					if (this._repositoryDocumentMode) {
						var choices = [ "RepositoryDocument" ];
						this.addContentItemGeneralPane.addContentSourceTypeChoices(choices);
						domStyle.set(this.addContentItemGeneralPane._contentSourceTypeDiv, "display", "none");
						domStyle.set(this.addContentItemGeneralPane._fileInputArea, "display", "none");
					} else if (this.hasDaejaContent()) {
						var choices = [ "DaejaDocument" ];
						this.addContentItemGeneralPane.addContentSourceTypeChoices(choices);
						domStyle.set(this.addContentItemGeneralPane._contentSourceTypeDiv, "display", "none");
						domStyle.set(this.addContentItemGeneralPane._fileInputArea, "display", "none");
					} else {
						var choices = [];
						if (this._entryTemplate.allowSaveLocalDocument) {
							choices.push("Document");
						}
						if (this._entryTemplate.allowSavePropertiesOnly) {
							choices.push("Item");
						}
						if (this.repository._isP8()) {
							if (this._entryTemplate.allowSaveExternalDocumentLink) {
								choices.push("ExternalURL");
							}
						}
						if (this._entryTemplate.allowUserSelectSaveChoice && choices.length > 1 && !this.addContentItemGeneralPane.hasExternalFiles()) {
							domStyle.set(this.addContentItemGeneralPane._contentSourceTypeDiv, "display", "");
						} else {
							domStyle.set(this.addContentItemGeneralPane._contentSourceTypeDiv, "display", "none");
						}
						this.addContentItemGeneralPane.addContentSourceTypeChoices(choices);
					}
				}
			}

			this.addContentItemPropertiesTitlePane.set("disabled", !entryTemplateSelected);
			this.addContentItemPropertiesPane._contentClassNameTextBox.set("disabled", !entryTemplateSelected);
			this.addContentItemSecurityTitlePane.set("disabled", !entryTemplateSelected);

			if (this.addContentItemPropertiesPane._contentClassTooltip) {
				this.addContentItemPropertiesPane._contentClassTooltip.set("label", "");
			}
			this.addContentItemPropertiesPane._contentClassNameTextBox.set("value", "");

			// Clear any error message.
			this._clearErrorMessage();

			if (!entryTemplateSelected) {
				this.addContentItemPropertiesPane.setContentClass(null);
				this.addContentItemPropertiesPane.clearRendering();
				this.addContentItemSecurityPane._contentClass = null;
				this.addContentItemSecurityPane._securityPane.reset();
				return;
			}

			if (this.repository._isP8()) {
				// Present messages if this entry template supports declaring records.
				var declareRecord = this._entryTemplate.declareRecord;
				if (declareRecord && (declareRecord != "") && (declareRecord != ecm.model.EntryTemplate.DECLARE.NEVER_DECLARE)) {
					if (declareRecord == ecm.model.EntryTemplate.DECLARE.ALWAYS_DECLARE) {
						this.setMessage(this._messages.add_document_using_always_declare_template_warning, "warning");
					} else {
						this.setMessage(this._messages.add_document_using_optional_declare_template_info, "info");
					}
				}
			}

			// Show the entry template in a read-only text box if showEntryTemplateName is true, there's only one or none in the list, and this isn't a folder association
			if (this.showEntryTemplateName && (!this._entryTemplates || this._entryTemplates.length == 1) && !this._entryTemplateIsFromFolder) {
				this.addContentItemGeneralPane.showEntryTemplateNameTextBox(this._entryTemplate);
			} else if (!this.showEntryTemplateName && (!this._entryTemplates || this._entryTemplates.length == 1)) {
				domStyle.set(this.addContentItemGeneralPane._entryTemplateRow, "display", "none");
			} else {
				// Create the entry template tooltip and associate it with the entry template selector here 
				// so as not to override the required tooltip message that is displayed when an entry template 
				// has not been selected.
				this.addContentItemGeneralPane.createEntryTemplateSelectorTooltip(this._entryTemplate);
			}

			// Leave the folder location alone if this is for an existing item (checkin), 
			// or if the entry template is associated with the current folder.
			if (this._entryTemplate) {
				if (!this._item && (!this._entryTemplateIsFromFolder || !this._entryTemplate.currentFolderAsParent)) {
					this.parentFolder = this._entryTemplate.folder;
					if (this.repository._isP8()) {
						this._objectStore = this._entryTemplate.objectStore;
						if (this._entryTemplate.targetRepository) {
							this.repository = this._entryTemplate.targetRepository;
						}
					}
					var folderForTeamspace = this.parentFolder;
					if (folderForTeamspace == null) {
						folderForTeamspace = this._originalFolder;
					}
					var checkForTeamspace = folderForTeamspace && folderForTeamspace.repository && folderForTeamspace.repository.teamspacesEnabled;
					if (checkForTeamspace) {
						this.addContentItemGeneralPane.folderSelector.preventSelectRoot = false;
						folderForTeamspace.retrieveTeamspace(lang.hitch(this, function(teamspace) {
							this._teamspace = teamspace;
							//if (teamspace && this.parentFolder && teamspace.id == this.parentFolder.id) {
							//this.parentFolder = null;
							//}
							this._applyEntryTemplateFolderSelector();
							this._finishApplyEntryTemplate(renderProperties);
						}));
					} else {
						this._teamspace = null;
						this._applyEntryTemplateFolderSelector();
						this._finishApplyEntryTemplate(renderProperties);
					}
				} else {
					this._finishApplyEntryTemplate(renderProperties);
				}
			}
		},

		_applyEntryTemplateFolderSelector: function() {
			//this.addContentItemGeneralPane._setFolderSelector(this._teamspace != undefined && !this._entryTemplate.restrictToSelectedFolderOrDescendant);
			this.addContentItemGeneralPane.folderSelector.set("disabled", !this._entryTemplate.allowUserSelectFolder);
			if (this._entryTemplate.allowUserSelectFolder) {
				// A null folder means an unfiled add. 
				if (this.parentFolder == null) {
					// The entry template does not define a folder. Allow browsing a folder from the repository root.
					// If unfiled adds are allowed, or this is a folder entry template, the user may select the root in the folder selector.
					this.addContentItemGeneralPane.setTargetLocation(null, this.repository, this._objectStore, this._teamspace, true, false, false);
				} else {
					// Select the entry template folder.
					// If the default folder selected by the entry template is not valid for this user,
					// don't display an error message because the user is allowed to select a different folder.
					this.addContentItemGeneralPane.setTargetLocation(this.parentFolder, this.repository, this._objectStore, this._teamspace, true, this._entryTemplate.restrictToSelectedFolderOrDescendant, true);
				}
				// The folder selector may have been hidden by the previous entry template settings. Remove the display "none" style.
				domStyle.set(this.addContentItemGeneralPane._documentOnlyArea, "display", "");

			} else {
				//sometimes just set the folder selelctor disabled will not really disable the dropdown
				this.addContentItemGeneralPane._folderSelectorDropDown.setDisabled(!this._entryTemplate.allowUserSelectFolder);
				// The user is not allowed to select a folder. Hide the folder selector.
				domStyle.set(this.addContentItemGeneralPane._documentOnlyArea, "display", "none");

				// A null folder means an unfiled add. 
				if (this.parentFolder == null) {
					// This is handled in the folder selector by selecting the repository root.
					// Select the repository root so that the folder selector validation passes.
					this.addContentItemGeneralPane.setTargetLocation(this.repository, this.repository, this._objectStore, this._teamspace, false, false, false);
				} else { // There is a folder.
					// Verify that the user can add to the entry template folder.
					if (this.parentFolder.hasPrivilege && !this.parentFolder.hasPrivilege((this._entryTemplate.type == ecm.model.EntryTemplate.TYPE.FOLDER) ? "privAddLink" : "privAddToFolder")) {
						this._setErrorMessage(ecm.model.Message.createErrorMessage("entry_template_folder_restricted_error", [
							this._entryTemplate.name,
							this.parentFolder.name
						]));
						// Set the hidden folder selector to have nothing selected so that the add cannot proceed.
						this.addContentItemGeneralPane.setTargetLocation(null, this.repository, this._objectStore, this._teamspace, false, false, false);
					} else {
						// Select the entry template folder.
						this.addContentItemGeneralPane.setTargetLocation(this.parentFolder, this.repository, this._objectStore, this._teamspace, false, this._entryTemplate.restrictToSelectedFolderOrDescendant, true);
					}
				}
			}

			this.addContentItemPropertiesPane.setParentFolder(this.parentFolder);
		},

		/**
		 * @private
		 */
		_finishApplyEntryTemplate: function(renderProperties) {
			if (!this._item && this._entryTemplateIsFromFolder && this._entryTemplate && this._entryTemplate.currentFolderAsParent) {
				this.addContentItemGeneralPane.setTargetLocation(this.parentFolder, this.repository, this._objectStore, this._teamspace, true, true, true);
				domStyle.set(this.addContentItemGeneralPane._documentOnlyArea, "display", this._entryTemplate.allowUserSelectFolder ? "" : "none");
				this.addContentItemGeneralPane.folderSelector.set("disabled", true);
				this.addContentItemGeneralPane._folderSelectorDropDown.setDisabled(true);
			}

			if (this.repository._isP8()) {
				if (this._entryTemplate.type != ecm.model.EntryTemplate.TYPE.FOLDER) {
					var asMinorVersion = this._entryTemplate.asMinorVersion;
					this._displayEntryTemplateMajorVersion(!asMinorVersion.on, asMinorVersion.readOnly, asMinorVersion.hidden || !this._entryTemplate.allowUserSetPropertyValues);

					var autoClassify = this._entryTemplate.autoClassify;
					this._displayEntryTemplateAutoClassification(autoClassify.on, autoClassify.readOnly, autoClassify.hidden || !this._entryTemplate.allowUserSetPropertyValues);
				} else {
					this._displayEntryTemplateMajorVersion(null, true, true);
					this._displayEntryTemplateAutoClassification(false, true, true);
				}
			} else if (this.repository._isCM()) {
				if (this._checkin) {
					var checkinAsNewVersion = this._entryTemplate.checkinAsNewVersion;
					this._displayEntryTemplateNewVersion(checkinAsNewVersion.on, checkinAsNewVersion.readOnly, checkinAsNewVersion.hidden || !this._entryTemplate.allowUserSetPropertyValues);
				} else {
					this._displayEntryTemplateNewVersion(null, true, true);
				}
			}

			domStyle.set(this.addContentItemPropertiesTitlePane.domNode, "display", this._entryTemplate.allowUserSetPropertyValues ? "" : "none");
			domStyle.set(this.addContentItemPropertiesPane._documentClassDiv, "display", this._entryTemplate.hideClass ? "none" : "");
			domStyle.set(this.addContentItemSecurityTitlePane.domNode, "display", this._entryTemplate.allowUserSetSecurity ? "" : "none");

			if (this.addContentItemPropertiesPane._contentClassTooltip) {
				this.addContentItemPropertiesPane._contentClassTooltip.set("label", this._entryTemplate.addClassDescription);
			}
			this.addContentItemPropertiesPane._contentClassNameTextBox.set("value", this._entryTemplate.addClassLabel);
			this.addContentItemPropertiesPane.setContentClass(this.repository.getContentClass(this._entryTemplate.addClassName, this._entryTemplate.objectStore));

			// Render the properties only if the user selects a different ET after the add dialog is already opened
			if (renderProperties) {
				this.addContentItemPropertiesPane._renderProperties(this.addContentItemPropertiesPane._contentClass, this.repository, this._typeDocument);
			}

			if (this.repository._isP8()) {
				// If none of these P8 controls are displayed, hide the containing div.
				if ((domStyle.get(this.addContentItemGeneralPane._majorVersion.domNode, "display") == "none") && (domStyle.get(this.addContentItemGeneralPane._autoClassify.domNode, "display") == "none") && (domStyle.get(this.addContentItemGeneralPane._startOnWorkflow.domNode, "display") == "none")) {
					domStyle.set(this.addContentItemGeneralPane._majorVersionStartWorkflowDiv, "display", "none");
				}
			} else if (this.repository._isCM()) {
				// If none of these CM controls are displayed, hide the containing div.
				if ((domStyle.get(this.addContentItemGeneralPane._createNewVersionFieldset, "display") == "none") && (domStyle.get(this.addContentItemGeneralPane._startOnWorkflow.domNode, "display") == "none")) {
					domStyle.set(this.addContentItemGeneralPane._majorVersionStartWorkflowDiv, "display", "none");
				}
			}
			this.addContentItemGeneralPane._checkShowGeneralTab();

			// Re-validate the dialog to enable or disable the add button.
			this._onChangeProperties();
		},

		/**
		 * @private
		 */
		_displayEntryTemplateMajorVersion: function(value, readOnly, hidden) {
			if (!hidden) {
				domStyle.set(this.addContentItemGeneralPane._majorVersionStartWorkflowDiv, "display", "");
			}
			// Only change the major version value if a value is provided.
			if (value != null) {
				this.addContentItemGeneralPane.setAsMajorVersion(value);
			}
			this.addContentItemGeneralPane._majorVersion.set("disabled", readOnly);
			if (readOnly) {
				domClass.add(this.addContentItemGeneralPane._majorVersionLabel, "labelReadOnly");
			} else {
				domClass.remove(this.addContentItemGeneralPane._majorVersionLabel, "labelReadOnly");
			}
			var display = hidden ? "none" : "";
			domStyle.set(this.addContentItemGeneralPane._majorVersion.domNode, "display", display);
			domStyle.set(this.addContentItemGeneralPane._majorVersionLabel, "display", display);
			domStyle.set(this.addContentItemGeneralPane._majorVersionHoverHelp.domNode, "display", display);
		},

		/**
		 * @private
		 */
		_displayEntryTemplateAutoClassification: function(value, readOnly, hidden) {
			if (!hidden) {
				domStyle.set(this.addContentItemGeneralPane._majorVersionStartWorkflowDiv, "display", "");
			}
			this.addContentItemGeneralPane.setAutoClassify(value);
			this.addContentItemGeneralPane._autoClassify.set("disabled", readOnly);
			if (readOnly) {
				domClass.add(this.addContentItemGeneralPane._autoClassifyLabel, "labelReadOnly");
			} else {
				domClass.remove(this.addContentItemGeneralPane._autoClassifyLabel, "labelReadOnly");
			}
			var display = hidden ? "none" : "";
			domStyle.set(this.addContentItemGeneralPane._autoClassify.domNode, "display", display);
			domStyle.set(this.addContentItemGeneralPane._autoClassifyLabel, "display", display);
		},

		/**
		 * @private
		 */
		_displayEntryTemplatePromptLaunchWorkflow: function(display, disabled) {
			if (this._entryTemplate.type == ecm.model.EntryTemplate.TYPE.FOLDER) {
				domStyle.set(this.addContentItemGeneralPane._majorVersionStartWorkflowDiv, "display", display);
			}
			domStyle.set(this.addContentItemGeneralPane._startOnWorkflow.domNode, "display", display);
			domStyle.set(this.addContentItemGeneralPane._startOnWorkflowLabel, "display", display);
			this.addContentItemGeneralPane._startOnWorkflow.set("disabled", disabled);
		},

		/**
		 * @private
		 */
		_displayEntryTemplateNewVersion: function(value, readOnly, hidden) {
			if (!hidden) {
				domStyle.set(this.addContentItemGeneralPane._majorVersionStartWorkflowDiv, "display", "");
			}
			// Only change the new version value if a value is provided.
			if (value != null) {
				this.addContentItemGeneralPane.setNewVersion(value);
			}
			this.addContentItemGeneralPane._createNewVersionButton.set("disabled", readOnly);
			this.addContentItemGeneralPane._replaceExistingVersionButton.set("disabled", readOnly);
			if (readOnly) {
				domClass.add(this.addContentItemGeneralPane._createNewVersionLabel, "labelReadOnly");
				domClass.add(this.addContentItemGeneralPane._replaceExistingVersionButton, "labelReadOnly");
			} else {
				domClass.remove(this.addContentItemGeneralPane._createNewVersionLabel, "labelReadOnly");
				domClass.remove(this.addContentItemGeneralPane._replaceExistingVersionButton, "labelReadOnly");
			}

			this.addContentItemGeneralPane._showNewVersion(!hidden);
		},

		/**
		 * @private
		 */
		_onEntryTemplateSelectorChange: function() {
			// Changing the entry template. Make sure the tooltip for the old selection is closed.
			if (this.addContentItemGeneralPane.entryTemplateToolTip) {
				this.addContentItemGeneralPane.entryTemplateToolTip.close();
			}
			
			var selectedEntryTemplate = null;
			var entryTemplates = this._changedEntryTemplates || this._entryTemplates;

			if (entryTemplates) {
				var value = this.addContentItemGeneralPane._entryTemplateSelector.get("value");

				if (value) {
					var i = Number(value);
					if (i >= 0 && i < entryTemplates.length) {
						selectedEntryTemplate = entryTemplates[i];
					}
				}
			}
			// If an entry template was selected and it is not the current template...
			if (selectedEntryTemplate && (!this._entryTemplate || (selectedEntryTemplate.id != this._entryTemplate.id))) {
				// Clear the currently selected entry template.
				this._entryTemplate = null;
				this.applyEntryTemplate(true);

				// Retrieve the full entry template.	
				var selectedEntryTemplateRetrievedHandler = lang.hitch(this, function(entryTemplate) {
					this._entryTemplate = entryTemplate;
					// Saves the current value for reset in the _onEntryTemplateSelectorBlur when the name is invalid or null
					this._ETSelectorValue = this.addContentItemGeneralPane._entryTemplateSelector.get("value");
					if (this._ETSelectorValue && this._ETSelectorValue.length != 0) {
						// Updates the store with the updated Entry template name
						var displayedValue = this.addContentItemGeneralPane._entryTemplateSelector.get("displayedValue");
						var entryTemplateName = this._entryTemplate.name ? this._entryTemplate.name : this._entryTemplate.id;
						if (displayedValue != entryTemplateName) {
							// Updates the current entry template name						
							var currentItem = this.addContentItemGeneralPane._entryTemplateSelector.store.get(this._ETSelectorValue);
							currentItem.label = entryTemplateName;
							// Updates the data store with the modified item
							this.addContentItemGeneralPane._entryTemplateSelector.store.put(currentItem, {
								'overwrite': true
							});
							// Sets the selected item again to update the displayed value
							this.addContentItemGeneralPane._entryTemplateSelector.set("value", this._ETSelectorValue);
						}
					}					
					this.applyEntryTemplate(true);
				});

				if (!selectedEntryTemplate.isRetrieved) {
					selectedEntryTemplate.retrieveEntryTemplate(selectedEntryTemplateRetrievedHandler, false, false);
				} else {
					selectedEntryTemplateRetrievedHandler(selectedEntryTemplate);
				}
			}
		},

		/**
		 * @private
		 */
		_onEntryTemplateSelectorBlur: function() {
			// Always display the currently selected template name when the field loses focuses.
			// This keeps the display from being left with an invalid or blank entry template name
			// if the user deletes or modifies the entered text then leaves the selector field.
			if (this._entryTemplate) {
				var displayedValue = this.addContentItemGeneralPane._entryTemplateSelector.get("displayedValue");
				var entryTemplateName = this._entryTemplate.name ? this._entryTemplate.name : this._entryTemplate.id;
				if (displayedValue != entryTemplateName && this._ETSelectorValue) {
					this.addContentItemGeneralPane._entryTemplateSelector.set('value', this._ETSelectorValue);
				}
			}
		},

		//function(parentFolder,
		/*objectStore, 
		 *templateName, 
		 *criterias, 
		 *contentSourceType, 
		 *mimeType, 
		 *filename, 
		 *content,
		 * childComponentValues, 
		 * permissions, 
		 * securityPolicyId, 
		 * addAsMinorVersion, 
		 * autoClassify, 
		 * allowDuplicateFileNames, 
		 * setSecurityParent, 
		 * teamspaceId, 
		 * callback, 
		 * isBackgroundRequest, 
		 * onError, 
		 * compoundDocument) {
		/*
		 * 
		 */_buildFTParameters: function(params, documentItem) {
			this.logEntry("_getParameters");
			params.security_token = Request._security_token;
			params.filePath = documentItem.filePath;
			return params;
		},

		_cancelDialog: function() {
			this._onCancelDoNotFireAddFinished = true;
			this.onCancel();
			delete this._onCancelDoNotFireAddFinished;
		},

		/**
		 * The add dialog cancel event handler.
		 */
		onCancel: function() {
			if(this.addContentItemGeneralPane)
				this.addContentItemGeneralPane.doCleanup();
			if(this.addContentItemPropertiesPane)
				this.addContentItemPropertiesPane.doCleanup();
			this.inherited(arguments);
			if (!this._onCancelDoNotFireAddFinished) {
				this.onAddFinished();
			}
		},

		/**
		 * Tests if the current settings in the add dialog are valid.
		 * 
		 * @param onSaveStatus
		 * @since 2.0.3 A boolean value. If <code>true</code>, changes are being saved and focus will be directed to the first invalid setting.
		 * @return {Boolean} A value of <code>true</code> if the current settings in the add dialog are valid,
		 *         otherwise <code>false</code>.
		 */
		isValid: function(onSaveStatus) {
			// Always check both the general pane and the properties pane before returning the valid state.
			var generalValid = this.addContentItemGeneralPane.isValid(onSaveStatus);

			// Returns null if all entries are valid.
			// Have the properties pane validate method set the focus to the first invalid field 
			// if saving and the general pane is valid. 
			var propertiesValid = !this.addContentItemPropertiesPane.validate(this._checkin, onSaveStatus, onSaveStatus && generalValid);

			// Both panes must be in a valid state.
			return generalValid && propertiesValid;
		},

		/**
		 * Get the Daeja content
		 * @since 3.0.1
		 */
		getDaejaContent: function() {
			return this._daejaContent;
		},

		/**
		 * Set the Daeja content and file name
		 * @since 3.0.1
		 */
		setDaejaContent: function(daejaContent, daejaPartFileName) {
			if (lang.isString(daejaContent))
				daejaContent = dojojson.fromJson(daejaContent);
			this._daejaContent = daejaContent;
			if (daejaPartFileName)
				this._daejaPartFileName = daejaPartFileName;
			this.addContentItemGeneralPane.contentSourceTypeChoices = [
				{
					value: "Item",
					label: ecm.messages.add_document_metadata_label
				},
			];
		},

		/**
		 * Set redaction content and file name
		 * @deprecated 3.0.1 Use <code>setDaejaContent()</code> instead.
		 */
		setRedactionContent: function(redactionContent, redactionPartFileName) {
			return this.setDaejaContent(redactionContent, redactionPartFileName);
		},

		/**
		 * Return true if Daeja content is set
		 * @since 3.0.1
		 */
		hasDaejaContent: function() {
			return (this._daejaContent != null);
		},

		/**
		 * Return true if redaction content is set
		 * @deprecated 3.0.1 Use <code>hasDaejaContent()</code> instead.
		 */
		hasRedactionContent: function() {
			return this.hasDaejaContent();
		},

		/**
		 * Return the Daeja content file name
		 * @since 3.0.1
		 */
		getDaejaPartFileName: function() {
			return this._daejaPartFileName;
		},

		/**
		 * Set the Daeja content file name
		 * @since 3.0.1
		 */
		setDaejaPartFileName: function(daejaPartFileName) {
			this._daejaPartFileName = daejaPartFileName;
		},

		/**
		 * Return the redaction content file name
		 * @deprecated 3.0.1 Use <code>getDaejaPartFileName()</code> instead.
		 */
		getRedactionPartFileName: function() {
			return this.getDaejaPartFileName();
		},

		/**
		 * Cleans up the widget.
		 */
		destroy: function() {
			this.folderSelectorCallback = null;
			this._actionButton = null;
			this._validationCallback = null;
			this._parentFolder = null;
			this._desktopFolder = null;
			this._entryTemplate = null;
			this._entryTemplates = null;
			this._item = null;
			this._defaultContentClass = null;
			this._repositoryTypes = null;
			this._originalFolder = null;
			this._appGrp = null;
			this._daejaContent = null;
			this._daejaPartFileName = null;

			// this._actionButton is cleaned up in BaseDialog

			if (this._errorDialog) {
				this._errorDialog.destroyRecursive();
				this._errorDialog = null;
			}
			if (this._extensionErorDialog) {
				this._extensionErorDialog.destroyRecursive();
				this._extensionErorDialog = null;
			}
			if (this._statusDialog) {
				this._statusDialog.destroyRecursive();
				this._statusDialog = null;
			}
			if (this._batchStatusDialog) {
				if (this._batchStatusDialog.progressBar) {
					this._batchStatusDialog.progressBar.destroyRecursive();
					this._batchStatusDialog.progressBar = null;
				}
				this._batchStatusDialog.destroyRecursive();
				this._batchStatusDialog = null;
			}
			if (this._batchResults) {
				this._batchResults.destroyRecursive();
				this._batchResults = null;
			}
			this.inherited(arguments);
		}
	});
});
