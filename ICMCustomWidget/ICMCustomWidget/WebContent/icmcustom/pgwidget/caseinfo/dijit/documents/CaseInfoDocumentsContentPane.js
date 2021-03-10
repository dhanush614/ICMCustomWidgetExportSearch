define([ "dojo/_base/declare",
		"dojo/_base/lang",
		"dojo/_base/array",
		"dojo/_base/event",
		"dojo/dom-style",
		"dojo/sniff",
		"dojo/on",
		"ecm/widget/listView/gridModules/DndRowMoveCopy",
        "icmcustom/widget/listView/ContentList",
		"ecm/model/admin/RepositoryConfig",
		"icm/base/BaseActionContext",
		"icm/widget/Breadcrumb",
		"icm/widget/listView/modules/Toolbar",
		"icm/widget/listView/modules/RowContextualMenu",
		"icmcustom/widget/listView/_DndCaseAddDoc",/*ContentItem missing*/
		"icm/pgwidget/caseinfo/CaseInfoComponent",
		"icm/widget/menu/MenuManager",
		"./_ViewCaseDocumentDetails",
		"./_ViewSplitCaseDocumentMagazine",
		"./_ViewSplitCaseDocumentDetails",
		"dojo/text!../templates/documents/CaseInfoDocumentsContentPane.html",
		"dojo/text!../templates/documents/CaseInfoDocumentsContentPaneMobile.html",
        "icm/widget/listView/modules/ViewMagazine",
														 
        "icm/widget/listView/decorators/MagazineViewDecorator",
        "icm/util/Util"], function(declare, lang, array, event, domStyle, sniff, on, DndRowMoveCopy, ContentList, RepositoryConfig, BaseActionContext, Breadcrumb, icmToolbar, icmContextMenu, DndCaseAddDoc, CaseInfoComponent, MenuManager, viewCaseDocDetails, viewSplitCaseDocMagazine, viewSplitCaseDocDetails, template, templateMobile, ViewMagazine, MagazineViewDecorator, Util) {
				
	/**
			
	 * @name icm.pgwidget.caseinfo.dijit.documents.CaseInfoDocumentsContentPane
	 * @class Displays folders and documents associated with a case.
	 * @augments icm.pgwidget.caseinfo.dijit.CaseInfoComponentContentPane,
	 *           icm.base.BaseActionContext
	 */
	return declare("icmcustom.pgwidget.caseinfo.dijit.documents.CaseInfoDocumentsContentPane", [ CaseInfoComponent,
			BaseActionContext ], /** @lends icm.pgwidget.caseinfo.dijit.documents.CaseInfoDocumentsContentPane.prototype */ {

		widgetsInTemplate : true,
		templateString : sniff("ios") ? templateMobile : template,
		selectedDocList : [], // selected doc list in split mode
		autoHeight : false, // autoHeight flag for content list
		proxyDocList: {},

		constructor : function(param) {
			this.logEntry("constructor");
			console.log("From CaseInfoDocumentsContentPane script.")
			if (param.context) {
				this.parentWidget = param.context;
				this.widgetProperties = param.context.widgetProperties;
				// load resource msgs
				this.resourceBundle = param.resourceBundle;
			} else { // stand-alone case
				this.widgetProperties = param.widgetProperties;
				if (arguments[1])
					this.domNode = arguments[1];
			}
			this.caseFolder = null;

			this.hasCallback = true;

			// current Case Id whose doc/folder list is in display.
			this.currCaseId = null;

   
			// split case mode
			this.bSplitCaseMode = param.bSplitCaseMode ? true : false;
   
			this.logExit("constructor");
		},

		postCreate : function() {
  

			this.logEntry("postCreate");
			this.componentName = this.componentName || "documents";
			this.inherited(arguments);

			this.contentList = this.ecmContentList;

			// setup modules for Nexus contentlist widget
			this.ecmContentList.setContentListModules(this._getContentListModules());
			this.ecmContentList.setGridExtensionModules(this._getContentListGridModules());
			
			this._ecmContentListHandlers = [];

			// set callback when result set changes to update the action context
			this._ecmContentListHandlers.push(this.connect(this.ecmContentList, "onSetResultSet", "_onSetResultSet"));

			// set callback when items are selected
																	  
   
			this._ecmContentListHandlers.push(this.connect(this.ecmContentList, "onSelectItem", "_onSelectItem"));
																   

			// set callback when grid is created
			this._ecmContentListHandlers.push(this.connect(this.ecmContentList, "_createGrid", "_createGrid"));

			// auto height resize
			this._ecmContentListHandlers.push(this.connect(this.ecmContentList, "onOpenItem", "_onOpenItem"));
			
			// set callback after document pane renders
			this._ecmContentListHandlers.push(this.connect(this.ecmContentList, "onRender", "_onRender"));
			

			// set callback for selecting check box in split mode
			if (this.bSplitCaseMode) {
				this._ecmContentListHandlers.push(this.connect(this.ecmContentList, "onRowClick", "_onRowClicked"));
				if (this.selectedDocList)
					delete this.selectedDocList;
				this.selectedDocList = [];
				this._ecmContentListHandlers.push(this.connect(this.contentList,"onGridResize", "_onGridResize"));
			}

			// Note: this is required by Nexus contentlist widget. If not, will
			// get a JS err.
			if (this.ecmContentList.startup)
				this.ecmContentList.startup();

			// do not show the view buttons if only one view is displayed
			if (this.widgetProperties.EnableSwitch === false) {
				var toggleViewArea = this.ecmContentList.toggleViewArea;
				domStyle.set(toggleViewArea, "display", "none");
			}
			/* icm code start */
			// Accomodate ICN code not migrated yet
			if (sniff("ios") && this.ecmContentList && this.ecmContentList.gridArea) {
				dojo.connect(this.ecmContentList.gridArea.domNode, dojo.touch.press, this, "stopScroll");
			}
			
			if (sniff("ios") && this.contentList) {
				this.connect(this.contentList, "onViewButtonClicked", "_resetMobileCheckFlag");
			}
			
			this.logExit("postCreate");
		},

		
		_onGridResize: function(){
		   if (this.bSplitCaseMode && this.ecmContentList._resultSet) {
			this.refreshCheckbox();
		   }
		},
		
	/*	onContentMagazineViewStructure: function(column) {
			column.widgetPaneId = this.id;
			column.setCellValue = lang.hitch(this.ecmContentList, MagazineViewDecorator.contentCellValue);
		},*/

        /**
         * Use 16px icon for thumbnail
         * @param column
         * @private
         */
        onThumbnailMagazineViewStructure: function(column) {
            column.width = "16px";
            column.decorator = lang.hitch(this.ecmContentList, MagazineViewDecorator.thumbnailDecorator);
			column.setCellValue = lang.hitch(this.ecmContentList, MagazineViewDecorator.newThumbnailCellValue);
        },

        onClbCommentCountMagazineViewStructure: function(column) {
            column.decorator = lang.hitch(this.ecmContentList, MagazineViewDecorator.contentCellDecoratorClbCommentCount);
        },
		
		onClbDownloadCountMagazineViewStructure: function(column) {
            column.decorator = lang.hitch(this.ecmContentList, MagazineViewDecorator.contentCellDecoratorClbDownloadCount);
        },
		
		onClbRecommendationCountMagazineViewStructure: function(column) {
            column.decorator = lang.hitch(this.ecmContentList, MagazineViewDecorator.contentCellDecoratorClbRecommendationCount);
        },		
		
		onClbTagsMagazineViewStructure: function(column) {
            column.decorator = lang.hitch(this.ecmContentList, MagazineViewDecorator.contentCellDecoratorClbTags);
        },			

		_resetMobileCheckFlag: function() {
            this.connect_onClickCheckAll = false;
		},

		stopScroll : function(e) {
			var beforeTop = this.ecmContentList.grid.bodyNode.scrollTop;
			this.ecmContentList.grid.bodyNode.scrollTop += 1;
			var afterTop = this.ecmContentList.grid.bodyNode.scrollTop;
			this.ecmContentList.grid.bodyNode.scrollTop -= 2;
			if (beforeTop != afterTop || afterTop != this.ecmContentList.grid.bodyNode.scrollTop) {
				event.stop(e);
			}
			this.ecmContentList.grid.bodyNode.scrollTop = beforeTop;
		},/* icm code end */

		_onSetResultSet : function() {
  
   
			this.logEntry("_onSetResultSet");
			this.inherited(arguments);
						
			if (this.bSplitCaseMode) {
				var results = this.ecmContentList.getResultSet();
				var items = results.getItems();
				for (var i in items) {
					var contentItem = items[i];
					if (contentItem.isFolder() && contentItem.template && contentItem.template === "CmAcmCaseBoxCollaborationFolder") {						
						results.deleteItem(items[i]);
						//results.onChange(results);
						break;
					}
				}
			}

			// set current result set and folder as action context
			this.setActionContext("CurrentFolder", this.ecmContentList.getResultSet().parentFolder, false);
			this.setActionContext("ResultSet", this.ecmContentList.getResultSet(), false);
 
			
			if (this.proxyDocList)
				delete this.proxyDocList;
			this.proxyDocList = [];

			// clean selected items context
			this.cleanActionContext("Folder");
			this.cleanActionContext("Document");
			this.cleanActionContext("ProxyDocument");
			this.logExit("_onSetResultSet");
		},

		_onSelectItem : function(selectedItems) {
   
			this.logEntry("_onSelectItem");
			var self = this;
			var context = this.context || this;

			this.cleanActionContext("Folder");
			this.cleanActionContext("Document");
			this.cleanActionContext("ProxyDocument");

			// filter documents only
			array.forEach(selectedItems, function(item) {

				if (item.mimetype === "folder") {
					self.setActionContext("Folder", item, true);
					context.onPublishEvent("icm.SelectFolder", item);
					
					// retrieve box folder
					if (item.template && item.template == "CmAcmCaseBoxCollaborationFolder") {
						var currCase = self.getActionContext("Case")[0].getCase();
						Util.getExternalFolder(item, currCase, lang.hitch(self, function(boxFolder) {
							var currentList = self.ecmContentList.getResultSet();
							var folderIndex = currentList.getIndexOfItem(item);
							currentList.setItem(folderIndex, boxFolder);
							currentList.onChange(currentList);
							self.ecmContentList.grid.select.row.selectByIndex(folderIndex);
						}));
						self.cleanActionContext("Folder");
					} else {
						self.onSelectItem(item);
					}
				} else {
   
					if (item.isExternalDocument && !self.bSplitCaseMode) {
						var proxyDocument = item;
						var currentList = self.ecmContentList.getResultSet();
						
															
						// Retrieve all attributes for the selected content item 
									 
						Util.getExternalDocument(item, lang.hitch(self, function(externalContentItem){
							if(externalContentItem.repository.type == "od"){
								//merging the P8 ext reference doc values to od document - APAR PJ45702 
								externalContentItem.attributeLabels["DateLastModified"] = item.attributeLabels["DateLastModified"];
								externalContentItem.attributeLabels["LastModifier"] = item.attributeLabels["LastModifier"];
								externalContentItem.attributeTypes["DateLastModified"] = "xs:timestamp";								
								externalContentItem.attributes["DateLastModified"] = (item.getValue("DateLastModified") != undefined ) ? item.getValue("DateLastModified") : "";
																																 
																																																				
								externalContentItem.attributes["LastModifier"] = (item.getValue("LastModifier") != undefined ) ? item.getValue("LastModifier") : "";
								externalContentItem.attributeDisplayValues["DateLastModified"] = (item.getValue("DateLastModified") != undefined ) ? item.getDisplayValue("DateLastModified") : "";
								externalContentItem.attributeDisplayValues["LastModifier"] = (item.getValue("LastModifier") != undefined ) ? item.getDisplayValue("LastModifier") : "";
							}
							self._prepareForDisplay(externalContentItem, lang.hitch(self, function() {
								var docIndex = currentList.getIndexOfItem(item);
								self.proxyDocList[externalContentItem.id] = proxyDocument;
																																													 
																																																																																												   
								currentList.setItem(docIndex, externalContentItem);
								currentList.onChange(currentList);
								self.ecmContentList.grid.select.row.selectByIndex(docIndex);
							}));
						}), true);
					} else {

						if (!self.bSplitCaseMode) {  // no need to refresh attributes for split case since doc checkout/in ops are not allowed.
							// Right click the document will retrieve the attributes first
							//Fix APAR PJ44067 to make onChange run after retrieving the item's attributes to update the grid cache -- noOnChange = false
							item.retrieveAttributes(null, true, false);
						}
						self.setActionContext("Document", item, true);
						
						// Set proxy context
						if (self.proxyDocList[item.id] && (((item.repository.type === "p8") && (item.repository.id !== self.caseFolder.repository.id)) || (item.repository.type === "box") || (item.repository.type == "cm") || (item.repository.type == "od") || (item.repository.type == "cmis"))) {
							self.setActionContext("ProxyDocument", self.proxyDocList[item.id], true);
						}
						//commented to avoid document to open in viewer on selection of check box
						/*context.onPublishEvent("icm.SelectDocument", {
							contentItem : item
						});*/
						self.onSelectItem(item);
					}
				}
				
			});
  
			this.logExit("_onSelectItem");
   

		},

		_onRowClicked : function(selectedItem, e) {

			this.logEntry("_onRowClicked");
							 
			if (!this.bSplitCaseMode)
				return;
			// In split case mode, update the check box and the doc list
			if (typeof selectedItem === "object") {

				if (selectedItem.isExternalDocument && !this.bExternalDocSupport())
					// do nothing if selected item is ext doc BUT
					// the new split case is not enable with ext doc option.
					return;

				var grid = this.ecmContentList.grid;
				var index = grid.model.idToIndex(selectedItem.id);
				var node = grid.body.getCellNode({// td
					visualIndex : index,
					colId : "1"
				});
		/*		var checkboxClicked = node === e.cellNode ? true : false;
				//APAR 328310
				if(checkboxClicked && node.firstChild.type === "checkbox" && node.firstChild.checked){
						var index = this.indexOfItem(this.selectedDocList, selectedItem.id);
						if(index >= 0)
							checkboxClicked = false
				} else if (checkboxClicked && node.firstChild.type === "checkbox" && !node.firstChild.checked){
					var index = this.indexOfItem(this.selectedDocList, selectedItem.id);
					if(index < 0)
						checkboxClicked = false;
				}
				*/
				var checkbox = node ? node.firstChild : null; // checkbox
				if (checkbox && checkbox.type === "checkbox") {
					checkbox.checked = checkboxClicked ? checkbox.checked : !checkbox.checked;
					if (checkbox.checked) {
						this.selectedDocList.push(selectedItem);
						// sets the checkAllValue of checkAll checkbox based on whether all items in grid are selected. Folders are excluded.
						//this.allDocsInViewSelected(this.ecmContentList.getResultSet());
					} else {
						var docIndex = this.indexOfItem(this.selectedDocList, selectedItem.id);
						if (docIndex >= 0)
						{
							this.selectedDocList.splice(docIndex, 1);
							//if all items of grid are not selected, uncheck the CheckAll checkbox
							//this._checkAllValue = false;
						}
							
					}
					this.parentWidget.selectDocs();
				}
			}
			this.logExit("_onRowClicked");
		},

		// Get the index of an item in the item list
		indexOfItem : function(itemList, itemId) {
  
			if (!itemList || itemList.length === 0)
				return -1;
			for ( var i = 0; i < itemList.length; i++) {
				if (itemList[i].id === itemId)
					return i;
			}
			return -1;
		},

		_getCustomColumnNames: function () {
			var repoId = this.caseFolder.repository.id;
			if (!this._customColNames) {
				var repoConfig = RepositoryConfig.createRepositoryConfig(repoId);
				repoConfig.getConfig(lang.hitch(this, function(response) {
					var defCols = repoConfig.getDocumentSystemProperties();
					this._customColNames = this._detectCustomCols (defCols, repoConfig.getFolderDefaultColumns());    // folder columns same as doc columns
					this._customMagColNames = this._detectCustomCols (defCols, repoConfig.getFolderMagazineDefaultColumns());
					if ((this._customColNames && this._customColNames.length > 0) ||
					     (this._customMagColNames && this._customMagColNames.length > 0))
						this._hasCustomColumns = true;
				}));
			}
		},
		
		_detectCustomCols: function (defCols, configuredCols) {
			var retCustomCols = [];
			array.forEach (configuredCols, function(colName) {
				var bFound = false;
				array.some (defCols, function (defColName) {
					if (defColName === colName)
						bFound = true;
					return bFound;
				});
				if (!bFound)
					retCustomCols.push(colName);
			});
			
			return retCustomCols;
		},
		
		_setUpColumns: function (extDoc, colNames) {
			var requiredCols = null;
			if (colNames) {
				requiredCols = [];
				array.forEach (colNames, function (colName) {
					if (colName !== "{NAME}" && extDoc.attributeLabels[colName]) {
						var colInfo = {id: colName, name: extDoc.attributeLabels[colName], type: extDoc.attributeTypes[colName]};
						requiredCols.push(colInfo);
					}
				});
			}
			return requiredCols;
		},
		
		_prepareForDisplay: function (extDoc, callback) {
			if (this._hasCustomColumns && !this._detailedViewColumns) {
				extDoc.retrieveAttributes(lang.hitch(this, function() {
					this._detailedViewColumns = this._setUpColumns (extDoc, this._customColNames);
					this._magViewColumns = this._setUpColumns (extDoc, this._customMagColNames);
					if (callback)
						callback();
				}));
			}	
			else
			if (callback)
				callback();
		},
		
		getDetailedCustomColunns: function () {
			return this._detailedViewColumns;
		},
		
		getMagCustomColumns: function () {
			return this._magViewColumns;
		},
		
		isSelectedForSplitCase: function (selectedItem) {
			var inx = this.indexOfItem(this.selectedDocList, selectedItem.id);
			return (inx >= 0) ? true : false;
		},
		
		_createGrid : function() {
			this.logEntry("_createGrid");
			// clean selected items context
			this.cleanActionContext("Folder");
			this.cleanActionContext("Document");
			this.cleanActionContext("ProxyDocument");

			// Set callback on grid in split mode
			if (this.bSplitCaseMode) {
				// This could be triggered by deleting document, need to
				// validate the selection list
				this.validateSelectedDocs();
			}

			this.inherited(arguments);
			this.logExit("_createGrid");
		},

		resize : function() {
 
			this.logEntry("resize");
			this.inherited(arguments);

			// Resize the parent widget in split mode
			if (this.bSplitCaseMode && this.ecmContentList._resultSet) {
				this.parentWidget.resize();
				//this.refreshCheckbox();
			}
			this.ecmContentList.resize(); //RTC 143174
			this.logExit("resize");
		},

		//set value of _checkAllValue based on documents selected in grid.
		allDocsInViewSelected : function (gridResultSet){
			var itemsInResultSet = gridResultSet.items;
			var docsInGrid = [];
			
			for(var i=0; i<itemsInResultSet.length; i++)
			{
				if(itemsInResultSet[i].mimetype == "folder")
					continue;	
				else
				{
					var docIndex = this.indexOfItem(this.selectedDocList, itemsInResultSet[i].id);
					if (docIndex < 0)
					{
						this._checkAllValue = false;
						break;
					}
					else
						this._checkAllValue = true;
					
				}
				
			}
			
		},
		
		// update CheckAll checkbox during drilling down subfolders
		switchCheckAll:function(){
			var curResultSet = this.contentList.getResultSet();
			var curItems = curResultSet.items;
			var folderCount = 0;
			for(var i=0; i< curItems.length; i++)
			{
				if(curItems[i].mimetype == "folder")
				{
					folderCount++;
					continue;
				}
				else
				{
					var docIndex = this.indexOfItem(this.selectedDocList, curItems[i].id);
					var checked = docIndex >= 0 ? true : false;
					if(!checked)
					{
						this._checkAllValue = false;
						break;
					}
					else
						this._checkAllValue = true;
				}		
			}
			if(curItems.length == folderCount)
			{
				this._checkAllValue = false;
			}
		},
		// Validate the selected document list
		validateSelectedDocs : function() {
			this.logEntry("validateSelectedDocs");
			this.switchCheckAll();
			var currentDocs = this.ecmContentList.getResultSet();
			var currentFolder = currentDocs.parentFolder;
			var originalCount = this.selectedDocList.length;
			for ( var i = 0; i < this.selectedDocList.length; i++) {
				var selectedDoc = this.selectedDocList[i];
				// Check if the selected doc was in the current folder
				if (selectedDoc.parent.id != currentFolder.id)
					continue;
				var bExists = false;
				for ( var j = 0; j < currentDocs.items.length; j++) {
					var listedItem = currentDocs.items[j];
					if (listedItem.id === selectedDoc.id) { // selected item
															// still exists
						bExists = true;
						break;
					}
				}
				// Remove from the selection list if the doc had been deleted
				if (!bExists) {
					this.selectedDocList.splice(i, 1);
					i--;
				}
			}
			if (this.selectedDocList.length != originalCount) // The list has
																// changed
				this.parentWidget.selectDocs();

			this.logExit("validateSelectedDocs");
		},
		
		_onHeaderKeyDown : function(evt) {
			this.logEntry("_onHeaderKeyDown");
			var isSpaceOrEnter = ((evt.keyCode == dojo.keys.SPACE) || (evt.keyCode == dojo.keys.ENTER));
			if (isSpaceOrEnter) {
				var checkall = document.getElementById(this._getUniqueCheckBoxId()); //("split_checkbox_all");
				checkall.checked = checkall.checked ? false : true;
				this._onClickCheckAll();
			}
			this.logExit("_onHeaderKeyDown");
		},
		
		// Update the check box status per selection list
		refreshCheckbox : function() {
   
			this.logEntry("refreshCheckbox");
			// Set callback when clicking the checkbox in grid header
			var checkall = document.getElementById(this._getUniqueCheckBoxId()); //("split_checkbox_all");
			if (checkall) {
				if (this._checkAllValue)
					checkall.checked = this._checkAllValue;
				//uncheck CheckAll checkbox if all items of grid are not checked
				else if(this._checkAllValue == false)
					checkall.checked = this._checkAllValue;
				if(sniff("ios")){
	                if(!this.connect_onClickCheckAll){
	                	this.connect_onClickCheckAll=true;
	                	on(checkall, "click", lang.hitch(this, this._onClickCheckAll));
	                }
				}
                else{
    				on(checkall, "click", lang.hitch(this, this._onClickCheckAll));
                }
				if (checkall.parentNode && checkall.parentNode.parentNode) {
					// on(checkall.parentNode.parentNode, "onkeydown",
					// lang.hitch(this,this._onHeaderKeyDown));
				}
			}
			for ( var i = 0; i < this.ecmContentList._resultSet.items.length; i++) {
				// Check if the doc had been selected
				var item = this.ecmContentList._resultSet.items[i];
				var docIndex = this.indexOfItem(this.selectedDocList, item.id);
				var checked = docIndex >= 0 ? true : false;

				// Update checkbox
	
				var checkbox = document.getElementById("split_checkbox_" + this.id + i);
				if (checkbox)
					checkbox.checked = checked;
			}
			this.logExit("refreshCheckbox");
		},

		_onClickCheckAll : function() {
   
			this.logEntry("_onClickCheckAll");
			var checkall = document.getElementById(this._getUniqueCheckBoxId()); //("split_checkbox_all");
			this._checkAllValue = checkall.checked ? true : false;
			if(sniff("ios")){
	        	if(!this.isChecked){
	        		this.isChecked=true;
	        	}else{
	        		this.isChecked=false;
	        	}
	        	this._checkAllValue = this.isChecked;
	            checkall.checked = this.isChecked;				
			}
			var itemCnt = this.ecmContentList._resultSet.items.length;
			var itemIdPrefix = "split_checkbox_" + this.id;
			var doneSelectedDocsUpdate = false;
			for (var i = 0; i < itemCnt; i++) {  
				var item = this.ecmContentList._resultSet.items[i];
				if (item.isFolder && !item.isFolder()) {
					var checkBoxId = itemIdPrefix + i;
					this._getCheckBoxUIElement(checkBoxId, i, lang.hitch(this, function (checkbox, selectedDoc) {
						if (checkbox && checkbox.type === "checkbox") {
							checkbox.checked = this._checkAllValue;
							var docIndex = this.indexOfItem(this.selectedDocList, selectedDoc.id);
							if (docIndex >= 0 && !this._checkAllValue) {
								this.selectedDocList.splice(docIndex, 1);
							} else if (docIndex === -1 && this._checkAllValue) {
								this.selectedDocList.push(selectedDoc);
							}
							if (doneSelectedDocsUpdate)
								// need to call again to re-update selected doc list
								this.parentWidget.selectDocs();
								
						}
					}));
				}
			}
			this.parentWidget.selectDocs();
			doneSelectedDocsUpdate = true;
			this.logExit("_onClickCheckAll");
		},

		_getCheckBoxUIElement: function (id, rowIndex, callBack) {
			var selectedDoc;
			var checkBox = document.getElementById(id);
			if (!checkBox) {
				var grid = this.ecmContentList.grid;
				selectedDoc = this.ecmContentList._resultSet.items[rowIndex];
				grid.vScroller.scrollToRow (rowIndex, false).then(lang.hitch(this, function() {
					checkBox = document.getElementById(id);
					callBack(checkBox, selectedDoc);
				}));
			}
			else {
				selectedDoc = this.ecmContentList._resultSet.items[rowIndex];
				callBack(checkBox, selectedDoc);
			}
		},
		
		_getUniqueCheckBoxId: function () {
   
			return "split_checkbox_all" + this.id;
		},
		
		_getContentListModules : function() {
  
			this.logEntry("_getContentListModules");
			var array = [];
			array.push({
				moduleClass : icmToolbar,
				dojoAttachPoint : "documentViewToolbar"
			});
			array.push({
				moduleClass : icmContextMenu,
				dojoAttachPoint : "documentContextMenu"
			});
			array.push({
				moduleClass : icmContextMenu,
				dojoAttachPoint : "folderContextMenu"
			});

			array.push({
				moduleClass : Breadcrumb,
				rootLabel : this.resourceBundle.caseDocumentNavigationHome
			});
			// array.push(Breadcrumb);
			if (!this.bSplitCaseMode) {
				if (this.widgetProperties.ViewSelection === "DetailsView") {
					array.push({
						moduleClass : viewCaseDocDetails,
						caseDoc: this,
						widgetPaneId : this.id
					});
					if (this.widgetProperties.EnableSwitch === true) {
//						array.push({
//							moduleClass : viewCaseDoc,
//							widgetPaneId : this.id
//						});
                        array.push({
                            moduleClass : ViewMagazine,
							caseDoc: this,
                            widgetPaneId : this.id
                        });
					}
				} else { // MagazineView
//					array.push({
//						moduleClass : viewCaseDoc,
//						widgetPaneId : this.id
//					});
                    array.push({
                        moduleClass : ViewMagazine,
						caseDoc: this,
                        widgetPaneId : this.id
                    });
					if (this.widgetProperties.EnableSwitch === true) {
						array.push({
							moduleClass : viewCaseDocDetails,
							caseDoc: this,
							widgetPaneId : this.id
						});
					}
				}

			} else {
				array.push({
					moduleClass : viewSplitCaseDocDetails,
					caseDoc: this,
					widgetPaneId : this.id
				});
				array.push({
					moduleClass : viewSplitCaseDocMagazine,
					caseDoc: this,
					widgetPaneId : this.id
				});
			}
			this.logExit("_getContentListModules");
			return array;
		},
		
		bExternalDocSupport: function () {
			var splitCase = this.model.caseEditable;
			return splitCase.caseType.externalDocumentsAllowed;
		},

		_getContentListGridModules : function() {
   
			this.logEntry("_getContentListGridModules");
			var array = [];
			array.push(DndRowMoveCopy);
			array.push({
				moduleClass : DndCaseAddDoc,
				filterDocTypesOn : this._docTypesFilterOn(),
				solution : this.getContext().getSolution()
			});
			this.logExit("_getContentListGridModules");
			return array;
		},

		_docTypesFilterOn : function() {
			this.logEntry("_docTypesFilterOn");
			if (!lang.isFunction(this.parentWidget.getWidgetAttributes)) {
				return false;
			}
			var widgetAttrs = this.parentWidget.getWidgetAttributes();
			var currSolution = this.parentWidget.getSolution();
			if (currSolution.integrationType === "CM8")
				return widgetAttrs.getItemValue("filterDocumentTypesCM8");
			else
				return widgetAttrs.getItemValue("filterDocumentTypes");

			this.logExit("_docTypesFilterOn");
		},

		/**
		 * Called to provide a callback function if the action is a "select
		 * document" action.
		 * 
		 * @param actionId
		 *            ID of the action to indicate which action is asking for
		 *            the callback.
		 * @return {callback} returns the callback function.
		 */
		getCallback : function(actionId) {
			if (actionId === "SelectDocumentAttachment") {
				var myCallback = lang.hitch(this, this.fileDoc);
				return myCallback;
			} else
				return null;
		},

		/**
		 * Called to file the selected document into the current folder.
		 * 
		 * @param selectedDoc
		 *            object representing the selected document.
		 */
		fileDoc : function(selectedDoc) {
			this.logEntry("fileDoc");
			if (lang.isArray(selectedDoc[0])) {
				selectedDoc = selectedDoc[0];
			}
			var resultSet = this.ecmContentList.getResultSet();
			var parentFolder = resultSet.parentFolder;
			parentFolder.addToFolder(selectedDoc);
			this.logExit("fileDoc");
		},

		/**
		 * Called to open the sub-folder within the case and show its content.
		 * 
		 * @param subFolderPath
		 *            string representing the sub-folder path within the case
		 *            folder.
		 */
		handleSelectInitialFolder : function(subFolderPath) {
 
   
			this.logEntry("handleSelectInitialFolder");
			if (this.isInFocus() && this.caseFolder && subFolderPath != null) {
				this.caseFolder.retrieveAttributes(lang.hitch(this, function(caseFolder) {
					var rootPath = this.caseFolder.attributes.PathName;
					var fullPath = rootPath + "/" + subFolderPath;
					var repository = this.caseFolder.repository;

					var folderRetrievedCB = lang.hitch(this, function(folder) {
						this.ecmContentList.openItem(folder);
					});
					repository.retrieveItem(fullPath, folderRetrievedCB, null, null, null, null, null);
				}));
			}
			this.logExit("handleSelectInitialFolder");
		},

		/** start of private functions ** */

		_consumeCaseInfo : function(model) {
 
			this.logEntry("_consumeCaseInfo");
			var currCase = null;

			// validate payload model.
			if (model && model.caseEditable) {
	
				// todo: should refactor into a function to validate the model.
				currCase = !this.bSplitCaseMode ? model.caseEditable.getCase() : model.caseEditable.getSplitSource();
   
				this.currCaseId = currCase.id;
				currCase.retrieveCaseFolder(lang.hitch(this, '_displayDocuments'));
				this.logExit("_consumeCaseInfo");
			} else
				return;

		},

		_displayDocuments : function(caseFolder) {
  
			this.logEntry("_displayDocuments");
			var bValidModel = caseFolder.isFolder();
			if (this.isInFocus() && bValidModel) {
				this.caseFolder = caseFolder;
				var copyCaseFolder = lang.mixin({
					isRoot : true
				}, caseFolder);
				// retrieve & render docs & folders associated with this case.
				this.ecmContentList.openItem(copyCaseFolder);

				if (this.bExternalDocSupport())
					this._getCustomColumnNames();
			}
			this.logExit("_displayDocuments");
		},

		/**
		 * Called to render documents and folders to be retrieved from the given
		 * model.
		 * 
		 * @param model
		 *            payload object representing the case information.
		 */
		render : function() {
   
			this.logEntry("render");
			if (!this.isInFocus() || !this.model) {
				return;
			}
			this.inherited(arguments);
			this._consumeCaseInfo(this.model);
			this.logExit("render");

		},

		isInFocus : function() {

			if (this.bSplitCaseMode)
				return true;
			return this.inherited(arguments);
		},

		destroy : function() {
			this.logEntry("destroy");
			delete this.parentWidget;
			delete this.caseFolder;
			
			for ( var i = 0; i < this.contentList._contentListModules.length; i++) {
				delete this.contentList._contentListModules[i];
				this.contentList._contentListModules[i] = null;
			}
			this.contentList._contentListModules = [];
			
			if (this._ecmContentListHandlers && this._ecmContentListHandlers.length > 0) {
				array.forEach(this._ecmContentListHandlers, function(handler) {
					handler.remove();
				});
			}
			delete this._ecmContentListHandlers;
			
			// clean selected items context
			this.cleanActionContext("Folder");
			this.cleanActionContext("Document");
			this.cleanActionContext("ProxyDocument");

			this.cleanActionContext("ResultSet");
			this.cleanActionContext("CurrentFolder");

			this.inherited(arguments);
			this.logExit("destroy");
		},
	   
		_onRender: function(){
			if (this.widgetProperties.selectFirstDocument) {
				var count = this.ecmContentList.getResultSet().items.length;
				for(var i=0; i<count; i++){
					var contentItem = this.ecmContentList.getResultSet().items[i];
					if(!contentItem.isFolder()){
						if(this.widgetProperties.selectFirstDocument && this.ecmContentList.grid.select.row.getSelected().length === 0) 
						{ 
							this.ecmContentList.grid.select.row.selectByIndex(i);
							this._onSelectItem(this.contentList.getSelectedItems());
							break;
						}
						else if(this.widgetProperties.selectFirstDocument && this.ecmContentList.grid.select.row.getSelected().length === 1)
						{
							
							var docItem = this.contentList.getSelectedItems()[0];;
							this.ecmContentList.grid.select.row.selectById(docItem.id);
							this._onSelectItem(this.contentList.getSelectedItems());							
							break;
						}
					} 
				}
				this.onRender();
			}
			
			// resolve the proxy box folder every time caseinfo widget loads only if box collab is enabled
			var currentCase = this.getActionContext("Case")[0].getCase();
			if(currentCase){//for creating split case there is no case context selected
				var boxFolderCreated = currentCase.getBoxCollaborationCreatedFlag();
				if (currentCase && currentCase.caseType.boxCollaborationAllowed && boxFolderCreated) {
					var currentList = this.ecmContentList.getResultSet();
					var items = this.ecmContentList.getResultSet().getItems();
					for (var i in items) {
						var contentItem = items[i];
						if (contentItem.isFolder() && contentItem.repository.type === "p8" && contentItem.template && contentItem.template === "CmAcmCaseBoxCollaborationFolder") {
							Util.getExternalFolder(contentItem, currentCase, lang.hitch(this, function(boxFolder) {
								var folderIndex = currentList.getIndexOfItem(contentItem);
								currentList.setItem(folderIndex, boxFolder);
								currentList.onChange(currentList);
								this.ecmContentList.grid.select.row.selectByIndex(folderIndex);
							}));
							break;
						} else if (contentItem.isFolder() && contentItem.repository.type === "box") {
							// if box folder found, stop looping
							break;
						}
					}
				}
			}
		},
		
		_onOpenItem : function() {

			this.logEntry("_onOpenItem");
			if (sniff("ios")) {
            	this.connect_onClickCheckAll = false;
            	this.isChecked = false;
			}
			// Retrieve all rows
			var grid = this.ecmContentList.grid;
			grid.body.renderRows(0, this.ecmContentList._resultSet.items.length, 0, 1);
			grid.body.onForcedScroll();
			this.resize();
			this.logExit("_onOpenItem");
		},
		
		updateMimeTypes: function(){
			
		},
		
		/**
		 * Event fired when a document or folder is selected
		 */
		onSelectItem: function(){
 
			this.logEntry("onSelectItem");
		},
		
		/**
		 * Event fired when grid finish loading.
		 */
		onRender: function(){
			this.logEntry("onRender");
		},
		
		_eoc_ : null
	});
});
